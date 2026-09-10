/**
 * Video editor: live interaction verification.
 *
 * ===================== WHY THIS EXISTS =====================
 * `verify-video-editor.mjs` proves the arithmetic. It cannot prove that the
 * arithmetic is WIRED — that pressing Space moves the playhead, that dragging a
 * clip changes its start, that a reload brings the edit back. Every one of
 * those is a connection between a real DOM event and the reducer, and the only
 * way to know a connection exists is to make the event and read the result.
 *
 * This drives a real browser against a running dev server and asserts on what
 * the DOM says afterwards. It is deliberately assertion-based rather than
 * screenshot-based: a screenshot proves something rendered, not that it is
 * correct.
 *
 * Requires: a dev server, and .playwright/founder-auth.json for a session that
 * can reach /marketing (platform operator).
 *
 * Run: node scripts/verify-video-editor-ui.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const URL_EDITOR = `${BASE}/studio/editor/hvac-01`;

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

/** Reads the editor's own state out of the DOM rather than from React. */
async function readState(page) {
  return page.evaluate(() => {
    const timecode = document.querySelector(
      'section[aria-label="Timeline"]',
    );
    const clips = [...document.querySelectorAll('[aria-label*="seconds"]')].map(
      (el) => ({
        label: el.getAttribute("aria-label"),
        left: Math.round(parseFloat(getComputedStyle(el).left)),
        width: Math.round(parseFloat(getComputedStyle(el).width)),
        selected: el.getAttribute("aria-pressed") === "true",
      }),
    );
    // The PLAYHEAD timecode specifically. Matching the first dd:dd.dd in the
    // body text finds the header's TOTAL duration instead, which never moves —
    // so every playback assertion would pass or fail for the wrong reason.
    const tc = document.querySelector('[data-testid="ve-playhead-timecode"]');
    return {
      clipCount: clips.length,
      clips,
      timecode: tc ? tc.textContent.trim() : null,
      hasTimeline: Boolean(timecode),
    };
  });
}

/** Bounding box of the nth clip on the VIDEO 1 track. */
async function videoClip(page, index) {
  const el = page.locator('[aria-label*="seconds"]').nth(index);
  const box = await el.boundingBox();
  assert(box, `clip ${index} has no box`);
  return { el, box };
}

/**
 * The first clip wide enough to grab AND fully inside the viewport.
 *
 * The timeline scrolls horizontally, so `boundingBox()` happily returns
 * coordinates past the right edge of the window — clicking those is a no-op
 * that looks exactly like a broken feature. Every gesture assertion has to
 * start from a clip that is actually on screen.
 */
async function onscreenClip(page, minWidthPx = 200, trackKind = null) {
  const viewport = page.viewportSize();
  const selector = trackKind
    ? `[aria-label*="seconds"][data-track-kind="${trackKind}"]`
    : '[aria-label*="seconds"]';
  const count = await page.locator(selector).count();
  for (let i = 0; i < count; i += 1) {
    const el = page.locator(selector).nth(i);
    const box = await el.boundingBox();
    if (!box) continue;
    if (
      box.width >= minWidthPx &&
      box.x >= 140 &&
      box.x + box.width <= viewport.width - 8 &&
      box.y > 0 &&
      box.y + box.height <= viewport.height
    ) {
      return { el, box, index: i };
    }
  }
  throw new Error("no clip is both wide enough and fully on screen");
}

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: ".playwright/founder-auth.json",
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

process.stdout.write("\nEditor loads\n");

