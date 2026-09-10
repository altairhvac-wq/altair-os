/**
 * Resolves the `@/*` tsconfig alias for Node's native TypeScript loader.
 *
 * Node 24 executes `.ts` directly (type stripping), which is what lets the
 * editor's pure logic be verified as the real shipped modules rather than as a
 * re-typed model. What Node does NOT do is read `tsconfig.json` paths, so
 * `@/shared/types/video-editor` fails to resolve and every import in the tree
 * below the entry point dies with ERR_MODULE_NOT_FOUND.
 *
 * This hook maps `@/x` to `<repo root>/x` and tries the extensions the repo
 * actually uses, in the same order the bundler would.
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * `fileURLToPath`, not `new URL(...).pathname` — on Windows the latter yields
 * `/C:/Users/...`, which `path.resolve` then treats as a relative segment and
 * turns into `C:\C:\Users\...`.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXTENSIONS = ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"];

/** First existing file among `base + ext`, or null. */
function firstExisting(base) {
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(REPO_ROOT, specifier.slice(2));
    const hit = firstExisting(base);
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
    // Say which alias failed and where it looked. A bare ERR_MODULE_NOT_FOUND
    // sends you hunting for a missing package that does not exist.
    throw new Error(
      `alias hook could not resolve ${specifier} — looked for ${base}{${EXTENSIONS.filter(Boolean).join(",")}}`,
    );
  }

  // Relative EXTENSIONLESS imports (`./history`). TypeScript's bundler
  // resolution permits them and the repo uses them; Node ESM requires an
  // extension. Try Node first so anything already valid is untouched, and only
  // fall back to extension probing when it genuinely cannot resolve.
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND" || !context.parentURL) throw error;
      const base = path.resolve(
        path.dirname(fileURLToPath(context.parentURL)),
        specifier,
      );
      const hit = firstExisting(base);
      if (hit) return nextResolve(pathToFileURL(hit).href, context);
      throw error;
    }
  }

  return nextResolve(specifier, context);
}
