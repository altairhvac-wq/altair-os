/**
 * Re-encrypt stored integration secrets under the current encryption key.
 *
 * ===================== WHAT THIS IS FOR =====================
 * Three columns hold AES-256-GCM ciphertext keyed by the integrations
 * encryption key:
 *
 *   marketing_connected_account_secrets.access_token_encrypted
 *   marketing_connected_account_secrets.refresh_token_encrypted
 *   network_invites.invite_token_encrypted
 *
 * Each payload names the key version it was written with. Rotating the key
 * means running with the outgoing key in INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS
 * and the incoming one in INTEGRATIONS_ENCRYPTION_KEY, so every row can still
 * be read while it is moved forward one row at a time.
 *
 * ===================== THE ORDER OF OPERATIONS =====================
 *   1. Generate the new key:   openssl rand -base64 32
 *   2. Set, together, in the target environment:
 *        INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS         = the OLD key
 *        INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS_VERSION = the old version (1)
 *        INTEGRATIONS_ENCRYPTION_KEY                  = the NEW key
 *        INTEGRATIONS_ENCRYPTION_KEY_VERSION          = the new version (2)
 *      Deploy. Both keys read; new writes use the new one.
 *   3. node scripts/rotate-integration-secrets.mjs --confirm <ref> --dry-run
 *   4. node scripts/rotate-integration-secrets.mjs --confirm <ref> --apply
 *      Re-runnable: rows already on the current version are skipped without a
 *      write, so an interrupted pass resumes by being run again.
 *   5. node scripts/rotate-integration-secrets.mjs --confirm <ref> --dry-run
 *      Confirm zero rows remain on the old version.
 *   6. ONLY THEN remove INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS.
 *
 * ROLLBACK, at any point before step 6: swap the two keys back. Rows already
 * moved forward are readable because the new key becomes the previous one.
 * That is the whole reason the outgoing key must not be removed early.
 *
 * ===================== WHAT IT NEVER DOES =====================
 * It never prints a plaintext, a ciphertext, a key, or a token hash. Progress is
 * counts and row ids. A failure names the row and the key version and stops.
 *
 * It also never widens a row: each update writes only the columns it re-encrypted,
 * matched on the row's own primary key, and only when the decrypt-then-encrypt
 * round trip succeeded.
 *
 * ===================== SAFETY =====================
 *   - --confirm <project-ref> must match the target, so the project cannot be
 *     wrong by accident.
 *   - --dry-run is the default. --apply is required to write anything.
 *   - Refuses to run at all unless a previous key is configured: without one,
 *     everything already decrypts under the current key and there is nothing to
 *     rotate, so a run would mean the operator has misconfigured the sequence.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/rotate-integration-secrets.mjs --confirm <ref> [--apply]
 */

import { createClient } from "@supabase/supabase-js";

import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  readIntegrationSecretKeyVersion,
} from "@/lib/integrations/crypto";
import {
  getIntegrationsEncryptionKey,
  getPreviousIntegrationsEncryptionKey,
} from "@/lib/integrations/env";

const URL_ENV = "SUPABASE_ROTATION_URL";
const KEY_ENV = "SUPABASE_ROTATION_SERVICE_ROLE_KEY";
const BATCH = 200;

const TARGETS = [
  {
    table: "marketing_connected_account_secrets",
    idColumn: "connected_account_id",
    columns: ["access_token_encrypted", "refresh_token_encrypted"],
    /** Written alongside so the row records which key it is on. */
    versionColumn: "encryption_key_version",
  },
  {
    table: "network_invites",
    idColumn: "id",
    columns: ["invite_token_encrypted"],
    versionColumn: null,
  },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else args[key] = true;
  }
  return args;
}

