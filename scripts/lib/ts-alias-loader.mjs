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

/**
 * Specifiers that only exist inside Next's runtime or bundler.
 *
 * server-only and client-only are build-time guards with no runtime behaviour.
 * next/headers is different: it is real, and a verifier genuinely has no request
 * context. Its stub therefore THROWS on use rather than returning something
 * empty — a verifier is meant to inject its own client, and code that falls
 * through to the cookie-scoped one is exercising a path that cannot work in the
 * context being tested. That is the 4F defect exactly, so it must fail loudly.
 */
const STUBBED = new Map([
  ["server-only", "empty-module.mjs"],
  ["client-only", "empty-module.mjs"],
  ["next/headers", "next-headers-stub.mjs"],
]);

export async function resolve(specifier, context, nextResolve) {
  const stub = STUBBED.get(specifier);
  if (stub) {
    return nextResolve(pathToFileURL(join(ROOT, "scripts", "lib", stub)).href, context);
  }

  // Relative imports inside TypeScript sources omit the extension. Node's
  // type stripping requires one, so the same lookup is applied to them.
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentPath = context.parentURL?.startsWith("file:")
      ? fileURLToPath(context.parentURL)
      : null;
    if (parentPath) {
      const base = join(dirname(parentPath), specifier);
      for (const suffix of CANDIDATE_SUFFIXES) {
        const candidate = base + suffix;
        if (suffix && existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
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
