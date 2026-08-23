/**
 * Executable tests for the Meta connect scopes.
 *
 * ===================== WHY THIS EXISTS =====================
 * Three live runs were spent learning that reading a number is a different
 * grant from publishing one. Meta said so itself, twice and by name:
 *
 *   Facebook  (#200) read_insights permission missing
 *   Instagram (#10)  Application does not have permission for this action
 *
 * Both are one-line fixes and both are invisible until someone reconnects, so
 * the failure mode is a scope silently dropped in a refactor and another week
 * of empty collections that look like "no data yet". These tests pin the two
 * insight scopes AND the publishing scopes together, because removing a
 * publishing scope to "clean up" would break posting with no test to catch it.
 *
 * Run: node scripts/verify-marketing-oauth-scopes.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail === undefined ? "" : detail);
  }
}

const dir = mkdtempSync(join(tmpdir(), "oauth-scopes-"));
writeFileSync(join(dir, "server-only.mjs"), "export {};\n");
writeFileSync(
  join(dir, "env.mjs"),
  `export function getFacebookOAuthConfig(){ return {
    appId: "APP-ID", appSecret: "NEVER-LOGGED", graphApiVersion: "v22.0",
    redirectUri: "https://example.test/api/integrations/facebook/callback",
  }; }\n`,
);
{
  const { outputText } = ts.transpileModule(
    readFileSync("lib/integrations/facebook/oauth-url.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  );
  let code = outputText;
  for (const [from, to] of [['"server-only"', '"./server-only.mjs"'], ['"./env"', '"./env.mjs"']]) {
    code = code.split(from).join(to);
  }
  writeFileSync(join(dir, "oauth.mjs"), code);
}
const O = await import(pathToFileURL(join(dir, "oauth.mjs")).href);
const scopes = [...O.FACEBOOK_CONNECT_SCOPES];

/* ------------------------------------------------- the two insight grants */

check(
  "read_insights is requested — Meta named it in (#200) on real Reel objects",
  scopes.includes("read_insights"),
  scopes,
);
check(
  "instagram_manage_insights is requested — the grant behind (#10) on real media ids",
  scopes.includes("instagram_manage_insights"),
  scopes,
);
check(
  "reading insights is NOT assumed to come with pages_read_engagement",
  scopes.includes("pages_read_engagement") && scopes.includes("read_insights"),
  "both are needed: one reads a Page's content, the other its numbers",
);

/* ---------------------------------- publishing must not regress in passing */

for (const required of [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
]) {
  check(`the publishing scope ${required} is still requested`, scopes.includes(required));
}

check("no scope is requested twice", new Set(scopes).size === scopes.length, scopes);

/* --------------------------------------------- what the dialog actually gets */

const url = O.buildFacebookOAuthAuthorizationUrl({ state: "abc123" });
const parsed = new URL(url);
const sent = (parsed.searchParams.get("scope") ?? "").split(",").filter(Boolean);

check(
  "the authorization URL sends every scope in the list",
  scopes.every((s) => sent.includes(s)),
  { sent, missing: scopes.filter((s) => !sent.includes(s)) },
);
check("the authorization URL sends both insight scopes", sent.includes("read_insights") && sent.includes("instagram_manage_insights"));
check("the dialog is Meta's, on the pinned API version", /facebook\.com\/v22\.0\/dialog\/oauth/.test(url), url);
check(
  "the app SECRET never appears in an authorization URL",
  !url.includes("NEVER-LOGGED"),
  "an authorization URL is handed to a browser and lands in history",
);

/* ------------------------------------ the allow-list accepts the new scopes */

const custom = O.buildFacebookOAuthAuthorizationUrl({
  state: "abc123",
  scopes: ["read_insights", "instagram_manage_insights"],
});
check(
  "an explicit request for the two insight scopes is accepted by the allow-list",
  new URL(custom).searchParams.get("scope")?.includes("read_insights"),
  new URL(custom).searchParams.get("scope"),
);

let rejected = false;
try {
  O.buildFacebookOAuthAuthorizationUrl({ state: "abc123", scopes: ["ads_management"] });
} catch {
  rejected = true;
}
check(
  "a scope outside the catalogue is still refused rather than silently requested",
  rejected,
  "the allow-list is what stops a typo becoming an Invalid Scopes dialog in front of the founder",
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} oauth scope checks passed.`,
);
if (failures > 0) process.exit(1);