await page.goto(URL_EDITOR, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForLoadState("networkidle", { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(900);

// Start from a clean slate so a previous run's autosave cannot mask a defect.
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);

await check("1. editor route opens without redirect", async () => {
  assert(
    page.url().includes("/studio/editor/hvac-01"),
    `landed on ${page.url()}`,
  );
});

await check("2. EP01 project loads with its real title", async () => {
  const text = await page.locator("header").innerText();
  assert(/How the HVAC cycle works/i.test(text), `header says: ${text}`);
});

await check("3. media browser shows project assets", async () => {
  const count = await page
    .locator('aside[aria-label="Media browser"] button')
    .count();
  assert(count >= 20, `only ${count} media entries`);
});

await check("4. timeline and all eight tracks render", async () => {
  const timeline = await page.locator('section[aria-label="Timeline"]').count();
  assert(timeline === 1, "no timeline");
  const text = await page.locator('section[aria-label="Timeline"]').innerText();
  for (const track of [
    "VIDEO 1",
    "OVERLAY",
    "GRAPHICS",
    "TEXT",
    "CAPTIONS",
    "VOICEOVER",
    "MUSIC",
    "SFX",
  ]) {
    assert(text.includes(track), `missing track ${track}`);
  }
});

await check("5. clips are positioned by TIME, not by order", async () => {
  const state = await readState(page);
  assert(state.clipCount > 50, `only ${state.clipCount} clips`);
  // The first video clip is 10802ms at 60px/s => ~648px wide, starting at 0.
  const first = state.clips[0];
  assert(first.left === 0, `first clip starts at ${first.left}px, expected 0`);
  assert(
    Math.abs(first.width - 648) < 12,
    `first clip is ${first.width}px, expected ~648 (10.802s x 60px/s)`,
  );
  // A later clip must start further right — proof that x encodes start time.
  const laterLefts = state.clips.map((c) => c.left);
  assert(
    Math.max(...laterLefts) > 1000,
    "no clip is far right; x does not encode time",
  );
});

process.stdout.write("\nPlayback\n");

await check("6. Space plays and the playhead advances", async () => {
  const before = (await readState(page)).timecode;
  await page.locator("body").click({ position: { x: 800, y: 300 } });
  await page.keyboard.press("Space");
  await page.waitForTimeout(900);
  const during = (await readState(page)).timecode;
  await page.keyboard.press("Space");
  assert(before === "00:00.00", `started at ${before}`);
  assert(during !== before, `timecode did not move (${before} -> ${during})`);
});

await check("7. the preview changes with the playhead", async () => {
  await page.keyboard.press("Home");
  await page.waitForTimeout(200);
  const canvasFrame = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="ve-canvas"]');
      if (!canvas) return "no-canvas";
      // The painted layer, not a browser thumbnail elsewhere on the page.
      return [...canvas.children]
        .map((c) => c.getAttribute("style") ?? "")
        .join("|");
    });
  const atZero = await canvasFrame();
  // Seek deep into the episode, past several cuts.
  for (let i = 0; i < 40; i += 1) await page.keyboard.press("Shift+ArrowRight");
  await page.waitForTimeout(300);
  const later = await canvasFrame();
  assert(atZero !== "no-canvas", "canvas did not render");
  assert(atZero !== later, "preview frame did not change after seeking 40s");
});

await check("8. arrow keys step one frame", async () => {
  await page.keyboard.press("Home");
  await page.waitForTimeout(150);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  const tc = (await readState(page)).timecode;
  assert(tc === "00:00.03", `one frame at 30fps should be 00:00.03, got ${tc}`);
});

process.stdout.write("\nEditing\n");

await check("9. a clip can be selected", async () => {
  const { el } = await videoClip(page, 0);
  await el.click({ position: { x: 60, y: 20 } });
  await page.waitForTimeout(200);
  const state = await readState(page);
  assert(state.clips[0].selected, "first clip did not become selected");
});

await check("10. the inspector shows the selected clip", async () => {
  const text = await page.locator('aside[aria-label="Inspector"]').innerText();
  assert(/timing/i.test(text), "inspector has no Timing section");
  assert(/duration/i.test(text), "inspector has no Duration row");
});

await check("11. a clip can be dragged, and its start changes", async () => {
  const { box } = await videoClip(page, 1);
  const before = (await readState(page)).clips[1].left;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = (await readState(page)).clips[1].left;
  assert(after > before, `clip did not move right (${before} -> ${after})`);
});

await check("12. a clip can be trimmed by its right edge", async () => {
  const { box } = await videoClip(page, 0);
  const before = (await readState(page)).clips[0].width;
  await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 3 - 100, box.y + box.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = (await readState(page)).clips[0].width;
  assert(after < before, `clip did not shrink (${before} -> ${after})`);
});

await check("13. Ctrl+B splits the selected clip at the playhead", async () => {
  const before = (await readState(page)).clipCount;
  const { el, box, index } = await onscreenClip(page, 240);

  // Scrub the ruler to this clip's midpoint. Both coordinates must be on
  // screen: the timeline scrolls, so an off-screen click is silently a no-op.
  const ruler = await page.locator('[data-testid="ve-ruler"]').boundingBox();
  assert(ruler, "no ruler");
  await page.mouse.click(box.x + box.width / 2, ruler.y + ruler.height / 2);
  await page.waitForTimeout(250);

  const moved = (await readState(page)).timecode;
  assert(moved !== "00:00.00", `ruler scrub did not move the playhead (${moved})`);

  await el.click({ position: { x: 24, y: 14 } });
  await page.waitForTimeout(200);
  assert(
    (await readState(page)).clips[index].selected,
    "target clip is not selected before split",
  );

  await page.keyboard.press("Control+b");
  await page.waitForTimeout(350);
  const after = (await readState(page)).clipCount;
  assert(after === before + 1, `clip count ${before} -> ${after}, expected +1`);
});

