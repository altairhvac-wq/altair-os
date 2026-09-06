/**
 * Executable tests for the Shorts eligibility decision — the pure module
 * that answers "is this render technically shaped like a Short?" from
 * measured asset facts.
 *
 * The rules under test mirror Google's current primary documentation
 * (verified 2026-09-06): a Short is a video with a SQUARE OR VERTICAL
 * aspect ratio (height >= width) up to 3 minutes, classified from the
 * file's properties — no upload flag, no hashtag requirement. The
 * constants are pinned here so a policy change is an explicit edit, and
 * the tri-state verdict is pinned so missing facts can never be read as
 * either a pass or a failure.
 *
 * Run: node scripts/verify-youtube-shorts.mjs
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

const dir = mkdtempSync(join(tmpdir(), "yt-shorts-"));
const emitted = ts.transpileModule(
  readFileSync("shared/types/youtube-shorts.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
writeFileSync(join(dir, "youtube-shorts.mjs"), emitted);
const shorts = await import(pathToFileURL(join(dir, "youtube-shorts.mjs")).href);

const decide = (over = {}) =>
  shorts.decideYouTubeShortEligibility({
    contentType: "video/mp4",
    durationMs: 31_000,
    widthPx: 1080,
    heightPx: 1920,
    ...over,
  });

console.log("\nThe constants are the policy, spelled once");

check(
  "the Shorts ceiling is 3 minutes",
  shorts.YOUTUBE_SHORT_MAX_DURATION_MS === 180_000,
  shorts.YOUTUBE_SHORT_MAX_DURATION_MS,
);
check(
  "square counts — the minimum aspect is exactly 1.0",
  shorts.YOUTUBE_SHORT_MIN_ASPECT === 1.0,
);

console.log("\nEligible shapes");

check("a 9:16 vertical short is eligible", decide().verdict === "eligible", decide());
check(
  "a SQUARE video is eligible — the rule is square OR vertical",
  decide({ widthPx: 1080, heightPx: 1080 }).verdict === "eligible",
);
check(
  "exactly the 3-minute ceiling is still eligible",
  decide({ durationMs: 180_000 }).verdict === "eligible",
);
check(
  "the eligible reason states the measured facts",
  /1080×1920/.test(decide().reasons[0] ?? "") && /31s/.test(decide().reasons[0] ?? ""),
  decide().reasons,
);

console.log("\nIneligible shapes, with the reason naming the fact");

{
  const landscape = decide({ widthPx: 1920, heightPx: 1080 });
  check("a 16:9 landscape video is not a Short", landscape.verdict === "ineligible");
  check(
    "and the reason names the dimensions",
    landscape.reasons.some((r) => r.includes("1920×1080")),
    landscape.reasons,
  );
}
{
  const long = decide({ durationMs: 181_000 });
  check("one second over the ceiling is not a Short", long.verdict === "ineligible");
  check(
    "and the reason says it would upload as a regular video",
    long.reasons.some((r) => /regular video/.test(r)),
    long.reasons,
  );
}
check(
  "a non-video asset is ineligible outright",
  decide({ contentType: "image/png" }).verdict === "ineligible",
);

console.log("\nUnknown is a real verdict, not a default");

check(
  "missing duration makes the verdict unknown, not eligible",
  decide({ durationMs: null }).verdict === "unknown",
);
check(
  "missing dimensions make the verdict unknown, not eligible",
  decide({ widthPx: null, heightPx: null }).verdict === "unknown",
);
check(
  "the unknown reasons NAME the missing fact",
  decide({ durationMs: null }).reasons.some((r) => /duration/.test(r)) &&
    decide({ widthPx: null, heightPx: null }).reasons.some((r) => /dimensions/.test(r)),
);
check(
  "zero and non-finite measurements read as missing, never as passing",
  decide({ durationMs: 0 }).verdict === "unknown" &&
    decide({ widthPx: 0, heightPx: 0 }).verdict === "unknown" &&
    decide({ durationMs: Number.NaN }).verdict === "unknown",
);
check(
  "A DEFINITE FAILURE OUTRANKS ANY UNKNOWN — a landscape video with unknown duration is ineligible",
  decide({ widthPx: 1920, heightPx: 1080, durationMs: null }).verdict === "ineligible",
);
check(
  "the checked record says what the decision could actually see",
  decide({ durationMs: null }).checked.duration === false &&
    decide({ durationMs: null }).checked.aspect === true,
);

console.log("\nThe one-line description");

check(
  "eligible reads as Shorts-shaped",
  shorts.describeYouTubeShortEligibility(decide()).startsWith("Shorts-shaped:"),
);
check(
  "ineligible reads as Not a Short",
  shorts
    .describeYouTubeShortEligibility(decide({ widthPx: 1920, heightPx: 1080 }))
    .startsWith("Not a Short:"),
);
check(
  "unknown says so instead of guessing",
  shorts
    .describeYouTubeShortEligibility(decide({ durationMs: null }))
    .startsWith("Shorts eligibility unknown:"),
);

console.log("\nPurity — the module drags in nothing");

{
  const source = readFileSync("shared/types/youtube-shorts.ts", "utf8");
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  check("no imports at all", !/^\s*import\s/m.test(stripped));
  check('never server-only', !stripped.includes('"server-only"'));
  check("no environment reads", !stripped.includes("process.env"));
  check(
    "no filename heuristics — the decision reads measurements only",
    !/filename|fileName|\.mp4|#shorts/i.test(stripped),
  );
}

console.log(
  failures === 0
    ? `\n${checks}/${checks} Shorts eligibility checks passed.`
    : `\n${failures} of ${checks} Shorts eligibility checks FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
