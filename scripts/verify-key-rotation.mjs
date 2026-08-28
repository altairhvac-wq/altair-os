/**
 * Integration secret encryption survives a key rotation.
 *
 * ===================== THE DEFECT THIS ENCODES =====================
 * Every stored ciphertext carried a version token ("v1:iv:ct:tag"), but the
 * decrypt path compared it to a hardcoded constant and there was exactly one
 * key. So rotating INTEGRATIONS_ENCRYPTION_KEY would have made every stored
 * OAuth access token, refresh token and network invite token permanently
 * unreadable — with no rollback, and no symptom until a customer's integration
 * next needed its token.
 *
 * "We have never rotated it" is not a defence. The reason to hold a key is to
 * be able to replace it.
 *
 * ===================== WHAT THIS PROVES =====================
 * Real AES-256-GCM against real keys, with the environment manipulated the way
 * a rotation manipulates it:
 *
 *   - a secret written under the old key reads back after the new key is
 *     installed, while the old one is still in the PREVIOUS slot
 *   - new writes use the new key, and say so in their version token
 *   - re-encrypting moves a payload forward and is a no-op once current, which
 *     is what makes the rotation script resumable
 *   - removing the previous key while old ciphertext remains fails LOUDLY, and
 *     the message says what to do
 *   - putting the old key back recovers everything: the rollback works
 *   - a tampered ciphertext fails authentication rather than returning garbage
 *   - two keys cannot share a version
 *
 * Offline. No database, no network. Keys are generated in-process and never
 * printed.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-key-rotation.mjs
 */

import { randomBytes } from "node:crypto";

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

const KEY_A = randomBytes(32).toString("base64");
const KEY_B = randomBytes(32).toString("base64");
const SECRET = "ya29.a0AfB_not-a-real-token-0123456789";

/**
 * The modules read process.env at call time, so the environment can be moved
 * between states without reloading them — which is exactly how a deploy moves
 * it, and means this tests the real code path rather than a re-import.
 */
function setEnv({ key, version, previousKey, previousVersion }) {
  process.env.INTEGRATIONS_ENCRYPTION_KEY = key;
  process.env.INTEGRATIONS_ENCRYPTION_KEY_VERSION = String(version);
  if (previousKey) {
    process.env.INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS = previousKey;
    process.env.INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS_VERSION =
      String(previousVersion);
  } else {
    delete process.env.INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS;
    delete process.env.INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS_VERSION;
  }
}

function threw(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}

setEnv({ key: KEY_A, version: 1 });

const {
  encryptIntegrationSecret,
  decryptIntegrationSecret,
  reencryptIntegrationSecret,
  readIntegrationSecretKeyVersion,
} = await import("@/lib/integrations/crypto");
const { getIntegrationsDecryptionKeys } = await import(
  "@/lib/integrations/env"
);

console.log("\nBefore the rotation");

const underA = encryptIntegrationSecret(SECRET);
check(
  "a secret round-trips under the only configured key",
  decryptIntegrationSecret(underA) === SECRET,
);
check(
  "the payload names key version 1",
  readIntegrationSecretKeyVersion(underA) === 1,
  `got ${readIntegrationSecretKeyVersion(underA)}`,
);
check(
  "the ciphertext is not the plaintext",
  !underA.includes(SECRET) && !underA.includes(SECRET.slice(0, 12)),
);

const tampered = (() => {
  const parts = underA.split(":");
  const raw = Buffer.from(parts[2], "base64");
  raw[0] ^= 0xff;
  parts[2] = raw.toString("base64");
  return parts.join(":");
})();
check(
  "a tampered ciphertext fails authentication rather than returning garbage",
  threw(() => decryptIntegrationSecret(tampered)) != null,
);

console.log("\nMid-rotation: new key current, old key previous");

setEnv({ key: KEY_B, version: 2, previousKey: KEY_A, previousVersion: 1 });

check(
  "both keys are offered for decryption, newest first",
  getIntegrationsDecryptionKeys().map((entry) => entry.version).join(",") ===
    "2,1",
);
check(
  "a secret written under the old key still reads",
  decryptIntegrationSecret(underA) === SECRET,
);

const underB = encryptIntegrationSecret(SECRET);
check(
  "a new write uses the new key version",
  readIntegrationSecretKeyVersion(underB) === 2,
  `got ${readIntegrationSecretKeyVersion(underB)}`,
);
check(
  "the two ciphertexts differ",
  underA !== underB,
);
check(
  "both read back to the same secret",
  decryptIntegrationSecret(underA) === SECRET &&
    decryptIntegrationSecret(underB) === SECRET,
);

const moved = reencryptIntegrationSecret(underA);
check(
  "re-encrypting an old payload produces a current one",
  moved != null && readIntegrationSecretKeyVersion(moved) === 2,
  `got ${moved == null ? "null" : readIntegrationSecretKeyVersion(moved)}`,
);
check(
  "the re-encrypted payload still decrypts to the same secret",
  moved != null && decryptIntegrationSecret(moved) === SECRET,
);
check(
  "re-encrypting an already-current payload is a no-op, so the pass is resumable",
  reencryptIntegrationSecret(underB) === null,
);

console.log("\nAfter the rotation: previous key removed");

setEnv({ key: KEY_B, version: 2 });

check(
  "already-moved secrets keep reading",
  decryptIntegrationSecret(moved) === SECRET &&
    decryptIntegrationSecret(underB) === SECRET,
);

const orphaned = threw(() => decryptIntegrationSecret(underA));
check(
  "a payload left on the old version fails LOUDLY once the old key is gone",
  orphaned != null,
  "silently returning empty or garbage here is how a rotation becomes an " +
    "outage nobody can trace",
);
check(
  "the failure names the version and says what to do",
  orphaned != null &&
    /version 1/.test(orphaned.message) &&
    /INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS/.test(orphaned.message),
  orphaned ? orphaned.message : "",
);

console.log("\nRollback");

setEnv({ key: KEY_A, version: 1, previousKey: KEY_B, previousVersion: 2 });
check(
  "putting the old key back recovers both generations",
  decryptIntegrationSecret(underA) === SECRET &&
    decryptIntegrationSecret(underB) === SECRET,
);

console.log("\nMisconfiguration");

setEnv({ key: KEY_B, version: 2, previousKey: KEY_A, previousVersion: 2 });
check(
  "two keys sharing a version is rejected",
  threw(() => getIntegrationsDecryptionKeys()) != null,
  "a ciphertext would name both keys and the wrong one could be tried first",
);

setEnv({ key: KEY_B, version: 2, previousKey: "not-base64-32-bytes", previousVersion: 1 });
check(
  "a malformed previous key is rejected rather than ignored",
  threw(() => getIntegrationsDecryptionKeys()) != null,
  "silently ignoring it would look identical to a completed rotation",
);

setEnv({ key: KEY_B, version: 2 });
check(
  "no previous key configured is a normal state, not an error",
  threw(() => getIntegrationsDecryptionKeys()) == null &&
    getIntegrationsDecryptionKeys().length === 1,
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} key rotation checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