await check("14. Ctrl+Z undoes the split", async () => {
  const before = (await readState(page)).clipCount;
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const after = (await readState(page)).clipCount;
  assert(after === before - 1, `undo did not remove a clip (${before} -> ${after})`);
});

await check("15. Ctrl+Shift+Z redoes it", async () => {
  const before = (await readState(page)).clipCount;
  await page.keyboard.press("Control+Shift+z");
  await page.waitForTimeout(300);
  const after = (await readState(page)).clipCount;
  assert(after === before + 1, `redo did not restore (${before} -> ${after})`);
});

await check("16. Delete removes the selected clip", async () => {
  const { el } = await videoClip(page, 0);
  await el.click({ position: { x: 20, y: 20 } });
  const before = (await readState(page)).clipCount;
  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);
  const after = (await readState(page)).clipCount;
  assert(after === before - 1, `delete did nothing (${before} -> ${after})`);
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(250);
});

await check("17. the inspector writes back to the clip", async () => {
  const { el } = await videoClip(page, 2);
  await el.click({ position: { x: 20, y: 20 } });
  await page.waitForTimeout(200);
  const field = page
    .locator('aside[aria-label="Inspector"] input[type="number"]')
    .nth(1); // Duration (ms)
  await field.fill("2000");
  await field.press("Tab");
  await page.waitForTimeout(300);
  const width = (await readState(page)).clips[2].width;
  // 2000ms at 60px/s = 120px.
  assert(
    Math.abs(width - 120) < 8,
    `duration edit did not resize the clip (width ${width}px, expected ~120)`,
  );
});

process.stdout.write("\nPersistence\n");

await check("18. edits survive a reload", async () => {
  const before = (await readState(page)).clipCount;
  // Autosave is debounced; give it room plus a margin.
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const after = (await readState(page)).clipCount;
  assert(
    after === before,
    `clip count changed across reload (${before} -> ${after})`,
  );
  const notice = await page.locator("body").innerText();
  assert(
    /Restored your unsaved edit/i.test(notice),
    "no restore notice shown after reload",
  );
});

process.stdout.write("\nIntegrity\n");

await check("19. no uncaught page errors during the whole run", async () => {
  assert(
    pageErrors.length === 0,
    `page errors:\n${pageErrors.slice(0, 4).join("\n")}`,
  );
});

await check("20. track mute/hide toggles are wired", async () => {
  const button = page
    .locator('section[aria-label="Timeline"] button[title="Hide track"]')
    .first();

  const hiddenNow = () =>
    page.evaluate(() => {
      const raw = window.localStorage.getItem("altair.editor.project.hvac-01");
      if (!raw) return null;
      return (
        JSON.parse(raw).project.tracks.find((t) => t.id === "t-video")?.hidden ??
        false
      );
    });

  await button.click();
  await page.waitForTimeout(900); // let autosave land
  assert((await hiddenNow()) === true, "hiding the track did not reach state");

  // Restore. A test that leaves VIDEO 1 hidden makes every later canvas
  // assertion fail for a reason that has nothing to do with the canvas —
  // which is exactly what happened before this line existed.
  await button.click();
  await page.waitForTimeout(900);
  assert((await hiddenNow()) === false, "unhiding the track did not reach state");
});

process.stdout.write("\nAudio\n");

await check("21. narration audio is served and pooled", async () => {
  const res = await page.evaluate(async () => {
    const r = await fetch("/studio/hvac-01/audio/narration-000.m4a", {
      method: "HEAD",
    });
    return { status: r.status, type: r.headers.get("content-type") };
  });
  assert(res.status === 200, `audio HEAD returned ${res.status}`);
  assert(/audio/.test(res.type ?? ""), `unexpected content-type ${res.type}`);
  const pool = await page
    .locator('[data-testid="ve-audio-pool"] audio')
    .count();
  assert(pool >= 19, `only ${pool} narration elements pooled`);
});

await check("22. playback actually sounds, and the right clip", async () => {
  await page.keyboard.press("Home");
  await page.locator("body").click({ position: { x: 800, y: 300 } });
  await page.keyboard.press("Space");
  await page.waitForTimeout(1400);
  const playing = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="ve-audio-pool"] audio')]
      .filter((a) => !a.paused)
      .map((a) => a.dataset.clipId),
  );
  await page.keyboard.press("Space");
  assert(playing.length === 1, `${playing.length} clips sounding, expected 1`);
  assert(
    playing[0] === "vo-hook-1",
    `wrong clip at t=0: ${playing[0]}`,
  );
});

