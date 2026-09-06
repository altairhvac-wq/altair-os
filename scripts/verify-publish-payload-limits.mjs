/**
 * Two boundary defects, tested against the SHIPPED functions rather than a
 * copy of them.
 *
 * ===================== A1 — THE ASSEMBLED BODY =====================
 * Provider limits were only ever applied by `buildYouTubeUploadInitRequest`'s
 * `description.trim().slice(0, 5000)` — a silent truncation four layers below
 * the founder's approval click. Nothing measured the string the provider
 * actually receives, and that string is ASSEMBLED: post text, then the call to
 * action, then the hashtags, joined by blank lines. A caption that fits on its
 * own can overflow once the other two are appended, so checking `postText`
 * alone can never catch it.
 *
 * The tests below therefore push on the assembly, not the field: a body that
 * fits until the CTA is added, and one that fits until the hashtags are.
 *
 * ===================== A2 — THE VERDICT SUMMARY =====================
 * `readRenderQa` used to `return undefined` for a summary over 1000
 * characters, discarding the STATE, the POLICY VERSION and the ADVISORIES
 * along with it — so a render that was measured and FAILED displayed as "Not
 * measured". That is this subsystem's cardinal error running backwards: a
 * known result shown as unknown, because a prose field was wordy.
 *
 * What must hold now: the verdict survives, the state is never altered, and a
 * FAIL never becomes a PASS.
 *
 * Offline, pure, side-effect free. Publishes nothing and opens no socket.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-publish-payload-limits.mjs
 */

import {
  buildMarketingPostBodyFromPost,
  checkMarketingPostBodyFits,
  checkMarketingPostTitleFits,
} from "../shared/lib/marketing-post-body.ts";
import {
  boundRenderQaSummary,
  MAX_RENDER_QA_SUMMARY_CHARS,
  RENDER_QA_SUMMARY_TRUNCATION_MARKER,
} from "../shared/lib/render-qa-summary.ts";
import { capabilityFor } from "../shared/types/integration-capability.ts";

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

/** A marketing post, only the fields the body builder reads. */
function post(over = {}) {
  return {
    id: "p1",
    title: "A render",
    postText: "Body.",
    callToAction: null,
    suggestedHashtags: [],
    ...over,
  };
}

const YT = capabilityFor("youtube").bodyMaxChars; // 5000
const FB = capabilityFor("facebook").bodyMaxChars; // 5000
const IG = capabilityFor("instagram").bodyMaxChars; // 2200

console.log("\nA1 — the limits are the providers' own, not invented here");

check("youtube body limit is 5000", YT === 5000);
check("facebook body limit is 5000", FB === 5000);
check("instagram body limit is 2200", IG === 2200);
check("youtube title limit is 100", capabilityFor("youtube").titleMaxChars === 100);
check(
  "facebook and instagram declare no separate title",
  capabilityFor("facebook").titleMaxChars === null &&
    capabilityFor("instagram").titleMaxChars === null,
);

console.log("\nA1 — a body that fits is untouched");

for (const [name, provider, limit] of [
  ["youtube", "youtube", YT],
  ["facebook", "facebook", FB],
  ["instagram", "instagram", IG],
]) {
  const exact = post({ postText: "x".repeat(limit) });
  const fit = checkMarketingPostBodyFits(exact, provider);
  check(`${name}: a body EXACTLY at the limit is accepted`, fit.error === null);
  check(
    `${name}: the accepted body is byte-identical to the assembled one`,
    fit.body === buildMarketingPostBodyFromPost(exact),
  );
  const under = post({ postText: "x".repeat(limit - 1) });
  check(
    `${name}: one character under the limit is accepted`,
    checkMarketingPostBodyFits(under, provider).error === null,
  );
}

console.log("\nA1 — THE ASSEMBLY is what overflows (the actual defect)");

// The body text alone fits. The CTA is what pushes it over — exactly the case
// a postText-only check cannot see.
const ctaOverflow = post({
  postText: "x".repeat(YT - 10),
  callToAction: "Follow for more HVAC business tips",
});
check(
  "youtube: post text fits alone, but not once the CTA is appended",
  buildMarketingPostBodyFromPost(post({ postText: "x".repeat(YT - 10) })).length <= YT &&
    checkMarketingPostBodyFits(ctaOverflow, "youtube").error !== null,
);

// Same again, with hashtags as the straw.
const tagOverflow = post({
  postText: "x".repeat(YT - 20),
  callToAction: null,
  suggestedHashtags: ["HVAC", "SmallBusiness", "Contractors"],
});
check(
  "youtube: post text fits alone, but not once the hashtags are appended",
  checkMarketingPostBodyFits(tagOverflow, "youtube").error !== null,
);

const igTagOverflow = post({
  postText: "y".repeat(IG - 15),
  callToAction: "Book today",
  suggestedHashtags: ["HVAC"],
});
check(
  "instagram: the 2200 ceiling is enforced on the assembled caption",
  checkMarketingPostBodyFits(igTagOverflow, "instagram").error !== null,
);

const fbOverflow = post({
  postText: "z".repeat(FB),
  callToAction: "Call us",
});
check(
  "facebook: the 5000 ceiling is enforced on the assembled message",
  checkMarketingPostBodyFits(fbOverflow, "facebook").error !== null,
);

