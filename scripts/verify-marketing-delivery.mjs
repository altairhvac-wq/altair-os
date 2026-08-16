/**
 * Tests for the delivery decision core — what makes publishing replay-safe.
 *
 * Pure module, so every branch is reachable without a database, a provider,
 * or an actual crash. The branches that matter most are exactly the ones you
 * cannot produce on demand in a live system: a claim that never settled, an
 * unreadable timestamp, a concurrent attempt.
 *
 * This script performs NO network call and NO publish. It imports one
 * dependency-free module.
 *
 * Run: node scripts/verify-marketing-delivery.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function loadTs(path) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const dir = mkdtempSync(join(tmpdir(), "deliv-"));
  const file = join(dir, "m.mjs");
  writeFileSync(file, outputText);
  return import(pathToFileURL(file).href);
}

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

const d = await loadTs("shared/types/marketing-delivery.ts");

const NOW = "2026-08-15T12:00:00.000Z";
const row = (over = {}) => ({
  id: "del-1",
  companyId: "c1",
  marketingPostId: "p1",
  provider: "facebook",
  deliveryState: "in_flight",
  providerPostId: null,
  providerPermalink: null,
  failureDetail: null,
  providerMediaId: null,
  createdAt: NOW,
  settledAt: null,
  ...over,
});

console.log("\nDelivery decision");

check("no prior attempt proceeds", d.decideDelivery(null, NOW) === "PROCEED");
check(
  "an already-posted delivery is refused",
  d.decideDelivery(row({ deliveryState: "posted", providerPostId: "fb_1" }), NOW) ===
    "ALREADY_POSTED",
);
check(
  "an already-drafted delivery is refused",
  d.decideDelivery(row({ deliveryState: "draft" }), NOW) === "ALREADY_DRAFTED",
);
check(
  "a FAILED delivery may be retried — nothing was created externally",
  d.decideDelivery(row({ deliveryState: "failed", failureDetail: "429" }), NOW) === "PROCEED",
);

console.log("\nThe in-flight branch — the crash-mid-publish case");

check(
  "a fresh claim reports IN_PROGRESS, not a duplicate",
  d.decideDelivery(row({ createdAt: "2026-08-15T11:59:00.000Z" }), NOW) === "IN_PROGRESS",
);
check(
  "a claim just inside the grace window is still IN_PROGRESS",
  d.decideDelivery(row({ createdAt: "2026-08-15T11:55:00.000Z" }), NOW) === "IN_PROGRESS",
);
check(
  "a STALE unsettled claim needs reconciliation — it must NEVER auto-retry",
  d.decideDelivery(row({ createdAt: "2026-08-15T11:50:00.000Z" }), NOW) ===
    "NEEDS_RECONCILIATION",
);
check(
  "an unreadable timestamp fails SAFE (reconciliation, not retry)",
  d.decideDelivery(row({ createdAt: "not-a-date" }), NOW) === "NEEDS_RECONCILIATION",
);
check(
  "an unreadable NOW also fails safe",
  d.decideDelivery(row(), "not-a-date") === "NEEDS_RECONCILIATION",
);

console.log("\nThe publish gate");

const allowed = ["PROCEED", "ALREADY_POSTED", "ALREADY_DRAFTED", "IN_PROGRESS", "NEEDS_RECONCILIATION"]
  .filter((x) => d.mayPublish(x));
check("exactly ONE decision may reach a provider", allowed.join(",") === "PROCEED", allowed);
check("a stale claim may not publish", !d.mayPublish("NEEDS_RECONCILIATION"));
check("a concurrent attempt may not publish", !d.mayPublish("IN_PROGRESS"));
check("an already-posted delivery may not publish", !d.mayPublish("ALREADY_POSTED"));

console.log("\nOperator copy");

for (const decision of d.DELIVERY_DECISIONS) {
  const text = d.describeDeliveryDecision(decision, "Facebook", row());
  check(
    `${decision} has copy (empty only for PROCEED)`,
    decision === "PROCEED" ? text === "" : typeof text === "string" && text.length > 0,
  );
}
check(
  "ALREADY_POSTED surfaces the permalink when there is one",
  d
    .describeDeliveryDecision(
      "ALREADY_POSTED",
      "Facebook",
      row({ deliveryState: "posted", providerPermalink: "https://fb.com/1" }),
    )
    .includes("https://fb.com/1"),
);
check(
  "NEEDS_RECONCILIATION warns about double-posting rather than offering a retry",
  /post twice|may or may not/i.test(
    d.describeDeliveryDecision("NEEDS_RECONCILIATION", "Facebook", row()),
  ),
);
check(
  "NEEDS_RECONCILIATION names the provider object when one was recorded",
  d
    .describeDeliveryDecision(
      "NEEDS_RECONCILIATION",
      "Facebook",
      row({ providerMediaId: "1784200123" }),
    )
    .includes("1784200123"),
);
check(
  "and does not invent one when nothing was recorded",
  !/undefined|null/.test(
    d.describeDeliveryDecision("NEEDS_RECONCILIATION", "Facebook", row()),
  ),
);

console.log("\nFailure detail clamping");

check(
  "long provider errors are clamped under the column CHECK",
  d.clampFailureDetail("x".repeat(5000)).length <= d.DELIVERY_FAILURE_DETAIL_MAX,
);
check(
  "short details pass through unchanged",
  d.clampFailureDetail("  rate limited  ") === "rate limited",
);
check("whitespace is collapsed", d.clampFailureDetail("a\n\n  b") === "a b");

console.log("\nState vocabulary matches migration 143");
check(
  "four states, matching the CHECK constraint",
  d.MARKETING_DELIVERY_STATES.join(",") === "in_flight,posted,draft,failed",
);

/**
 * STRUCTURAL GUARD (independent audit P2-1).
 *
 * The defect this catches: a delivery is claimed, then something between the
 * claim and the provider call `return`s early. The claim is never settled,
 * the row strands `in_flight`, and five minutes later the operator is told to
 * go reconcile an attempt that never reached the provider at all.
 *
 * It was reachable through the Facebook screenshot branch, whose resolver can
 * fail on a bad reference or missing app-URL config. Fixed by moving all local
 * resolution BEFORE the claim, so the claim spans exactly the external call.
 *
 * Asserted structurally rather than behaviourally because the hazard is a
 * control-flow shape, not a value: any future pre-flight check dropped into
 * that window would reintroduce it, and no unit test of the happy path would
 * notice.
 */