function fail(message) {
  console.error(`\nREFUSED: ${message}\n`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const serviceKey = process.env[KEY_ENV]?.trim();
const apply = args.apply === true;

if (!url || !serviceKey) {
  fail(
    `${URL_ENV} and ${KEY_ENV} must be set.\n\n` +
      "Deliberately separate variable names: this must be pointed at a target " +
      "on purpose, not inherit whatever the shell already had.",
  );
}

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
if (args.confirm !== ref) {
  fail(`--confirm must match the target project ref "${ref}".`);
}

let current;
let previous;
try {
  current = getIntegrationsEncryptionKey();
  previous = getPreviousIntegrationsEncryptionKey();
} catch (error) {
  fail(error.message);
}

if (!previous) {
  fail(
    "No INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS is configured.\n\n" +
      "Every payload would already be readable under the current key, so there " +
      "is nothing to move. If a rotation is in progress, the outgoing key " +
      "belongs in INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS — see the header.",
  );
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function processTarget(target) {
  const stats = {
    table: target.table,
    scanned: 0,
    alreadyCurrent: 0,
    reencrypted: 0,
    empty: 0,
    failed: [],
  };

  const selectColumns = [target.idColumn, ...target.columns].join(", ");

  for (let from = 0; ; from += BATCH) {
    const { data, error } = await admin
      .from(target.table)
      .select(selectColumns)
      .order(target.idColumn, { ascending: true })
      .range(from, from + BATCH - 1);

    if (error) {
      throw new Error(`${target.table}: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      stats.scanned += 1;
      const update = {};

      for (const column of target.columns) {
        const payload = row[column];
        if (!payload) {
          stats.empty += 1;
          continue;
        }

        const version = readIntegrationSecretKeyVersion(payload);
        if (version === current.version) {
          stats.alreadyCurrent += 1;
          continue;
        }

        try {
          // Decrypt and re-encrypt as two explicit steps so a failure is
          // attributable: a decrypt failure means the outgoing key is wrong,
          // an encrypt failure means the incoming one is.
          const plain = decryptIntegrationSecret(payload);
          update[column] = encryptIntegrationSecret(plain);
        } catch (rotationError) {
          stats.failed.push({
            id: row[target.idColumn],
            column,
            version,
            reason: rotationError.message,
          });
        }
      }

      if (Object.keys(update).length === 0) continue;

      if (target.versionColumn) {
        update[target.versionColumn] = current.version;
      }

      if (apply) {
        const { error: updateError } = await admin
          .from(target.table)
          .update(update)
          .eq(target.idColumn, row[target.idColumn]);
        if (updateError) {
          stats.failed.push({
            id: row[target.idColumn],
            column: "(update)",
            version: null,
            reason: updateError.message,
          });
          continue;
        }
      }

      stats.reencrypted += Object.keys(update).filter((key) =>
        target.columns.includes(key),
      ).length;
    }

    if (rows.length < BATCH) break;
  }

  return stats;
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Current key version:  ${current.version}`);
  console.log(`Previous key version: ${previous.version}`);
  console.log(apply ? "Mode: APPLY (writes)\n" : "Mode: DRY RUN (no writes)\n");

  let anyFailure = false;
  let outstanding = 0;

  for (const target of TARGETS) {
    const stats = await processTarget(target);
    console.log(`  ${stats.table}`);
    console.log(`    rows scanned        ${stats.scanned}`);
    console.log(`    already current     ${stats.alreadyCurrent}`);
    console.log(`    null / empty        ${stats.empty}`);
    console.log(
      `    ${apply ? "re-encrypted       " : "would re-encrypt   "} ${stats.reencrypted}`,
    );
    if (!apply) outstanding += stats.reencrypted;

    if (stats.failed.length > 0) {
      anyFailure = true;
      console.error(`    FAILED              ${stats.failed.length}`);
      for (const failure of stats.failed.slice(0, 10)) {
        console.error(
          `      ${failure.id} ${failure.column} (v${failure.version}): ${failure.reason}`,
        );
      }
      if (stats.failed.length > 10) {
        console.error(`      ...and ${stats.failed.length - 10} more`);
      }
    }
    console.log("");
  }

  if (anyFailure) {
    console.error(
      "Some rows could not be re-encrypted. Nothing about them was written.\n" +
        "A decrypt failure means INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS is not the\n" +
        "key those rows were written with. Do NOT remove the previous key.\n",
    );
    process.exit(1);
  }

  if (!apply) {
    console.log(
      outstanding === 0
        ? "Nothing outstanding: every secret is on the current key version.\n" +
            "INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS can now be removed.\n"
        : `${outstanding} secret(s) still on an older key version. Re-run with --apply.\n`,
    );
  } else {
    console.log(
      "Re-encryption pass complete. Run again with --dry-run to confirm zero\n" +
        "outstanding before removing INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS.\n",
    );
  }
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
