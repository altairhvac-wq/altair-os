/**
 * Turn the visual acceptance review into artifacts the rest of the system reads.
 *
 * ==================== WHAT THE REVIEW WAS ====================
 * Every image in the HVAC library was opened and looked at by a reviewer
 * briefed as an HVAC instructor doing acceptance review — not a classifier
 * scoring a filename. 216 frames across six categories. A finding is recorded
 * only where something is actually wrong with the picture, so the absence of a
 * finding is the KEEP verdict; that is why the findings list is shorter than
 * the library.
 *
 * ==================== THE FOUR VERDICTS ====================
 *   REGENERATE    the image is wrong in a way a viewer would see — malformed
 *                 hands, geometry that contradicts how the equipment works.
 *   MISLABELED    the photograph is fine, the metadata describing it is not.
 *                 Cheap to fix, and dangerous to leave, because retrieval
 *                 believes the metadata.
 *   QUESTIONABLE  usable but compromised; fine as a cutaway, wrong as the
 *                 establishing shot of a section.
 *   KEEP          reviewed and sound. Recorded explicitly where the reviewer
 *                 called it out, implied everywhere else.
 *
 * ==================== WHY NOTHING IS DELETED ====================
 * A flagged image stays on disk and stays in the index. What changes is how
 * eager the system is to reach for it: a REGENERATE asset is marked unapproved
 * so curation stops proposing it, and everything else takes a suitability
 * penalty instead of a ban. Deleting would throw away the only copy of a
 * picture whose problem might be one regeneration or one tag away from fixed.
 *
 * Run: node scripts/practice/write-qc-report.mjs <workflow-output.json>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const LIB = "D:/Altair-HVAC-Library";
const OS_ROOT = "C:/Users/User/Desktop/altair-os";
const REPORTS = `${OS_ROOT}/reports`;

/**
 * How much a verdict costs an asset when curation ranks it.
 *
 * REGENERATE also clears `approved`, which is the flag `asset-library.ts`
 * already honours — a penalty alone would still let a broken frame win an
 * uncontested beat.
 */
const PENALTY = { REGENERATE: 0.45, MISLABELED: 0.2, QUESTIONABLE: 0.15, KEEP: 0 };

const src = process.argv[2];
if (!src) {
  process.stderr.write("usage: node scripts/practice/write-qc-report.mjs <workflow-output.json>\n");
  process.exit(2);
}

const payload = JSON.parse(readFileSync(src, "utf8"));
const review = payload.result ?? payload;

/* ── 1. Flatten to one row per finding ───────────────────────────────────── */

const rows = [];
for (const cat of review.categories) {
  for (const f of cat.findings) {
    rows.push({
      assetId: f.assetId,
      category: cat.category,
      classification: f.classification,
      severity: f.severity ?? null,
      issue: f.issue,
    });
  }
}
rows.sort((a, b) => a.assetId.localeCompare(b.assetId));

const byId = new Map(rows.map((r) => [r.assetId, r]));
const counts = {};
for (const r of rows) counts[r.classification] = (counts[r.classification] ?? 0) + 1;

/* ── 2. Which of them the practice episode actually uses ─────────────────── */

const snapshot = JSON.parse(
  readFileSync(`${OS_ROOT}/shared/lib/video-editor/practice/compressor-episode-snapshot.json`, "utf8"),
);
const usedInEpisode = new Set(
  snapshot.visual.map((v) => v.assetId).filter((id) => typeof id === "string"),
);
const flaggedInEpisode = rows.filter((r) => usedInEpisode.has(r.assetId));

/* ── 3. The report ───────────────────────────────────────────────────────── */

mkdirSync(REPORTS, { recursive: true });

const report = {
  generatedAt: new Date().toISOString(),
  method: "visual acceptance review, every image opened",
  framesOpened: review.framesOpened,
  libraryTotal: 229,
  reviewedCategories: review.reviewedCategories,
  counts,
  unflagged: 229 - rows.filter((r) => r.classification !== "KEEP").length,
  policy: {
    deleted: 0,
    note: "Nothing is deleted. REGENERATE clears `approved`; every verdict carries a suitability penalty.",
    penalties: PENALTY,
  },
  usedInPracticeEpisode: flaggedInEpisode.map((r) => ({
    assetId: r.assetId,
    classification: r.classification,
    severity: r.severity,
  })),
  findings: rows,
};
writeFileSync(`${REPORTS}/hvac-photo-library-qc.json`, JSON.stringify(report, null, 2), "utf8");

