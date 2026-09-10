/**
 * The learning loop, in a real browser.
 *
 * ===================== WHY SEPARATE FROM THE EDITOR SUITE =====================
 * `verify-video-editor-ui.mjs` proves the editor works. This proves the LOOP is
 * wired: that a Director plan becomes an openable draft, that the draft
 * announces where it came from, that approving one produces a scorecard, and
 * that the learning panel refuses to overclaim after a single session.
 *
 * Those are different failures. An editor that works perfectly on a draft
 * nobody can create is still a dead end, and none of the checks below would be
 * caught by a suite that opens the committed demo episode.
 *
 * Requires a dev server and .playwright/founder-auth.json.
 *
 * Run: node scripts/verify-agent-loop-ui.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;
let checks = 0;

async function check(name, fn) {
  checks += 1;
  try {
    await fn();
    process.stdout.write(`  ok   ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stdout.write(`  FAIL ${name}\n       ${error.message}\n`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * The REAL Draft B plan from the end-to-end proof, so this suite exercises
 * agent output rather than a plan written to make it pass.
 */
const PROOF = "ui-audit/video-editor/learning-loop-proof/platform-drafts.json";
if (!fs.existsSync(PROOF)) {
  process.stdout.write(
    `\nNo proof artifact at ${PROOF}. Run \`npm run proof:agent-loop\` first.\n`,
  );
  process.exit(2);
}
const proof = JSON.parse(fs.readFileSync(PROOF, "utf8"));
const PLAN = { ...proof.draftB.plan, generatedWith: proof.draftB.generatedWith };

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: ".playwright/founder-auth.json",
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

async function openStudio() {
  await page.goto(`${BASE}/marketing`, {
    waitUntil: "domcontentloaded",
    timeout: 300000,
  });
  await page.waitForTimeout(3500);
  await page.locator('button:has-text("Studio")').first().click({ timeout: 90000 });
  await page.waitForTimeout(1200);
}

await openStudio();
// Start clean so a previous run's drafts and sessions cannot mask anything.
await page.evaluate(() => {
  window.localStorage.removeItem("altair.editor.drafts");
  window.localStorage.removeItem("altair.editor.sessions");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.locator('button:has-text("Studio")').first().click({ timeout: 90000 });
await page.waitForTimeout(1200);

process.stdout.write("\nDraft handoff\n");

await check("1. Studio offers the draft intake and the preference export", async () => {
  const text = await page.locator("body").innerText();
  assert(/Agent drafts and learned preferences/i.test(text), "no intake panel");
  assert(/Open a generated plan/i.test(text), "no plan intake");
  assert(/Export learned preferences/i.test(text), "no preference export");
});

await check("2. a malformed plan is refused with a readable reason", async () => {
  const box = page.locator("textarea").first();
  await box.fill('{"topic":"x"}');
  await page.locator('button:has-text("Create draft")').click();
  await page.waitForTimeout(600);
  const text = await page.locator("body").innerText();
  assert(/has no `beats`/i.test(text), `expected a beats error, saw: ${text.slice(0, 200)}`);
});

await check("3. a real Director plan becomes a draft", async () => {
  const box = page.locator("textarea").first();
  await box.fill(JSON.stringify(PLAN));
  await page.locator('button:has-text("Create draft")').click();
  await page.waitForTimeout(1200);

  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem("altair.editor.drafts");
    if (!raw) return null;
    const drafts = JSON.parse(raw).drafts;
    const draft = drafts[drafts.length - 1];
    return {
      count: drafts.length,
      title: draft.project.title,
      tracks: draft.project.tracks.length,
      clips: draft.project.tracks.reduce((n, t) => n + t.clips.length, 0),
      agentVersion: draft.metadata.agentVersion,
      preferenceSetVersion: draft.metadata.preferenceSetVersion ?? null,
      estimated: draft.summary.durationsEstimated,
    };
  });
  assert(stored, "no draft was stored");
  assert(stored.count === 1, `${stored.count} drafts stored, expected 1`);
  assert(stored.tracks === 8, `${stored.tracks} tracks`);
  assert(stored.clips > 0, "the draft has no clips");
  assert(
    stored.agentVersion.includes("content.draft_video_plan"),
    `draft author not carried through: ${stored.agentVersion}`,
  );
  assert(
    stored.preferenceSetVersion === 1,
    `preference set version not carried: ${stored.preferenceSetVersion}`,
  );
  assert(stored.estimated === true, "estimated durations must be flagged");
});

await check("4. durations come from the pacing rule, not the plan", async () => {
  const durations = await page.evaluate(() => {
    const raw = window.localStorage.getItem("altair.editor.drafts");
    const draft = JSON.parse(raw).drafts.at(-1);
    return draft.project.tracks
      .filter((t) => t.kind === "video" || t.kind === "graphics")
      .flatMap((t) => t.clips)
      .map((c) => c.durationMs)
      .sort((a, b) => a - b);
  });
  assert(durations.length > 0, "no visual clips");
  // Nothing shorter than the base tail, and the final beat's long hold means
  // the spread is real rather than every clip being identical.
  assert(durations[0] > 700, `shortest clip is ${durations[0]}ms`);
  assert(
    durations.at(-1) !== durations[0],
    "every clip is the same length — the pacing rule was not applied",
  );
});

