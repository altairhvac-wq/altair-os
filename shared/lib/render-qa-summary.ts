/**
 * Bounding the measured verdict's human-readable summary.
 *
 * ==================== WHY THIS IS ITS OWN MODULE ====================
 * It is a pure string rule with a real safety property, and it was previously
 * inline in `app/api/agent/draft-posts/route.ts` — a file that imports
 * `next/server` and therefore cannot be loaded by the offline verifier
 * harness. A rule that cannot be executed in a test is a rule that gets
 * asserted about instead of tested, which is how the defect below shipped.
 *
 * ==================== THE DEFECT THIS CLOSES ====================
 * The receiver used to reject a verdict outright when its summary ran past the
 * limit:
 *
 *     if (!summary || summary.length > MAX_RENDER_QA_SUMMARY_CHARS) {
 *       return undefined;
 *     }
 *
 * That discarded the STATE, the POLICY VERSION and the ADVISORIES along with
 * the sentence — so a render that was measured and FAILED rendered on the
 * founder's card as "Not measured". The whole point of this subsystem is that
 * "we did not look" and "we looked and it is broken" must never be shown as
 * the same thing, and an overlong prose field was silently collapsing the
 * second into the first.
 *
 * ==================== WHAT IS AND IS NOT SAFE TO SHORTEN ====================
 * The state and the advisory codes are load-bearing: they are what the card
 * colours on and what a person acts on, and nothing here may touch them. The
 * summary is a sentence the policy wrote for a human to read, and its
 * untruncated form is already durable in the platform's own
 * `qa.video_verdict` artifact — which is the authoritative record and is not
 * bounded by this column.
 *
 * So the summary, and only the summary, is bounded here, with a marker that
 * says so and names where the full text lives. Bounding is length-only: it
 * cannot change a verdict's state, cannot turn a FAIL into a PASS, and cannot
 * manufacture one where none was sent.
 */

/**
 * Mirrors migration 198's `char_length(render_qa_summary) <= 1000` CHECK.
 * The bound exists so the insert can never be rejected by the column; keeping
 * the two numbers equal is what makes that guarantee hold.
 */
export const MAX_RENDER_QA_SUMMARY_CHARS = 1_000;

/**
 * Appended when a summary is bounded, so a reader can tell a shortened
 * sentence from one that simply ended — and knows where to find the rest.
 */
export const RENDER_QA_SUMMARY_TRUNCATION_MARKER =
  " […truncated; full detail in the platform's qa.video_verdict artifact]";

/**
 * Bounds a summary WITHOUT losing the verdict.
 *
 * The marker is counted inside the budget, so the result is never longer than
 * `MAX_RENDER_QA_SUMMARY_CHARS` and the insert can never violate migration
 * 198's CHECK. A summary at or under the limit is returned byte-for-byte
 * unchanged — no marker, no reformatting, no trailing-space surprises.
 */
export function boundRenderQaSummary(summary: string): string {
  if (summary.length <= MAX_RENDER_QA_SUMMARY_CHARS) return summary;
  const keep = MAX_RENDER_QA_SUMMARY_CHARS - RENDER_QA_SUMMARY_TRUNCATION_MARKER.length;
  // Defensive: if the marker were ever edited to be longer than the budget, a
  // hard slice is still better than emitting something the column rejects.
  if (keep <= 0) return summary.slice(0, MAX_RENDER_QA_SUMMARY_CHARS);
  return summary.slice(0, keep).trimEnd() + RENDER_QA_SUMMARY_TRUNCATION_MARKER;
}
