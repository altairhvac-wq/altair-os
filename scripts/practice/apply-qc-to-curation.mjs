/**
 * Retire the pictures QC rejected, without re-deciding the ones it accepted.
 *
 * ==================== WHY NOT JUST RE-CURATE ====================
 * That was tried first, and it is recorded here because the result matters.
 * Marking 37 assets unapproved and re-running `video:curate` changed five
 * beats, not two — and three of the five became WRONG:
 *
 *   beat 18  "macro of a valve plate showing the reed valves"  (reciprocating)
 *            got a ROTARY rolling-piston cutaway, confidence 0.36
 *   beat 22  "the vane tip pressing against the rolling piston" (rotary)
 *            got a SCREW rotor macro
 *   beat 25  "a male rotor lobe inside a female flute"          (screw)
 *            got the rotary vane macro
 *
 * One weak substitution at beat 18 took an asset that beat 21 was going to use,
 * and the continuity rule's two-uses-per-video cap pushed the displacement down
 * the sequence. The curation is not malfunctioning — it is answering "what is
 * the best remaining match" when the honest answer for that beat is "we do not
 * own this picture". A confidently wrong frame teaches the viewer something
 * false; a card that says IMAGE NEEDED teaches them nothing and costs nothing.
 *
 * So this applies the verdict without the cascade: a beat whose asset QC
 * rejected becomes a PENDING CAPTURE, which is already a state the curation
 * produces, the draft carries, and the placeholder card renders. Every beat QC
 * did not reject keeps the pick curation made for it.
 *
 * ==================== WHAT IT DOES NOT DO ====================
 * It does not choose a replacement picture. Picking the runner-up would be
 * re-deciding by hand exactly what the re-curation got wrong.
 *
 * Run: node scripts/practice/apply-qc-to-curation.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const PRACTICE = "C:/Users/User/Desktop/altair-os/shared/lib/video-editor/practice";
const QC = "C:/Users/User/Desktop/altair-os/reports/hvac-photo-library-qc.json";

/** Only this verdict retires a picture. The rest are penalties, not bans. */
const RETIRES = "REGENERATE";

// The curation's own output, untouched. `compressor-episode-curated.json` is
// DERIVED from it by this script, so re-running is idempotent and the verdict
// can be revised without re-curating.
const draft = JSON.parse(readFileSync(`${PRACTICE}/compressor-episode-curated.raw.json`, "utf8"));
const qc = JSON.parse(readFileSync(QC, "utf8"));
const verdict = new Map(qc.findings.map((f) => [f.assetId, f]));

const bare = (id) => String(id).replace(/\.[a-z0-9]+$/i, "");
const retired = [];

for (const [i, beat] of draft.beats.entries()) {
  const v = beat.visual;
  if (!v || v.mode !== "real_asset" || typeof v.assetId !== "string") continue;
  const finding = verdict.get(bare(v.assetId));
  if (finding?.classification !== RETIRES) continue;

  retired.push({ beat: i + 1, assetId: bare(v.assetId), severity: finding.severity });

  // The shape curation itself writes for a beat it could not answer, so the
  // adapter, the preflight and the placeholder card all read it unchanged.
  beat.visual = {
    ...v,
    mode: "pending_capture",
    assetId: null,
    previewUrl: null,
    reason: `Withdrawn by visual QC (${finding.classification}, ${finding.severity ?? "—"}). ${finding.issue}`,
    confidence: 0.9,
    pendingRequirement:
      `Re-shoot or regenerate: ${beat.visualDirection}. ` +
      `The library's ${bare(v.assetId)} was the match, and it is wrong: ${finding.issue.slice(0, 180)}`,
  };
}

draft.curation = {
  ...draft.curation,
  qcApplied: {
    at: new Date().toISOString(),
    report: "reports/hvac-photo-library-qc.json",
    retiredVerdict: RETIRES,
    retired,
    note:
      "Beats whose asset QC rejected became pending captures. Re-curating the whole " +
      "plan instead moved five beats and made three of them subject-wrong, so the " +
      "verdict is applied without the continuity cascade.",
  },
};

writeFileSync(
  `${PRACTICE}/compressor-episode-curated.json`,
  JSON.stringify(draft, null, 2),
  "utf8",
);

process.stdout.write(
  `qc applied: ${String(retired.length)} beat(s) retired to pending capture\n` +
    retired.map((r) => `  beat ${String(r.beat)}: ${r.assetId} (${r.severity})\n`).join(""),
);
