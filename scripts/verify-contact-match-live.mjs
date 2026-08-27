/**
 * The duplicate-customer lookup, differentially tested (P2 follow-up).
 *
 * ===================== WHY THIS ONE GETS ITS OWN TEST =====================
 * findCustomerByContact decides whether converting a lead LINKS to the customer
 * who is already there or CREATES a second record for them. It used to read
 * every customer in the company and run phonesMatch over the array, which
 * PostgREST truncated at 1,000 rows — so on a large tenant it reported "no
 * match" for long-standing customers and duplicated them, silently.
 *
 * Migration 163 replaced that with an indexed equality lookup on a stored
 * generated column. That is only safe if the column reproduces phonesMatch
 * EXACTLY, and phonesMatch is not string equality:
 *
 *     digits(a) = digits(b)
 *     OR (both have >= 10 digits AND their last 10 match)
 *
 * A generated column that got the boundary wrong would fail in the direction
 * nobody notices: fewer matches, more duplicates, no error. So this imports the
 * REAL phonesMatch and asserts agreement over every pair of a fixture built from
 * the formats people actually type — parentheses, dots, spaces, a country code,
 * a leading 1, an extension, and the 9/10/11-digit boundary itself.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-contact-match-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { phonesMatch } from "@/shared/lib/phone";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const SLUG_PREFIX = "loadtest-contactmatch-";
const RUN_ID = Math.random().toString(36).slice(2, 10);

/**
 * The formats a person actually types, plus the boundaries the rule turns on.
 * Several of these are deliberately the SAME number written differently, and
 * several are deliberately near-misses.
 */
const PHONES = [
  "5205551000",
  "(520) 555-1000",
  "520.555.1000",
  "520 555 1000",
  "+1 520 555 1000",
  "1-520-555-1000",
  "15205551000",
  "520-555-1000 ext 4",
  "5205551001",
  "555-1000",
  "205551000",
  "9995205551000",
  "",
  "   ",
  "abc",
];

const EMAILS = [
  "match@example.invalid",
  "MATCH@example.invalid",
  "  match@example.invalid  ",
  "other@example.invalid",
  "",
];

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

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const key = t.slice(2);
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