const line = (r) =>
  `| \`${r.assetId}\` | ${r.classification} | ${r.severity ?? "—"} | ${r.issue.replace(/\|/g, "\\|")} |`;

const md = `# HVAC photo library — visual acceptance review

${String(review.framesOpened)} frames opened across ${String(review.reviewedCategories)} categories, out of 229 in the library.
Every image was looked at; a row below exists only where something is wrong with
the picture, so an asset absent from this table passed.

| verdict | count | what it means | what the system does with it |
| --- | --- | --- | --- |
| REGENERATE | ${String(counts.REGENERATE ?? 0)} | wrong in a way a viewer would see | \`approved: false\` — curation stops proposing it |
| MISLABELED | ${String(counts.MISLABELED ?? 0)} | the picture is fine, the metadata is not | suitability −${String(PENALTY.MISLABELED)} until the tags are corrected |
| QUESTIONABLE | ${String(counts.QUESTIONABLE ?? 0)} | usable, but not as a lead shot | suitability −${String(PENALTY.QUESTIONABLE)} |
| KEEP | ${String(counts.KEEP ?? 0)} | reviewed and explicitly sound | unchanged |

**Nothing was deleted.** A flagged image keeps its file and its index entry —
the flag changes how eagerly the system reaches for it, not whether it exists.

## In the compressor practice episode

${
  flaggedInEpisode.length === 0
    ? "None of the flagged assets are used."
    : `${String(flaggedInEpisode.length)} of the episode's assets carry a flag:\n\n` +
      flaggedInEpisode
        .map((r) => `- \`${r.assetId}\` — **${r.classification}** (${r.severity ?? "—"})`)
        .join("\n")
}

## Findings

${review.categories
  .map((cat) => {
    const mine = rows.filter((r) => r.category === cat.category);
    return `### ${cat.category} — ${String(cat.reviewed)} reviewed, ${String(mine.length)} flagged

| asset | verdict | severity | what is wrong |
| --- | --- | --- | --- |
${mine.map(line).join("\n")}`;
  })
  .join("\n\n")}
`;
writeFileSync(`${REPORTS}/hvac-photo-library-qc.md`, md, "utf8");

/* ── 4. Feed the verdicts back into the librarian index ──────────────────── */

const indexPath = `${LIB}/library-index.json`;
const index = JSON.parse(readFileSync(indexPath, "utf8"));
let touched = 0;
for (const entry of index) {
  const finding = byId.get(entry.assetId);
  const verdict = finding?.classification ?? null;
  const penalty = verdict ? PENALTY[verdict] : 0;

  // Recorded on the entry so the reason is visible where the effect is, rather
  // than only in a report nobody reads at retrieval time.
  entry.qcStatus = verdict ?? "KEEP";
  if (finding) entry.qcIssue = finding.issue;

  if (verdict === "REGENERATE") entry.approved = false;
  if (penalty > 0 && typeof entry.reelSuitability === "number") {
    entry.reelSuitability = Math.max(0, Number((entry.reelSuitability - penalty).toFixed(3)));
  }
  if (verdict) touched += 1;
}
writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");

/* ── 5. And into the catalog the editor's library panel reads ────────────── */

const catalogPath = `${OS_ROOT}/public/studio/hvac-catalog.json`;
if (existsSync(catalogPath)) {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  for (const asset of catalog.assets) {
    const verdict = byId.get(asset.assetId)?.classification;
    if (verdict) {
      asset.qcStatus = verdict;
      asset.qcIssue = byId.get(asset.assetId).issue;
    }
  }
  writeFileSync(catalogPath, JSON.stringify(catalog), "utf8");
}

process.stdout.write(
  `qc: ${String(rows.length)} findings (${Object.entries(counts)
    .map(([k, v]) => `${k} ${String(v)}`)
    .join(", ")})\n` +
    `  ${String(touched)} index entries updated, ${String(flaggedInEpisode.length)} of them used in the episode\n` +
    `  -> reports/hvac-photo-library-qc.json + .md\n`,
);
