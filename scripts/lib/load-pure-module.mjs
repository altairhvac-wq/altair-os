/**
 * Load a pure `shared/types/*.ts` module — and its relative dependencies —
 * for a verifier script.
 *
 * ================== WHY THIS EXISTS ==================
 * The verifiers transpile TypeScript with `ts.transpileModule` and import the
 * result from a temp directory. That works for a module with no imports,
 * which every pure `shared/types` module used to be. The moment one of them
 * imports a sibling (`./integration-capability`), the emitted JavaScript
 * carries a relative specifier that resolves against the TEMP directory,
 * where the sibling does not exist — `ERR_MODULE_NOT_FOUND`, in a verifier
 * that was previously green.
 *
 * The fix is not to strip the imports and concatenate: that silently merges
 * two module scopes and would hide a genuine circular-import or shadowing
 * bug behind a passing test. Instead this walks the relative import graph
 * and emits EVERY module into one temp directory under its real filename, so
 * the relative specifiers resolve exactly as they do in the app. What the
 * verifier imports is the real module graph, not a flattened copy of it.
 *
 * Only relative specifiers are followed. A module reaching for `@/lib/...`
 * or a package is not pure, and a verifier asserting purity should fail on
 * it rather than quietly resolve it.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const RELATIVE_IMPORT =
  /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+["'](\.[^"']*)["']/g;

function transpile(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

/**
 * @param {string} entryPath repo-relative path to the .ts entry module
 * @param {string} [label] short prefix for the temp directory name
 * @returns {Promise<Record<string, unknown>>} the imported module namespace
 */
export async function loadPureModule(entryPath, label = "pure") {
  const dir = mkdtempSync(join(tmpdir(), `${label}-`));
  const seen = new Set();

  /** @param {string} filePath */
  function emit(filePath) {
    const absolute = resolvePath(filePath);
    if (seen.has(absolute)) return;
    seen.add(absolute);

    const source = readFileSync(absolute, "utf8");

    // Follow relative imports first, so a dependency is on disk before the
    // module that needs it is imported.
    for (const match of source.matchAll(RELATIVE_IMPORT)) {
      const specifier = match[1];
      const candidate = resolvePath(dirname(absolute), specifier);
      const target = candidate.endsWith(".ts") ? candidate : `${candidate}.ts`;
      emit(target);
    }

    // Emitted flat: every module keeps its basename, so `./sibling`
    // resolves inside the temp directory the same way it does in the repo.
    // Pure shared/types modules live in one directory, so basenames cannot
    // collide; a collision would mean the module was not pure anyway.
    const basename = absolute.split(/[\\/]/).pop().replace(/\.ts$/, ".mjs");
    const emitted = transpile(source).replace(
      /from\s+["'](\.[^"']*)["']/g,
      (whole, specifier) => {
        const name = specifier.split(/[\\/]/).pop().replace(/\.js$/, "");
        return `from "./${name}.mjs"`;
      },
    );
    writeFileSync(join(dir, basename), emitted);
  }

  emit(entryPath);

  const entryName = entryPath.split(/[\\/]/).pop().replace(/\.ts$/, ".mjs");
  return import(pathToFileURL(join(dir, entryName)).href);
}
