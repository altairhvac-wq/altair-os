/**
 * Static verification that approved per-channel copy survives to the wire,
 * and that no layer below the founder's approval quietly rewrites it.
 *
 * ===================== THE TWO FAILURES THIS GUARDS =====================
 *
 * **1. A title the founder approved is not the title that published.**
 * `buildYouTubeUploadInitRequest` applies `.slice(0, 100)` to the title —
 * four layers below this route, after the draft was stored, shown in Today,
 * and approved by a human click. A 200-character title (which the generic
 * MAX_TITLE_CHARS admits) was therefore accepted, displayed, approved, and
 * then cut mid-word on the way to YouTube. The check below moves the limit
 * to the door and makes it a refusal, so the truncation is unreachable.
 *
 * **2. A deterministic handler inventing marketing language.**
 * With no Director-authored title, the route assembles
 * `${titleBase} — YouTube Short`. For YouTube that string IS the published
 * video's name, written by a template rather than by anything that thought
 * about the content. It stays as the fallback — an un-authored draft still
 * needs a name — but an authored title must win over it, verbatim.
 *
 * ===================== WHY STATIC =====================
 * Same reason as the sibling verifiers: the only Supabase project this
 * checkout is linked to is hosted and may be production. This reads source
 * only — no database, no network, no credential.
 *
 * Run: node scripts/verify-platform-specific-copy.mjs
 */
import { readFileSync } from "node:fs";

const ROUTE = "app/api/agent/draft-posts/route.ts";
const UPLOAD = "lib/integrations/channel-publish-requests.ts";
const BODY = "shared/lib/marketing-post-body.ts";

let failures = 0;
let checks = 0;

function check(name, condition) {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}`);
  }
}

function loadSource(path) {
  return readFileSync(path, "utf8");
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

const route = stripComments(loadSource(ROUTE));
const upload = stripComments(loadSource(UPLOAD));
const body = stripComments(loadSource(BODY));

console.log("\nroute — an approved title is the title that ships");

check(
  "accepts a per-channel title on an incoming post",
  /title\?:\s*unknown;/.test(route),
);

check(
  "declares a per-channel title limit for every allowed channel",
  /CHANNEL_TITLE_LIMITS:\s*Record<AllowedChannel,\s*number>/.test(route),
);

check(
  "holds YouTube to its real 100-character ceiling, not the generic 200",
  /CHANNEL_TITLE_LIMITS[\s\S]{0,300}youtube:\s*100/.test(route),
);

check(
  "REFUSES an over-limit title rather than truncating it",
  /title\.length\s*>\s*CHANNEL_TITLE_LIMITS\[entry\.channel\][\s\S]{0,400}return\s+reject\(\s*400/.test(
    route,
  ),
);

check(
  "the refusal names the channel, the length and the limit",
  /has a title of \$\{title\.length\} characters[\s\S]{0,200}CHANNEL_TITLE_LIMITS\[entry\.channel\]/.test(
    route,
  ),
);

check(
  "never truncates a title itself",
  !/title[^\n]*\.slice\(/.test(route) && !/\.substring\([\s\S]{0,40}title/.test(route),
);

check(
  "an authored title WINS over the assembled fallback",
  /title:\s*post\.title\s*\?\?\s*`\$\{titleBase\}\s*—\s*\$\{channelLabel\(post\.channel\)\}`/.test(
    route,
  ),
);

check(
  "the assembled fallback still exists for an un-authored draft",
  /channelLabel\(post\.channel\)/.test(route) && /function\s+channelLabel/.test(route),
);

check(
  "an absent title is omitted, never sent as an empty string",
  /\.\.\.\(title\s*\?\s*\{\s*title\s*\}\s*:\s*\{\}\)/.test(route),
);

check(
  "per-channel body text was already supported and is still per-entry",
  /for\s*\(const entry of body\.posts as IncomingPost\[\]\)/.test(route) &&
    /const text = typeof entry\.text === "string"/.test(route),
);

console.log("\nupload — the truncation this makes unreachable is still bounded");

check(
  "the upload layer keeps its own defensive clamp (belt and braces)",
  /YOUTUBE_MAX_TITLE\s*=\s*100/.test(upload) &&
    /input\.title\.trim\(\)\.slice\(0,\s*YOUTUBE_MAX_TITLE\)/.test(upload),
);

console.log("\nbody builder — no channel gets copy nobody wrote");

check(
  "the body builder only assembles fields it was given",
  /parts\.push\(postText\)/.test(body) &&
    /parts\.push\(callToAction\)/.test(body) &&
    /hashtags\.length\s*>\s*0/.test(body),
);

check(
  "it invents no words of its own — every part comes from an input",
  // Nothing but the caller's own strings and a "#" prefix on tags the
  // caller supplied. A literal sentence here would be marketing copy no
  // human approved.
  !/parts\.push\(\s*"/.test(body),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} platform-copy checks passed.`,
);
if (failures > 0) process.exit(1);
