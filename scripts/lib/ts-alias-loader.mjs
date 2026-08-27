/**
 * Module resolve hook that teaches plain Node the `@/*` path alias.
 *
 * ===================== WHY =====================
 * The differential tests in scripts/ compare SQL predicates against the
 * TypeScript predicates they replace. The only version of a predicate worth
 * comparing against is the one that actually ships — a re-implementation in the
 * test proves the test agrees with itself.
 *
 * Node 24 can execute TypeScript directly with --experimental-strip-types, but
 * it does not know tsconfig's paths, so `@/shared/types/customer` fails to
 * resolve. This maps it to the repository root and fills in the extension the
 * source omits.
 *
 * Used as:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/<verifier>.mjs
 */
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** Bundler-only guards with no runtime meaning outside Next. */
const STUBBED = new Set(["server-only", "client-only"]);

export async function resolve(specifier, context, nextResolve) {
  if (STUBBED.has(specifier)) {
    return nextResolve(
      pathToFileURL(join(ROOT, "scripts", "lib", "empty-module.mjs")).href,
      context,
    );
  }

  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context);
  }

  const base = join(ROOT, specifier.slice(2));
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = base + suffix;
    if (existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  // Fall through so the failure names the specifier rather than this hook.
  return nextResolve(specifier, context);
}
