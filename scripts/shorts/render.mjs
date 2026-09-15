/**
 * Render a Short to MP4.
 *
 * Frames are produced by a real browser canvas — the same code path the editor
 * will eventually run — captured one by one, and handed to ffmpeg. Each frame
 * is a pure function of its index, so a crashed render resumes and an extracted
 * frame is the frame that shipped, not a re-simulation of it.
 *
 *   node scripts/shorts/render.mjs --short recip-what-happens --version v1
 *   node scripts/shorts/render.mjs --short recip-what-happens --version v1 --frames 0,120,300
 */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const exec = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(HERE, "../../ui-audit/shorts");

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);

const SHORT = arg("short", "recip-what-happens");
const VERSION = arg("version", "v1");
const ONLY = arg("frames", null);

const MIME = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".css": "text/css",
};

async function serve() {
  const server = createServer(async (req, res) => {
    const rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const file = path.join(HERE, rel === "/" ? "page.html" : rel);
    if (!file.startsWith(HERE)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}

/**
 * Attach a narration track to an already-rendered picture.
 *
 * Re-rendering 678 frames to add audio would be eight wasted minutes, and the
 * frames are identical by construction anyway — that is the point of making
 * every frame a pure function of its index.
 */
async function muxOnly() {
  const dir = path.join(OUT_ROOT, SHORT, VERSION);
  const mp4 = path.join(dir, `${SHORT}-${VERSION}.mp4`);
  const audio = path.join(dir, "narration.m4a");
  const tmp = path.join(dir, `.${SHORT}-${VERSION}.mux.mp4`);
  if (!existsSync(mp4)) throw new Error(`no picture to mux: ${mp4}`);
  if (!existsSync(audio)) throw new Error(`no narration: ${audio} (run narrate.mjs)`);
  await exec("ffmpeg", [
    "-y", "-i", mp4, "-i", audio,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart", "-shortest", tmp,
  ], { maxBuffer: 1 << 28 });
  await rm(mp4, { force: true });
  await exec("cmd", ["/c", "move", "/y", tmp, mp4]);
  process.stdout.write(`muxed narration into ${mp4}
`);
}

/**
 * Render the Short's cover still to <outDir>/cover.png. The spec must carry
 * a `cover` block (generated from the mechanism's preset framing plus the
 * plan's 2-5 cover words); a Short without one is refused rather than
 * shipped with an accidental frame as its face.
 */
async function coverOnly() {
  const { server, port } = await serve();
  const outDir = path.join(OUT_ROOT, SHORT, VERSION);
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    args: ["--force-color-profile=srgb", "--disable-lcd-text", "--font-render-hinting=none"],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(`http://127.0.0.1:${port}/page.html?short=${SHORT}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.READY === true, { timeout: 30000 });
  const drew = await page.evaluate(() => window.renderCover());
  if (errors.length || !drew) {
    process.stderr.write(errors.length ? `page errors:\n  ${errors.join("\n  ")}\n` : "REFUSED: spec has no cover block.\n");
    await browser.close();
    server.close();
    process.exit(drew ? 1 : 2);
  }
  const coverPath = path.join(outDir, "cover.png");
  await page.locator("#c").screenshot({ path: coverPath });
  await browser.close();
  server.close();
  process.stdout.write(`cover: ${coverPath}\n`);
}

async function main() {
  if (has("mux-only")) {
    await muxOnly();
    return;
  }
  if (has("cover")) {
    await coverOnly();
    return;
  }
  const { server, port } = await serve();
  const outDir = path.join(OUT_ROOT, SHORT, VERSION);
  const frameDir = path.join(outDir, "frames");
  await mkdir(frameDir, { recursive: true });

  const browser = await chromium.launch({
    args: ["--force-color-profile=srgb", "--disable-lcd-text", "--font-render-hinting=none"],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(`http://127.0.0.1:${port}/page.html?short=${SHORT}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.READY === true, { timeout: 30000 });
  if (errors.length) {
    process.stderr.write(`page errors:\n  ${errors.join("\n  ")}\n`);
    await browser.close();
    server.close();
    process.exit(1);
  }

  const meta = await page.evaluate(() => window.SHORT);
  process.stdout.write(`${meta.id} — ${meta.frames} frames @ ${meta.fps}fps (${(meta.totalMs / 1000).toFixed(2)}s)\n`);

  // The mechanical audit travels with the render; it is how accuracy is
  // checked without squinting at pictures.
  const audit = await page.evaluate(() => window.audit());
  await writeFile(path.join(outDir, "audit.json"), JSON.stringify(audit), "utf8");
  const violation = audit.find((r) => r.sv && r.dv);
  if (violation) {
    process.stderr.write(`REFUSED: both valves open at frame ${violation.i} (${violation.phase})\n`);
    await browser.close();
    server.close();
    process.exit(2);
  }
  // Evaporator narrative-state gates (rows carry win/frost only when the
  // mechanism reports them; other mechanisms sail through untouched):
  // the pre-frost window may never show ice, and ice may never shrink while
  // the freezing window is growing it. The evaporator's analog of the
  // both-valves-open rule — the picture cannot contradict the story beat.
  const frostRewind = audit.find((r) => r.win === 1 && r.frost > 0.02);
  if (frostRewind) {
    process.stderr.write(`REFUSED: frost visible during the pre-frost window at frame ${frostRewind.i} (frost=${frostRewind.frost})\n`);
    await browser.close();
    server.close();
    process.exit(2);
  }
  let prevFrost = null;
  for (const r of audit) {
    if (r.win === 2 && r.frost !== undefined) {
      if (prevFrost !== null && r.frost < prevFrost - 0.001) {
        process.stderr.write(`REFUSED: frost shrank mid-freeze at frame ${r.i} (${prevFrost} -> ${r.frost})\n`);
        await browser.close();
        server.close();
        process.exit(2);
      }
      prevFrost = r.frost;
    } else {
      prevFrost = null;
    }
  }
  // TXV narrative gates: the opens window may only lift the needle, the
  // closes window may only drop it (rows carry pin only on that scene).
  let prevPin = null;
  for (const r of audit) {
    if (r.pin !== undefined && prevPin !== null && prevPin.win === r.win) {
      if (r.win === 2 && r.pin < prevPin.pin - 0.002) {
        process.stderr.write(`REFUSED: needle dropped during the opens window at frame ${r.i}\n`);
        await browser.close();
        server.close();
        process.exit(2);
      }
      if (r.win === 3 && r.pin > prevPin.pin + 0.002) {
        process.stderr.write(`REFUSED: needle lifted during the closes window at frame ${r.i}\n`);
        await browser.close();
        server.close();
        process.exit(2);
      }
    }
    prevPin = r.pin === undefined ? null : { win: r.win, pin: r.pin };
  }
  // Superheat readout gate: the displayed figure must BE the subtraction.
  const shViolation = audit.find(
    (r) => r.sh !== undefined && Math.abs(r.sh - (r.lineC - r.satC)) > 0.05,
  );
  if (shViolation) {
    process.stderr.write(`REFUSED: superheat readout disagrees with its inputs at frame ${shViolation.i}\n`);
    await browser.close();
    server.close();
    process.exit(2);
  }

  const canvas = page.locator("#c");
  const list = ONLY
    ? ONLY.split(",").map((n) => Number(n.trim()))
    : Array.from({ length: meta.frames }, (_, i) => i);

  const t0 = Date.now();
  for (const i of list) {
    await page.evaluate((n) => window.renderFrame(n), i);
    await canvas.screenshot({ path: path.join(frameDir, `f${String(i).padStart(5, "0")}.png`) });
    if (i % 60 === 0 || i === list[list.length - 1]) {
      const done = list.indexOf(i) + 1;
      const rate = done / ((Date.now() - t0) / 1000);
      process.stdout.write(
        `  frame ${done}/${list.length}  ${rate.toFixed(1)} fps  eta ${Math.round((list.length - done) / rate)}s\n`,
      );
    }
  }
  if (errors.length) process.stderr.write(`page errors during render:\n  ${errors.join("\n  ")}\n`);
  await browser.close();
  server.close();

  if (ONLY) {
    process.stdout.write(`frames only: ${frameDir}\n`);
    return;
  }

  const mp4 = path.join(outDir, `${SHORT}-${VERSION}.mp4`);
  const audio = path.join(outDir, "narration.m4a");
  const hasAudio = existsSync(audio);
  const args = [
    "-y",
    "-framerate",
    String(meta.fps),
    "-i",
    path.join(frameDir, "f%05d.png"),
    ...(hasAudio ? ["-i", audio] : []),
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "17",
    "-preset",
    "slow",
    "-movflags",
    "+faststart",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
    mp4,
  ];
  await exec("ffmpeg", args, { maxBuffer: 1 << 28 });
  process.stdout.write(`\nMP4: ${mp4}${hasAudio ? " (with narration)" : " (silent)"}\n`);

  if (has("keep-frames")) return;
  await rm(frameDir, { recursive: true, force: true });
}

main().catch((e) => {
  process.stderr.write(`${e.stack ?? e}\n`);
  process.exit(1);
});
