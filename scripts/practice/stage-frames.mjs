/**
 * Put a project's pictures where the render pipeline looks for them.
 *
 * ==================== THE TWO PLACES, AND WHY THERE ARE TWO ====================
 * A compiled timeline reaches the compositor by one of two routes, and they do
 * not read the same directory:
 *
 *   NOT BAKED  a clip with no transform and no text is composited straight from
 *              the render master, `slides-<stem>/<assetId>.png`.
 *
 *   BAKED      a clip carrying a transform (a push-in, a drift) is first
 *              flattened to a still by `bake-editor-scenes.mjs`, which resolves
 *              its picture from the WEB APP'S public tree —
 *              `public/studio/<stem>/<assetId>.jpg` — deliberately, so the bake
 *              composites the same pixels the operator approved on screen.
 *
 * Staging only the first is how half a film ends up reading `missing:` in the
 * render while the other half looks right: exactly the clips someone chose to
 * move are the clips that disappear. So both are written here, from one source
 * image, in one pass.
 *
 * ==================== WHY THE PUBLIC COPY IS FULL SIZE ====================
 * The editor's preview and the bake read the same file, so its resolution is
 * the render's resolution. A 640-wide preview frame upscaled into a 1920-wide
 * output is visibly soft, and only on the clips that move — which reads as a
 * defect in the camera move rather than in the frame it was given.
 *
 * ==================== WHY THIS IS SHARED ====================
 * The build stages what curation chose. The render stages what the TIMELINE
 * actually references, which after an operator swaps a clip's asset in the
 * library panel is no longer the same set. Both call this, so a photograph
 * dropped in at 2am renders at 2:01 without anyone rebuilding the episode.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

/** Index the librarian writes: assetId -> path inside the library tree. */
export function readLibraryPaths(libRoot) {
  const index = JSON.parse(readFileSync(`${libRoot}/library-index.json`, "utf8"));
  return new Map(index.map((e) => [e.assetId, `${libRoot}/${e.altairLibraryPath}`]));
}

/**
 * Stage every asset id that does not already have both frames.
 *
 * Source photographs are 3:2; the render frame is 16:9. The crop happens once,
 * here, so the master and the public copy are the same pixels rather than two
 * independent interpretations of "fit this picture into a wider frame".
 */
export function stageAssets({ assetIds, libRoot, slidesOut, pubOut, log = () => {} }) {
  mkdirSync(slidesOut, { recursive: true });
  mkdirSync(pubOut, { recursive: true });

  const pathOf = readLibraryPaths(libRoot);
  const staged = [];
  const missing = [];

  for (const assetId of new Set(assetIds)) {
    if (!assetId) continue;
    const png = `${slidesOut}/${assetId}.png`;
    const jpg = `${pubOut}/${assetId}.jpg`;
    if (existsSync(png) && existsSync(jpg)) continue;

    const src = pathOf.get(assetId);
    if (!src || !existsSync(src)) {
      missing.push(assetId);
      continue;
    }

    const scale = "scale=1920:1280:force_original_aspect_ratio=increase,crop=1920:1080";
    if (!existsSync(png)) {
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-vf", scale, png], {
        stdio: ["ignore", "ignore", "pipe"],
      });
    }
    if (!existsSync(jpg)) {
      execFileSync(
        "ffmpeg",
        ["-y", "-loglevel", "error", "-i", src, "-vf", scale, "-q:v", "4", jpg],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
    }
    staged.push(assetId);
  }

  if (staged.length > 0) log(`staged ${String(staged.length)} asset(s) -> master + public frame`);
  if (missing.length > 0) log(`NOT IN THE LIBRARY INDEX: ${missing.join(", ")}`);
  return { staged, missing };
}

/**
 * Every asset id a compiled job will ask the compositor for.
 *
 * Both routes are read, because a clip that moved is in the bake plan and a
 * clip that did not is in the timeline, and the point of staging is that
 * neither can come up empty.
 */
export function assetIdsInJob({ timeline, bakePlan }) {
  const ids = [];
  for (const entry of timeline?.entries ?? []) {
    // An unbaked entry names its frame stem directly; a baked one names the
    // still the bake is about to produce, and the picture behind it is in the
    // bake plan instead.
    const p = entry.screenshotPath;
    if (typeof p === "string" && !/^baked-\d+\.png$/.test(p)) {
      ids.push(p.replace(/\.[a-z0-9]+$/i, ""));
    }
  }
  for (const scene of bakePlan?.scenes ?? []) {
    for (const layer of scene.layers ?? []) {
      if (typeof layer.assetId === "string") ids.push(layer.assetId);
    }
  }
  return [...new Set(ids)];
}