console.log("\nA1 — a refusal, never a silent shortening");

const over = checkMarketingPostBodyFits(
  post({
    postText: "x".repeat(YT),
    callToAction: "Follow for more",
    suggestedHashtags: ["HVAC", "Contractors"],
  }),
  "youtube",
);
check("the over-limit case produces an error", over.error !== null);
check(
  "the returned body is NOT truncated — the full text is preserved",
  over.body.length > YT,
);
check("the error names the provider", over.error.includes("youtube"));
check("the error states the actual length", over.error.includes(String(over.body.length)));
check("the error states the limit", over.error.includes(String(YT)));
check("the error states the overage", over.error.includes(String(over.body.length - YT)));
check(
  "the error breaks down what the body is made of",
  over.error.includes("post text") &&
    over.error.includes("call to action") &&
    over.error.includes("hashtag"),
);
check(
  "the error says nothing was published and nothing was shortened",
  /nothing was shortened/i.test(over.error) && /Nothing was published/i.test(over.error),
);

console.log("\nA1 — titles");

check(
  "youtube: a 107-character title is refused (the September regression case)",
  checkMarketingPostTitleFits("x".repeat(107), "youtube").error !== null,
);
check(
  "youtube: exactly 100 is accepted",
  checkMarketingPostTitleFits("x".repeat(100), "youtube").error === null,
);
check(
  "youtube: 101 is refused",
  checkMarketingPostTitleFits("x".repeat(101), "youtube").error !== null,
);
check(
  "facebook/instagram titles are not checked — the provider has no title field",
  checkMarketingPostTitleFits("x".repeat(5000), "facebook").error === null &&
    checkMarketingPostTitleFits("x".repeat(5000), "instagram").error === null,
);
check(
  "an absent title is not an error",
  checkMarketingPostTitleFits(null, "youtube").error === null &&
    checkMarketingPostTitleFits(undefined, "youtube").error === null,
);

console.log("\nA1 — legacy posts still publish");

check(
  "a plain legacy post (text only, no CTA, no hashtags) is accepted everywhere",
  ["youtube", "facebook", "instagram"].every(
    (p) => checkMarketingPostBodyFits(post({ postText: "Short caption." }), p).error === null,
  ),
);
check(
  "null callToAction and null hashtags are handled without throwing",
  checkMarketingPostBodyFits(
    post({ postText: "Hi", callToAction: null, suggestedHashtags: null }),
    "youtube",
  ).error === null,
);

console.log("\nA2 — an overlong summary no longer erases the verdict");

const LIMIT = MAX_RENDER_QA_SUMMARY_CHARS;

check(
  "a normal summary is returned byte-for-byte unchanged",
  boundRenderQaSummary("PASS: every enforced integrity check ran and found nothing.") ===
    "PASS: every enforced integrity check ran and found nothing.",
);
check(
  "a summary EXACTLY at the limit is unchanged and carries no marker",
  boundRenderQaSummary("x".repeat(LIMIT)) === "x".repeat(LIMIT) &&
    !boundRenderQaSummary("x".repeat(LIMIT)).includes(RENDER_QA_SUMMARY_TRUNCATION_MARKER),
);
check(
  "one character under the limit is unchanged",
  boundRenderQaSummary("x".repeat(LIMIT - 1)) === "x".repeat(LIMIT - 1),
);

const bounded = boundRenderQaSummary("x".repeat(5000));
check("an overlong summary is bounded, not discarded", bounded.length > 0);
check("the bounded summary fits the column's 1000-char CHECK", bounded.length <= LIMIT);
check(
  "the bounded summary is visibly marked as truncated",
  bounded.endsWith(RENDER_QA_SUMMARY_TRUNCATION_MARKER),
);
check(
  "the marker names where the full detail still lives",
  RENDER_QA_SUMMARY_TRUNCATION_MARKER.includes("qa.video_verdict"),
);
check(
  "the leading content of the summary survives",
  boundRenderQaSummary(
    "FAIL: AUDIO_LOUDNESS_OUT_OF_SPEC. " + "y".repeat(5000),
  ).startsWith("FAIL: AUDIO_LOUDNESS_OUT_OF_SPEC."),
);

// The property that matters most: bounding is length-only. It cannot change a
// verdict's state, and it never invents one.
for (const state of ["PASS", "FAIL", "UNEVALUATED"]) {
  const long = `${state}: ` + "d".repeat(5000);
  const out = boundRenderQaSummary(long);
  check(
    `${state}: the state word survives bounding, unchanged`,
    out.startsWith(`${state}: `),
  );
  check(`${state}: the bounded summary still fits the column`, out.length <= LIMIT);
}
check(
  "bounding never turns a FAIL summary into a PASS one",
  !boundRenderQaSummary("FAIL: " + "d".repeat(5000)).includes("PASS"),
);
check(
  "bounding is idempotent — re-bounding an already-bounded summary changes nothing",
  boundRenderQaSummary(bounded) === bounded,
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} publish payload-limit checks passed.`,
);
if (failures > 0) process.exit(1);
