#!/usr/bin/env node
/**
 * Every link in the site menu (shared/lib/site/site-menu.ts) must point at a
 * real page: a page.tsx under app/(marketing), app/(articles) or app/, or an
 * Insights article served by app/(articles)/insights/[slug]. Run:
 *   node scripts/verify-site-menu.mjs
 * Exits 1 and names the link when one has no page.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const source = readFileSync(join(root, "shared/lib/site/site-menu.ts"), "utf8");
const hrefs = [...source.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);

const groups = ["(marketing)", "(articles)", ""];
function hasPage(pathname) {
  if (pathname === "/") return true;
  const parts = pathname.split("/").filter(Boolean);
  for (const group of groups) {
    if (existsSync(join(root, "app", group, ...parts, "page.tsx"))) return true;
  }
  // /insights/<slug> without its own route is a database article.
  return parts[0] === "insights" && parts.length === 2 && existsSync(join(root, "app/(articles)/insights/[slug]/page.tsx"));
}

let failed = 0;
for (const href of new Set(hrefs)) {
  const pathname = href.split("#")[0].split("?")[0] || "/";
  if (!href.startsWith("/")) {
    console.error(`FAIL ${href}: menu links must be site paths`);
    failed += 1;
  } else if (!hasPage(pathname)) {
    console.error(`FAIL ${href}: no page for ${pathname}`);
    failed += 1;
  }
}
console.log(`${new Set(hrefs).size} menu links checked, ${failed} without a page`);
process.exit(failed ? 1 : 0);