function readEnvLocalSupabaseUrl() {
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  return line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
}

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
if (!url || !key) fail(`${URL_ENV} and ${KEY_ENV} must both be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) fail("Target is the application's own project. Use scratch.");
if (args.confirm !== ref) fail(`--confirm must match the target project ref "${ref}".`);

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let company = null;

/** The key the application computes for a value it is searching FOR. */
function buildPhoneMatchKey(phone) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

async function buildFixture() {
  const { data: co, error } = await admin
    .from("companies")
    .insert({
      name: `[CONTACTMATCH] ${RUN_ID}`,
      slug: `${SLUG_PREFIX}${RUN_ID}`,
      trade: "hvac",
    })
    .select("id")
    .single();
  if (error) throw new Error(`company: ${error.message}`);
  company = co;

  const rows = PHONES.map((phone, index) => ({
    company_id: company.id,
    name: `[CONTACTMATCH] ${index}`,
    phone,
    email: EMAILS[index % EMAILS.length],
  }));

  const { error: insertError } = await admin.from("customers").insert(rows);
  if (insertError) throw new Error(`customers: ${insertError.message}`);

  console.log(`  ${rows.length} customers across ${PHONES.length} phone formats`);
}

async function comparePhones() {
  const { data, error } = await admin
    .from("customers")
    .select("id, phone, phone_match_key, email, email_match_key")
    .eq("company_id", company.id);
  if (error) throw new Error(`fetch: ${error.message}`);

  const rows = data ?? [];

  console.log("\nphone_match_key reproduces phonesMatch exactly");

  let comparisons = 0;
  const disagreements = [];

  for (const probe of PHONES) {
    const key = buildPhoneMatchKey(probe);

    for (const row of rows) {
      comparisons += 1;
      const shipped = phonesMatch(row.phone, probe);
      // The database's answer: an equality lookup on the stored key. An empty
      // probe key means the application does not run the lookup at all, so the
      // database answer is "no match" by construction.
      const stored = key !== "" && row.phone_match_key === key;

      if (shipped !== stored) {
        disagreements.push(
          `"${probe}" vs "${row.phone}": phonesMatch=${shipped} key=${stored} ` +
            `(probe key "${key}", stored "${row.phone_match_key}")`,
        );
      }
    }
  }

  check(
    `${comparisons} phone comparisons agree`,
    disagreements.length === 0,
    disagreements.slice(0, 8).join("\n        "),
  );

  // The rule has a boundary at ten digits. Prove the fixture actually crosses
  // it, or the agreement above could be vacuous.
  const short = rows.filter(
    (row) =>
      row.phone.replace(/\D/g, "").length > 0 &&
      row.phone.replace(/\D/g, "").length < 10,
  );
  const long = rows.filter((row) => row.phone.replace(/\D/g, "").length > 10);
  check(
    `the fixture straddles the 10-digit boundary (${short.length} short, ${long.length} long)`,
    short.length > 0 && long.length > 0,
  );

  // And that the "same number, different formatting" case really does collapse.
  const canonical = buildPhoneMatchKey("(520) 555-1000");
  const sameNumber = rows.filter((row) => row.phone_match_key === canonical);
  check(
    `the same number in ${sameNumber.length} formats shares one key`,
    sameNumber.length >= 7,
    `expected the plain, punctuated, spaced, +1, 1-, 11-digit and extension ` +
      `forms to collapse; got ${sameNumber.length}`,
  );

  console.log("\nemail_match_key is lower(btrim(email))");
  const emailDisagreements = rows.filter(
    (row) => row.email_match_key !== row.email.trim().toLowerCase(),
  );
  check(
    `${rows.length} email keys agree`,
    emailDisagreements.length === 0,
    emailDisagreements
      .slice(0, 5)
      .map((row) => `"${row.email}" -> "${row.email_match_key}"`)
      .join("\n        "),
  );
}

async function checkIndexedLookup() {
  console.log("\nThe lookup finds what the array scan used to find");

  const probe = "520.555.1000";
  const key = buildPhoneMatchKey(probe);

  const { data, error } = await admin
    .from("customers")
    .select("id, phone")
    .eq("company_id", company.id)
    .is("deleted_at", null)
    .eq("phone_match_key", key)
    .limit(5);
  if (error) throw new Error(`lookup: ${error.message}`);

  const { data: all } = await admin
    .from("customers")
    .select("id, phone")
    .eq("company_id", company.id)
    .is("deleted_at", null);

  const expected = (all ?? [])
    .filter((row) => phonesMatch(row.phone, probe))
    .map((row) => row.id)
    .sort();
  const actual = (data ?? []).map((row) => row.id).sort();

  // The lookup caps at five, and PostgREST returns an arbitrary five with no
  // ordering — so the assertion is subset-and-count, not element-wise equality.
  // Five is already past the "more than one is a conflict" threshold the caller
  // applies, so the cap cannot change any decision it makes.
  const cap = 5;
  check(
    `"${probe}" matches ${expected.length} customers; the capped lookup ` +
      `returns ${Math.min(expected.length, cap)} of them, all correct`,
    actual.length === Math.min(expected.length, cap) &&
      actual.every((id) => expected.includes(id)),
    `phonesMatch ${JSON.stringify(expected)}\n        lookup     ${JSON.stringify(actual)}`,
  );
}

async function cleanup() {
  if (!company) return;
  await admin.from("customers").delete().eq("company_id", company.id);
  await admin.from("companies").delete().eq("id", company.id);
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}\n`);
  try {
    await buildFixture();
    await comparePhones();
    await checkIndexedLookup();
  } finally {
    console.log("\nCleaning up fixture...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} contact match checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