await check("23. mute silences everything", async () => {
  await page.keyboard.press("Home");
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  await page.keyboard.press("m");
  await page.waitForTimeout(400);
  const stillPlaying = await page.evaluate(
    () =>
      [...document.querySelectorAll('[data-testid="ve-audio-pool"] audio')]
        .filter((a) => !a.paused).length,
  );
  await page.keyboard.press("m");
  await page.keyboard.press("Space");
  assert(stillPlaying === 0, `${stillPlaying} clips still sounding after mute`);
});

process.stdout.write("\nCanvas\n");

/** Inspector number inputs, in DOM order. */
const inspectorNumbers = () =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'aside[aria-label="Inspector"] input[type=number]',
      ),
    ].map((i) => i.value),
  );

/**
 * Selects an on-screen clip AND puts the playhead inside it.
 *
 * Canvas handles only render for a clip that is visible at the current time —
 * manipulating something you cannot see would move it with no feedback. So a
 * canvas test has to seek into the clip, not just select it. Earlier tests in
 * this run have moved and trimmed clips, so "the first clip" is not reliably
 * the clip at t=0.
 */
async function selectAndSeekInto(page) {
  // Reset the horizontal scroll first. By this point earlier tests have moved
  // and split clips and the timeline may be scrolled, and every screen-position
  // calculation below silently means something different when it is.
  await page.evaluate(() => {
    const scroller = document
      .querySelector('section[aria-label="Timeline"]')
      ?.querySelector(".overflow-auto");
    if (scroller) scroller.scrollLeft = 0;
  });
  await page.waitForTimeout(200);

  // VIDEO specifically: captions and narration also match the clip selector,
  // and neither is manipulable on the canvas — a caption is pinned to the lower
  // third and audio has no picture at all.
  const geometry = await page.evaluate(() => {
    const clips = [
      ...document.querySelectorAll(
        '[aria-label*="seconds"][data-track-kind="video"]',
      ),
    ];
    return clips.map((el, index) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        index,
        left: parseFloat(style.left),
        width: parseFloat(style.width),
        screenX: box.x,
        screenY: box.y,
        screenW: box.width,
      };
    });
  });

  const viewport = page.viewportSize();
  const target = geometry.find(
    (g) =>
      g.width >= 240 &&
      g.screenX >= 140 &&
      g.screenX + g.screenW <= viewport.width - 8 &&
      g.screenY > 0 &&
      g.screenY + 40 <= viewport.height,
  );
  assert(target, "no on-screen video clip wide enough to manipulate");

  // Click the ruler at the clip's own horizontal midpoint on screen, so the
  // playhead lands inside it whatever the timeline has been through.
  const ruler = await page.locator('[data-testid="ve-ruler"]').boundingBox();
  await page.mouse.click(
    target.screenX + target.screenW / 2,
    ruler.y + ruler.height / 2,
  );
  await page.waitForTimeout(250);

  const el = page
    .locator('[aria-label*="seconds"][data-track-kind="video"]')
    .nth(target.index);
  await el.click({ position: { x: 24, y: 14 } });
  await page.waitForTimeout(350);
  return { el, index: target.index };
}

await check("24. selecting a visible clip shows canvas handles", async () => {
  const { el } = await selectAndSeekInto(page);
  const count = await page
    .locator('[data-testid="ve-canvas-selection"]')
    .count();
  if (count !== 1) {
    const diag = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="ve-canvas"]');
      const raw = window.localStorage.getItem("altair.editor.project.hvac-01");
      const project = raw ? JSON.parse(raw).project : null;
      const selectedLabel = document
        .querySelector('[aria-pressed="true"][aria-label*="seconds"]')
        ?.getAttribute("aria-label");
      const name = selectedLabel ? selectedLabel.split(",")[0] : null;
      const found = project
        ? project.tracks
            .flatMap((t) => t.clips.map((c) => ({ ...c, trackId: t.id })))
            .filter((c) => c.label === name)
            .map((c) => ({
              id: c.id,
              track: c.trackId,
              startMs: c.startMs,
              durationMs: c.durationMs,
            }))
        : null;
      return {
        canvasChildren: canvas ? canvas.children.length : -1,
        playhead: document.querySelector('[data-testid="ve-playhead-timecode"]')
          ?.textContent,
        selectedName: name,
        clipRows: found,
      };
    });
    throw new Error(
      `no selection frame. clip=${await el.getAttribute("aria-label")} ${JSON.stringify(diag)}`,
    );
  }
  for (const handle of ["nw", "ne", "se", "sw"]) {
    assert(
      (await page.locator(`[data-testid="ve-handle-${handle}"]`).count()) === 1,
      `missing ${handle} handle`,
    );
  }
});

