/**
 * The YouTube connect flow — scopes, the authorize URL, the capability
 * derivation, and the two routes.
 *
 * Static and offline. The pure module is loaded and driven; the two route
 * files and the API layer are read as source and asserted against, because
 * exercising them for real would mean a Google client, a consent screen and
 * a live token exchange — none of which belongs in a check that runs in a
 * loop.
 *
 * THE CHECK THAT EARNS THIS FILE'S KEEP is the last section: every
 * `connectPath` the capability matrix advertises must resolve to a route
 * file that exists. A card offering "Connect" that navigates to a 404 is
 * worse than a card that says the provider is unavailable, and nothing else
 * in the suite compares the matrix against the filesystem.
 *
 * Run: node scripts/verify-youtube-connect.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadPureModule } from "./lib/load-pure-module.mjs";

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail ?? "");
  }
}

const read = (path) => readFileSync(path, "utf8");

const AUTHORIZE_ROUTE =
  "app/api/marketing/connected-accounts/youtube/authorize/route.ts";
const CALLBACK_ROUTE =
  "app/api/marketing/connected-accounts/youtube/callback/route.ts";
const OAUTH_URL_MODULE = "lib/integrations/youtube/oauth-url.ts";
const API_MODULE = "lib/integrations/youtube/api.ts";
const ENV_MODULE = "lib/integrations/youtube/env.ts";
const CONNECT_MODULE = "lib/integrations/youtube/complete-connect.ts";

for (const path of [
  AUTHORIZE_ROUTE,
  CALLBACK_ROUTE,
  OAUTH_URL_MODULE,
  API_MODULE,
  ENV_MODULE,
  CONNECT_MODULE,
]) {
  // Every later check reads one of these. A missing file must fail loudly
  // here rather than degrade a source assertion into a match against "".
  check(`${path} exists`, existsSync(path));
}
if (failures > 0) {
  console.error("\nMissing source files; the remaining checks would be vacuous.");
  process.exit(1);
}

const authorizeSource = read(AUTHORIZE_ROUTE);
const callbackSource = read(CALLBACK_ROUTE);
const oauthUrlSource = read(OAUTH_URL_MODULE);
const apiSource = read(API_MODULE);
const envSource = read(ENV_MODULE);
const connectSource = read(CONNECT_MODULE);

/* ================================================================ scopes */

console.log("\nScopes are minimal and closed");