console.log("\nClaim/settle control flow");
{
  const src = readFileSync("app/actions/marketing-publish.ts", "utf8");
  const lines = src.split("\n");

  const claimLines = [];
  lines.forEach((line, i) => {
    if (/=\s*await\s+claimDelivery\(/.test(line)) claimLines.push(i);
  });

  // Derived rather than hardcoded. When Reel publishing added two more
  // actions this assertion was a literal `=== 2`, and a stale count is the
  // worst kind of guard: it fails on the correct change and gets "fixed" by
  // bumping the number, which is how the interesting part quietly stops being
  // checked. Every exported publish action must claim exactly one delivery.
  const publishActions = (
    src.match(/export async function publish\w*Action\b/g) ?? []
  ).length;
  check("there is at least one publish action to check", publishActions > 0);
  check(
    `every publish action claims a delivery (${publishActions} actions)`,
    claimLines.length === publishActions,
    `${claimLines.length} claims for ${publishActions} actions`,
  );

  // THE RULE, stated once: between claiming a delivery and settling it, EVERY
  // `return` must be justified — either it is the mayPublish refusal (no claim
  // is held) or it is preceded by a settle. An unjustified return is the audited
  // defect: the claim strands `in_flight` and the operator is sent to reconcile
  // an attempt that never reached the provider.
  //
  // The span runs from the claim to its `posted` settle, which deliberately
  // INCLUDES the try/catch body — the first version of this guard stopped at
  // `try {` and therefore missed the very defect it was written for.
  const JUSTIFY_WINDOW = 14;

  for (const claimAt of claimLines) {
    const settleAt = lines.findIndex(
      (l, i) => i > claimAt && /outcome:\s*"posted"/.test(l),
    );
    check(`a posted settle follows the claim at line ${claimAt + 1}`, settleAt > claimAt);

    const unjustified = [];
    for (let i = claimAt; i < settleAt; i += 1) {
      if (!/^\s*return\b/.test(lines[i])) continue;
      const before = lines.slice(Math.max(claimAt, i - JUSTIFY_WINDOW), i).join("\n");
      const justified =
        /mayPublish\(/.test(before) || /settleDelivery\(/.test(before);
      if (!justified) unjustified.push(`line ${i + 1}: ${lines[i].trim()}`);
    }
    check(
      `every return between claim and settle is justified (claim at line ${claimAt + 1})`,
      unjustified.length === 0,
      unjustified,
    );

    // Belt and braces: NO fallible local resolution may sit inside the claimed
    // span. The list grows as new publish paths add pre-flight steps — the
    // screenshot resolver was the original defect, and the Reel media
    // resolver (which mints a signed URL, and can fail) is the same shape.
    const PRE_FLIGHT_RESOLVERS = [
      /resolveFounderScreenshotPublicUrl\(/,
      /resolveReelMediaForPublish\(/,
      /createMediaReadGrant\(/,
      /getMediaAssetById\(/,
    ];
    const span = lines.slice(claimAt, settleAt);
    for (const resolver of PRE_FLIGHT_RESOLVERS) {
      check(
        `${String(resolver)} resolves BEFORE the claim at line ${claimAt + 1}`,
        !span.some((l) => resolver.test(l)),
      );
    }
  }

  check(
    "every claim is matched by a posted settle",
    (src.match(/outcome:\s*"posted"/g) ?? []).length === claimLines.length,
  );
  check(
    "every claim is matched by a failed settle in its catch",
    (src.match(/outcome:\s*"failed"/g) ?? []).length === claimLines.length,
  );

  /**
   * THE SETTLE RESULT IS CHECKED BEFORE THE POST IS MARKED POSTED
   * (independent audit P2-1).
   *
   * The defect: `await settleDelivery(...)` with its result discarded, then
   * `markMarketingPostPosted(...)` unconditionally. When the settle failed
   * after Meta had already published, the durable record contradicted itself
   * — a post reading `posted` with no provider id anywhere, and a delivery row
   * still `in_flight` that would surface as an unknown outcome for an attempt
   * that had actually succeeded.
   *
   * Structural, because the hazard is an ignored return value. No test of the
   * happy path would ever notice it, and any future publish action that
   * settles-then-marks would reintroduce it in one line.
   */
  check(
    "no action settles a live publish without checking the result",
    !/^\s*await settleDelivery\(\{[\s\S]{0,200}?outcome: "posted"/m.test(src),
  );
  for (const claimAt of claimLines) {
    const settleAt = lines.findIndex(
      (l, i) => i > claimAt && /outcome:\s*"posted"/.test(l),
    );
    const markAt = lines.findIndex(
      (l, i) => i > settleAt && /markMarketingPostPosted\(/.test(l),
    );
    check(
      `the post is marked posted after the settle (claim at line ${claimAt + 1})`,
      settleAt !== -1 && markAt > settleAt,
    );
    const between = lines.slice(settleAt, markAt).join("\n");
    check(
      `the settle outcome is inspected before marking posted (claim at line ${claimAt + 1})`,
      /settled\.error|\.error\b/.test(between),
      between,
    );
  }
  check(
    "the settle-and-verify helper retries before giving up on a live publish",
    /async function settlePublishedDelivery[\s\S]{0,900}?for \(let attempt/.test(src),
  );
  check(
    "and its refusal names the provider id the operator has to reconcile",
    /settlement\.providerPostId/.test(src) &&
      /NOT been marked posted|not been marked posted/i.test(src),
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} delivery checks passed.`,
);
if (failures > 0) process.exit(1);