process.stdout.write("\nThe draft in the editor\n");

await check("5. the draft opens and announces where it came from", async () => {
  const open = page.locator('[data-testid="ve-open-draft"]').first();
  const href = await open.getAttribute("href");
  assert(href && href.startsWith("/studio/editor/draft-"), `bad href ${href}`);
  await open.click();
  await page.waitForTimeout(4000);

  assert(
    page.url().includes("/studio/editor/draft-"),
    `landed on ${page.url()}`,
  );
  const banner = await page.locator("text=GENERATED DRAFT").count();
  assert(banner === 1, "no GENERATED DRAFT banner");
  const text = await page.locator("body").innerText();
  assert(
    /content\.draft_video_plan/.test(text),
    "the banner does not name the agent",
  );
  assert(
    /preference set v1/.test(text),
    "the banner does not name the preference set",
  );
});

await check("6. the draft renders as a real timeline", async () => {
  const clips = await page.locator('[aria-label*="seconds"]').count();
  assert(clips > 5, `only ${clips} clips on the timeline`);
  const timelineText = await page
    .locator('section[aria-label="Timeline"]')
    .innerText();
  for (const track of ["VIDEO 1", "GRAPHICS", "CAPTIONS", "VOICEOVER"]) {
    assert(timelineText.includes(track), `missing ${track}`);
  }
});

await check("7. a clip whose asset does not exist is NAMED, not blank", async () => {
  // A generated draft has no assets yet — `visualDirection` is a description,
  // not an asset id. The canvas must say so rather than showing black.
  const canvasText = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="ve-canvas"]');
    return canvas ? canvas.innerText : "";
  });
  assert(canvasText.trim().length > 0, "the canvas is blank for a missing asset");
});

process.stdout.write("\nApproval and the scorecard\n");

await check("8. approving a generated draft shows a scorecard", async () => {
  // Make one unmistakable edit first.
  const clip = page.locator('[aria-label*="seconds"][data-track-kind="video"]').first();
  await clip.click({ position: { x: 20, y: 14 } });
  await page.waitForTimeout(300);
  const duration = page
    .locator('aside[aria-label="Inspector"] input[type=number]')
    .nth(1);
  await duration.fill("1800");
  await duration.press("Tab");
  await page.waitForTimeout(500);

  await page.locator('[data-testid="ve-approve"]').click();
  await page.waitForTimeout(800);

  assert(
    (await page.locator('[data-testid="ve-scorecard"]').count()) === 1,
    "no scorecard after approval",
  );
  const card = await page.locator('[data-testid="ve-scorecard"]').innerText();
  assert(/Clips retained/.test(card), `scorecard has no retention: ${card}`);
  assert(
    /generated cut was kept/.test(card),
    `scorecard headline missing: ${card}`,
  );
});

await check("9. the session records the draft's agent and preference set", async () => {
  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem("altair.editor.sessions");
    if (!raw) return null;
    const s = JSON.parse(raw).sessions.at(-1);
    return {
      generatedBy: s.generatedBy,
      hasGenerated: Boolean(s.generatedProjectSnapshot),
      hasApproved: Boolean(s.approvedProjectSnapshot),
      scope: s.scope,
    };
  });
  assert(stored, "no session stored");
  assert(stored.hasGenerated && stored.hasApproved, "a snapshot is missing");
  assert(
    stored.generatedBy.includes("content.draft_video_plan"),
    `session credits the wrong author: ${stored.generatedBy}`,
  );
  assert(
    stored.scope.format === "long_form_youtube",
    `scope format must use the agent vocabulary, got ${stored.scope.format}`,
  );
});

process.stdout.write("\nLearning panel\n");

await check("10. one session never reads as learned", async () => {
  await openStudio();
  const text = await page.locator("body").innerText();
  assert(/Learned from edits/.test(text), "no learning panel");
  assert(
    /Collecting evidence/.test(text),
    `a single session must show "Collecting evidence", saw: ${text.slice(text.indexOf("Learned from edits"), text.indexOf("Learned from edits") + 600)}`,
  );
  assert(
    !/Active guidance/.test(text),
    "one session must never show Active guidance",
  );
});

await check("11. the panel shows scope and the agent-facing band", async () => {
  const text = await page.locator("body").innerText();
  assert(/scope /.test(text), "preference scope is not shown");
  assert(
    /Not used by agents|Guidance only|Follow normally/.test(text),
    "the agent-facing strength band is not shown",
  );
});

await check("12. exporting preferences reports the threshold honestly", async () => {
  await page.locator('button:has-text("Export preference set")').click();
  await page.waitForTimeout(800);
  const text = await page.locator("body").innerText();
  assert(
    /nothing has cleared 5 sessions and 70% confidence/i.test(text),
    `expected an honest threshold message, saw: ${text.slice(0, 300)}`,
  );
});

process.stdout.write("\nIntegrity\n");

await check("13. no uncaught page errors during the whole run", async () => {
  assert(
    pageErrors.length === 0,
    `page errors:\n${pageErrors.slice(0, 4).join("\n")}`,
  );
});

await browser.close();

process.stdout.write(
  `\n${checks - failures}/${checks} loop checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures ? 1 : 0);