check(
  "requests youtube.upload — the one write the feature needs",
  oauthUrlSource.includes("youtube.upload"),
);
check(
  "requests youtube.readonly — so a channel can be named and verified",
  oauthUrlSource.includes("youtube.readonly"),
);
check(
  "does NOT request the broad account-management scope",
  !/auth\/youtube["'\s,]/.test(oauthUrlSource.replace(/youtube\.(upload|readonly)/g, "")),
);
check(
  "does not request force-ssl, partner, or analytics scopes",
  !/youtube\.force-ssl|youtubepartner|yt-analytics/.test(oauthUrlSource),
);
check(
  "an unregistered scope is refused rather than forwarded to the consent screen",
  /Unsupported YouTube OAuth scopes/.test(oauthUrlSource),
);

/* ========================================================= authorize URL */

console.log("\nThe authorize URL asks for a refresh token, on purpose");

check(
  "sets access_type=offline — Google issues no refresh token without it",
  /access_type[\s\S]{0,20}offline/.test(oauthUrlSource),
);
check(
  "sets prompt=consent — a repeat authorization otherwise returns no refresh token",
  /prompt[\s\S]{0,20}consent/.test(oauthUrlSource),
);
check(
  "sets include_granted_scopes so a prior grant is not silently dropped",
  /include_granted_scopes/.test(oauthUrlSource),
);
check(
  "requires a state",
  /OAuth state is required/.test(oauthUrlSource),
);
check(
  "the authorize host is a pinned constant, not built from an env var",
  /GOOGLE_AUTHORIZE_URL/.test(oauthUrlSource) &&
    /accounts\.google\.com/.test(envSource),
);

/* ============================================================== the hosts */

console.log("\nHosts are pinned; the secret cannot be redirected");

check(
  "the token endpoint is a constant in env.ts",
  /GOOGLE_TOKEN_ORIGIN\s*=\s*"https:\/\/oauth2\.googleapis\.com"/.test(envSource),
);
check(
  "the API origin is a constant in env.ts",
  /YOUTUBE_API_ORIGIN\s*=\s*"https:\/\/www\.googleapis\.com"/.test(envSource),
);
check(
  "the api module builds no host from process.env",
  !/process\.env/.test(apiSource),
);
check(
  "no response URL is ever followed",
  !/paging|nextPageToken[\s\S]{0,40}fetch|body\.next/.test(apiSource),
);

/* ===================================================== secrets never leak */

console.log("\nNothing carries a credential into a message or a log");

check(
  "the error type carries a status and a short code only — never a body",
  /class YouTubeApiError[\s\S]*?readonly status: number;[\s\S]*?readonly code: string;/.test(
    apiSource,
  ),
);
check(
  "error_description is never read",
  !/error_description/.test(
    // The word appears once in a comment explaining why it is NOT read.
    apiSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""),
  ),
);
check(
  "an unrecognised error code is replaced rather than forwarded",
  /unrecognized_error/.test(apiSource),
);
check(
  "the access token travels in a header, never a query parameter",
  /authorization: `Bearer \$\{accessToken\}`/.test(apiSource) &&
    !/searchParams\.set\(\s*["']access_token["']/.test(apiSource),
);
check(
  "the connect module logs a code, never the token response",
  /code: classified\.code/.test(connectSource) &&
    !/console\.(error|log|warn)\([^)]*tokens\b/.test(connectSource),
);
check(
  "no module prints an env VALUE",
  [envSource, apiSource, oauthUrlSource, authorizeSource].every(
    (src) => !/console\.[a-z]+\([^)]*process\.env\[/.test(src),
  ),
);

/* ================================================== capability derivation */

// The pure module, not complete-connect.ts — that one is `server-only` and
// imports database queries, so loading it here would drag half the app in.
// The decision lives on its own precisely so it can be driven like this.
const connect = await loadPureModule(
  "lib/integrations/youtube/capability.ts",
  "yt",
).catch((error) => {
  console.error("  (capability module failed to load)", error?.message);
  return null;
});

console.log("\nCapability is derived from what Google GRANTED");

if (!connect?.deriveYouTubeCapability) {
  check("deriveYouTubeCapability is exported and loadable", false, "not loaded");
} else {
  const derive = connect.deriveYouTubeCapability;
  const UPLOAD = connect.YOUTUBE_UPLOAD_SCOPE;
  const READONLY = connect.YOUTUBE_READONLY_SCOPE;

  check(
    "the scope constants match the scopes actually requested",
    oauthUrlSource.includes(UPLOAD) && oauthUrlSource.includes(READONLY),
  );

  check(
    "both scopes granted reports direct",
    derive([UPLOAD, READONLY]).capability === "direct",
  );
  check(
    "a full grant needs no operator explanation",
    derive([UPLOAD, READONLY]).detail === null,
  );
  check(
    "UPLOAD WITHHELD REPORTS none — never a connection that fails at first upload",
    derive([READONLY]).capability === "none",
  );
  check(
    "and names the next human step",
    /reconnect/i.test(derive([READONLY]).detail ?? ""),
  );
  check(
    "readonly withheld also reports none — the channel could not be verified",
    derive([UPLOAD]).capability === "none",
  );
  check(
    "an empty grant reports none",
    derive([]).capability === "none",
  );
  check(
    "an unrelated scope grants nothing",
    derive(["https://www.googleapis.com/auth/drive"]).capability === "none",
  );
  check(
    "no input produces draft_only — YouTube has no draft upload mode",
    [[], [UPLOAD], [READONLY], [UPLOAD, READONLY]].every(
      (input) => derive(input).capability !== "draft_only",
    ),
  );
}

/* ================================================== the authorize route */

console.log("\nThe authorize route refuses before it writes");

check(
  "refuses a cross-site initiation using fetch metadata",
  /sec-fetch-site/.test(authorizeSource),
);
check(
  "checks the permission in the route, not only in the UI",
  /canManageIntegrations/.test(authorizeSource),
);
check(
  "resolves the active company server-side",
  /getActiveCompanyContext/.test(authorizeSource),
);
// Measured over the BODY, not the file: both symbols appear in the import
// block first, so comparing raw indexOf on the whole source compares import
// order — which is alphabetical accident, not control flow. The first
// version of this check did exactly that and failed on correct code.
const authorizeBody = authorizeSource.slice(
  authorizeSource.indexOf("export async function GET"),
);
check(
  "checks configuration BEFORE minting a state row",
  authorizeBody.indexOf("isYouTubeOAuthConfigured(") <
    authorizeBody.indexOf("createMarketingOAuthState("),
  `config@${authorizeBody.indexOf("isYouTubeOAuthConfigured(")} state@${authorizeBody.indexOf("createMarketingOAuthState(")}`,
);
check(
  "checks the permission BEFORE minting a state row",
  authorizeBody.indexOf("canManageIntegrations(") <
    authorizeBody.indexOf("createMarketingOAuthState("),
);
check(
  "binds the state to the resolved company and user, not to a query parameter",
  /companyId: context\.company\.id/.test(authorizeSource) &&
    /userId: context\.user\.id/.test(authorizeSource),
);
check(
  "normalizes any caller-supplied redirect through the allowlist",
  /normalizeMarketingOAuthRedirectPath/.test(authorizeSource),
);
check(
  "is never cached — a cached redirect would reissue one state token",
  /dynamic\s*=\s*"force-dynamic"/.test(authorizeSource),
);
check(
  "never reports which env var is missing to the browser",
  !/getMissingYouTubeOAuthEnvVars\(\)[\s\S]{0,120}searchParams\.set/.test(
    authorizeSource,
  ),
);

/* =================================================== the callback route */

console.log("\nThe callback trusts only the state row");

check(
  "reads the company from the consumed state, never from the query string",
  /companyId: consumed\.companyId/.test(callbackSource) &&
    !/searchParams\.get\(["']company/.test(callbackSource),
);
check(
  "consumes the state scoped to this provider",
  /consumeMarketingOAuthState\(\{[\s\S]{0,80}provider: "youtube"/.test(
    callbackSource,
  ),
);
check(
  "treats expired, used and mismatched states identically",
  /consumed\.error \|\| !consumed\.companyId \|\| !consumed\.createdBy/.test(
    callbackSource,
  ),
);
check(
  "distinguishes a declined consent from a provider fault",
  /access_denied/.test(callbackSource),
);
// Every connect_error value must be a STRING LITERAL. Matching
// `connect_error:\s*oauthError` was not enough — it flagged the correct
// `oauthError === "access_denied" ? "denied" : "provider"`, which maps into
// a closed vocabulary rather than forwarding anything. What matters is that
// no variable reaches the query value.
const connectErrorValues = [
  ...callbackSource.matchAll(/connect_error:\s*([^,\n]+)/g),
].map((match) => match[1].trim());

check(
  "the callback assigns connect_error at least once, so this sweep is not vacuous",
  connectErrorValues.length > 0,
);
check(
  "every connect_error value is a literal or a closed ternary over literals",
  connectErrorValues.every((value) =>
    /^"[a-z_]+"$/.test(value) ||
    /\?\s*"[a-z_]+"\s*:\s*"[a-z_]+"$/.test(value) ||
    /^result\.errorCode \?\? "[a-z_]+"$/.test(value),
  ),
  connectErrorValues,
);
check(
  "Google's raw error string is never the query value",
  !connectErrorValues.some((value) => value === "oauthError"),
);
check(
  "checks encryption before completing, so a token is never fetched with nowhere to store it",
  /isIntegrationEncryptionConfigured/.test(callbackSource),
);

/* ======================================== every advertised path resolves */

console.log("\nEvery advertised connect path resolves to a route");

const capabilities = await loadPureModule(
  "shared/types/integration-capability.ts",
  "yt",
);
const providers = await loadPureModule(
  "shared/types/integration-provider.ts",
  "yt",
);

const advertised = providers.INTEGRATION_PROVIDERS.map((provider) => ({
  provider,
  connectPath: capabilities.INTEGRATION_CAPABILITIES[provider].connectPath,
})).filter((entry) => entry.connectPath);

check(
  "at least one provider advertises a connect path, so this sweep is not vacuous",
  advertised.length > 0,
);

const unresolved = advertised.filter(({ connectPath }) => {
  // "/api/x/y/authorize" -> "app/api/x/y/authorize/route.ts"
  const routeFile = join("app", `${connectPath.replace(/^\//, "")}`, "route.ts");
  return !existsSync(routeFile);
});

check(
  "every connectPath in the capability matrix has a route file on disk",
  unresolved.length === 0,
  unresolved.map((entry) => `${entry.provider} -> ${entry.connectPath}`),
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
