/**
 * Load a server-side query module for BEHAVIOURAL testing, with only its
 * database client replaced.
 *
 * ==================== WHY NOT loadPureModule ====================
 * `load-pure-module.mjs` exists to prove a module is pure and to import it as
 * itself. A query module is deliberately impure: it imports `server-only` and
 * a Supabase service client. Those two are the ONLY things swapped here — a
 * marker with no runtime behaviour, and the client, which is the seam the fake
 * PostgREST plugs into. Every other dependency (`@/shared/types/*`,
 * `@/lib/database/errors`) is emitted from the real source and imported for
 * real, so the validation the code performs is the validation under test.
 *
 * What that buys: the tests drive the ACTUAL SQL the module builds. A verifier
 * that re-implemented the query would pass while production starved a tenant.
 *
 * Only the alias `@/` and relative specifiers are followed. A module reaching
 * for a package other than the two stubbed ones would fail to resolve, loudly,
 * rather than being quietly satisfied.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const REPO_ROOT = resolvePath(process.cwd());

/**
 * Anchored on an `import`/`export` statement, not on the word `from`.
 *
 * The first draft matched any `from "..."` anywhere in the file and choked on
 * a COMMENT — `Distinguish "already decided" from "no such request..."` — by
 * trying to resolve the prose as a module. `[^;]*?` cannot cross a statement
 * terminator, so a real multi-line import still matches and prose after the
 * import block cannot.
 */
const IMPORT_SPECIFIER =
  /(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/g;
const BARE_IMPORT = /(?:^|\n)\s*import\s+["']([^"']+)["'];?/g;

function transpile(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

/** `@/lib/database/errors` -> <repo>/lib/database/errors.ts */
function resolveSpecifier(specifier, fromFile) {
  if (specifier.startsWith("@/")) {
    return `${resolvePath(REPO_ROOT, specifier.slice(2))}.ts`;
  }
  if (specifier.startsWith(".")) {
    const candidate = resolvePath(dirname(fromFile), specifier);
    return candidate.endsWith(".ts") ? candidate : `${candidate}.ts`;
  }
  return null;
}

function flatName(absolutePath) {
  // Flattened by basename. Two emitted modules sharing a basename would
  // silently shadow, so that is refused rather than resolved.
  return absolutePath.split(/[\\/]/).pop().replace(/\.ts$/, ".mjs");
}

/**
 * @param {string} entryPath repo-relative path to the query module
 * @param {object} client the fake Supabase client to inject
 * @param {string} [label] temp directory prefix
 */
export async function loadQueryModule(entryPath, client, label = "query") {
  const dir = mkdtempSync(join(tmpdir(), `${label}-`));
  const emitted = new Map();

  function emit(filePath) {
    const absolute = resolvePath(filePath);
    const name = flatName(absolute);
    if (emitted.has(name)) {
      if (emitted.get(name) !== absolute) {
        throw new Error(
          `basename collision loading ${entryPath}: ${emitted.get(name)} and ${absolute}`,
        );
      }
      return;
    }
    emitted.set(name, absolute);

    const source = readFileSync(absolute, "utf8");
    let output = transpile(source);

    // Follow every dependency this module actually imports.
    for (const match of source.matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1];
      if (specifier === "server-only" || specifier === "@/lib/supabase/service") continue;
      const target = resolveSpecifier(specifier, absolute);
      if (target) emit(target);
    }

    // Rewrite specifiers in the emitted JS: stubs for the two impure ones,
    // flat filenames for everything else.
    output = output
      .replace(BARE_IMPORT, (whole, specifier) =>
        specifier === "server-only" ? "\n" : whole,
      )
      .replace(IMPORT_SPECIFIER, (whole, specifier) => {
        const replacement =
          specifier === "@/lib/supabase/service"
            ? "./__service.mjs"
            : (() => {
                const target = resolveSpecifier(specifier, absolute);
                if (!target) {
                  throw new Error(
                    `${absolute} imports "${specifier}", which this harness will not ` +
                      "resolve. Stub it explicitly or the test would be running " +
                      "different code.",
                  );
                }
                return `./${flatName(target)}`;
              })();
        // The match spans the whole statement, so only its trailing quoted
        // specifier is swapped — replacing `whole` would delete the bindings.
        return whole.replace(/(["'])[^"']+\1(\s*)$/, `"${replacement}"$2`);
      });

    writeFileSync(join(dir, name), output);
  }

  emit(entryPath);

  // The seam. `setClient` is called before the module under test runs, so
  // every `createServiceRoleClient()` inside it returns the fake.
  writeFileSync(
    join(dir, "__service.mjs"),
    [
      "let injected = null;",
      "export function __setClient(client) { injected = client; }",
      "export function createServiceRoleClient() {",
      "  if (!injected) throw new Error('fake Supabase client was not injected');",
      "  return injected;",
      "}",
      "",
    ].join("\n"),
  );

  const service = await import(pathToFileURL(join(dir, "__service.mjs")).href);
  service.__setClient(client);

  return import(pathToFileURL(join(dir, flatName(resolvePath(entryPath)))).href);
}