await check("25. dragging on the canvas writes position to the project", async () => {
  const before = await inspectorNumbers();
  const box = await page
    .locator('[data-testid="ve-canvas-selection"]')
    .boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await inspectorNumbers();
  assert(
    JSON.stringify(before) !== JSON.stringify(after),
    "canvas drag did not reach the inspector",
  );
  // Screen delta / stage scale, so the stored value must EXCEED the pixels moved.
  const positionX = Number(after[2]);
  assert(
    positionX > 80,
    `position ${positionX} was not scaled from screen to project pixels`,
  );
});

await check("26. a canvas handle scales the clip", async () => {
  // Put the clip back to centre first. Test 25 translated it, which pushes the
  // south-east handle past the canvas edge — and the canvas clips, so the
  // handle becomes unhittable. This also proves the inspector writes back to
  // the canvas, not only the other way round.
  const positionX = page
    .locator('aside[aria-label="Inspector"] input[type=number]')
    .nth(2);
  await positionX.fill("0");
  await positionX.press("Tab");
  await page.waitForTimeout(400);

  const ranges = () =>
    page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'aside[aria-label="Inspector"] input[type=range]',
        ),
      ].map((i) => i.value),
    );
  const before = await ranges();
  const handle = await page
    .locator('[data-testid="ve-handle-se"]')
    .boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) {
    await page.mouse.move(
      handle.x + handle.width / 2 + i * 10,
      handle.y + handle.height / 2 + i * 10,
    );
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await ranges();
  assert(
    Number(after[0]) > Number(before[0]),
    `scale did not increase (${before[0]} -> ${after[0]})`,
  );
});

await check("27. a canvas transform is undoable", async () => {
  await page.locator("body").click({ position: { x: 800, y: 960 } });
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(350);
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(350);
  // Undo clears selection, so the inspector falls back to project properties.
  const text = await page.locator('aside[aria-label="Inspector"]').innerText();
  assert(/project/i.test(text), "undo did not return the inspector to project");
});

process.stdout.write("\nApproval and learning\n");

await check("28. approve captures a diff from the generated draft", async () => {
  // Make one unmistakable edit first.
  const { el } = await onscreenClip(page, 240);
  await el.click({ position: { x: 24, y: 14 } });
  await page.waitForTimeout(250);
  const duration = page
    .locator('aside[aria-label="Inspector"] input[type=number]')
    .nth(1);
  await duration.fill("2500");
  await duration.press("Tab");
  await page.waitForTimeout(400);

  await page.locator('[data-testid="ve-approve"]').click();
  await page.waitForTimeout(600);

  const notice = await page.locator("body").innerText();
  assert(
    /Approved —/.test(notice),
    "no approval confirmation shown",
  );
  assert(
    /captured for learning/.test(notice),
    `confirmation did not mention capture: ${notice.slice(0, 160)}`,
  );
});

await check("29. the session stores both snapshots, draft intact", async () => {
  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem("altair.editor.sessions");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const s = parsed.sessions[parsed.sessions.length - 1];
    return {
      hasGenerated: Boolean(s.generatedProjectSnapshot),
      hasApproved: Boolean(s.approvedProjectSnapshot),
      generatedBy: s.generatedBy,
      events: s.events.length,
      generatedClipCount: s.generatedProjectSnapshot.tracks.reduce(
        (n, t) => n + t.clips.length,
        0,
      ),
    };
  });
  assert(stored, "no session was stored");
  assert(stored.hasGenerated && stored.hasApproved, "a snapshot is missing");
  assert(
    stored.generatedBy === "slide-system/render-episode",
    `draft author not recorded: ${stored.generatedBy}`,
  );
  assert(stored.events > 0, "no edit events captured");
  assert(
    stored.generatedClipCount === 63,
    `the generated draft was mutated: ${stored.generatedClipCount} clips, expected 63`,
  );
});

await check("30. unimplemented tools are disabled, not fake", async () => {
  for (const label of ["Images", "Effects", "Animate"]) {
    const disabled = await page
      .locator(`nav[aria-label="Editor tools"] button:has-text("${label}")`)
      .isDisabled();
    assert(disabled, `${label} is not disabled`);
  }
  for (const label of ["Media", "Text", "Captions"]) {
    const disabled = await page
      .locator(`nav[aria-label="Editor tools"] button:has-text("${label}")`)
      .isDisabled();
    assert(!disabled, `${label} should be enabled`);
  }
});

await browser.close();

process.stdout.write(
  `\n${checks - failures}/${checks} interaction checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures ? 1 : 0);
