/**
 * Regenerates the typed data module behind the Black Friday tool-bag page.
 *
 *   node scripts/generate-black-friday-tool-bags.mjs
 *
 * Prices, names and tier picks come ONLY from the production `rounds.json`;
 * specs, pros and cons come ONLY from the research `pros_cons.json`. Nothing
 * here restates a price, so re-running after a price check updates the page.
 * Override the source locations with ROUNDS_JSON and PROS_CONS_JSON.
 *
 * What this file does add is the part the sources do not hold: each store's
 * page address, and the small wording fixes that keep production notes off a
 * public page. Every fix names its exact source text and the run fails if that
 * text is gone, so a stale correction cannot be applied silently.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "C:/Users/User/Desktop/Blender-Chiller/gold_assets";
const ROUNDS = process.env.ROUNDS_JSON ?? `${BASE}/production/projects/black-friday-tool-bag-2026/rounds.json`;
const PROS_CONS = process.env.PROS_CONS_JSON ?? `${BASE}/research/black_friday_hvac_tools_2026/pros_cons.json`;
const OUTPUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../shared/lib/resources/black-friday-tool-bags.generated.ts",
);

/** The published "as of" label for every price on the page. */
const PRICES_AS_OF_LABEL = "Nov 8-9, 2026";
const IMAGE_BASE = "/resources/black-friday-tool-bags-2026/cards";

const hd = (id) => `https://www.homedepot.com/p/${id}`;
const tt = (path) => `https://trutechtools.com/${path}`;

/** `search: true` marks the one item with no confirmed product address. */
const STORE_LINKS = {
  veto_mct: [
    { label: "TECH-MCT at TruTech", href: tt("techmct") },
    { label: "DHX holster at TruTech", href: tt("veto-pro-pac-dhx-compact-drill-holster/") },
  ],
  klein_bag: [{ href: hd(205547067) }],
  milw_bag: [{ href: hd(302757312) }],
  husky_bag: [{ href: hd(329721067) }],
  klein_cl320kit: [{ href: hd(316734119) }],
  fp_sc440: [{ href: tt("SC440") }],
  fluke_902fc: [{ href: hd(327627746) }],
  fluke_1acii: [{ href: hd(327627715) }],
  klein_ncvt3pr: [{ href: hd(312665549) }],
  milw_3208: [{ href: "https://www.homedepot.com/s/Milwaukee%203208-20", search: true }],
  klein_32527: [{ href: hd(203310474) }],
  milw_2881: [{ href: hd(305456771) }],
  klein_32596: [{ href: hd(302926901) }],
  husky_15in1: [{ href: hd(315389868) }],
  klein_646m: [{ href: hd(202266599) }],
  milw_shock: [{ href: hd(332250931) }],
  // 48-22-2547, the magnetic set at the recorded price (not the 48-22-2507).
  milw_hollow: [{ href: hd(326117376) }],
  husky_nd7: [{ href: hd(204663525) }],
  milw_pl5: [{ href: hd(310730449) }],
  knipex_3: [{ href: hd(327771407) }],
  husky_pl4: [{ href: hd(326159970) }],
  ridgid_150: [{ href: hd(100018866) }],
  milw_4259: [{ href: hd(301803589) }],
  yj_60101: [{ href: tt("yellow-jacket-60101-small-premium-tubing-cutter-for-1-8-to-1-1-8-o-d/") }],
  testo_550s: [{ href: tt("testo-550s-basic-kit-smart-digital-manifold-with-wired-temperature-probes.html") }],
  fp_jl3kr4: [{ href: tt("JL3KR4") }],
  navac_n1dx: [{ href: tt("navac-n1dx-flex-1-manifold-gauge-with-hd-color-graphic-interface/") }],
  navac_nmv1: [{ href: tt("NAVAC-NMV1-Micron-Vacuum-Gauge") }],
  testo_552i: [{ href: tt("testo-552i-app-operated-wireless-micron-gauge.html") }],
  fp_mg44: [{ href: tt("fieldpiece-mg44-job-link-wireless-vacuum-gauge.html") }],
  klein_69140: [{ href: hd(303585857) }],
  testo_115i: [{ href: tt("Testo-115i-Pipe-Clamp-Thermometer-Smart-Probe-2nd-Gen") }],
  fp_jl3pc: [{ href: tt("Fieldpiece-JL3PC-Premium-Pipe-Clamp-Probe-1-4-1-3-8") }],
  appion_mgavct: [{ label: "MGAVCT at TruTech", href: tt("mgavct") }],
  navac_nvr2: [{ label: "NVR2 at TruTech", href: tt("navac-nvr2-valve-core-removal-tool/") }],
  yj_18975: [{ label: "18975 at TruTech", href: tt("yellow-jacket-18975-1-4-core-vacuum-chg-tool/") }],
  m18_kit_surge: [{ href: hd(320379720) }],
  dewalt_850: [{ href: hd(316627328) }],
  makita_xdt13: [{ href: hd(300268161) }],
};

const WRENCH_LINK = { label: "60613 wrench at TruTech", href: tt("yellow-jacket-60613-standard-ratchet-wrench/") };
const WRENCH_ROUND = "Core tool + service wrench";

const EXTRA_IMAGES = { veto_mct: "veto_dhx" };

const OFFER_NOTES = {
  m18_kit_surge:
    "Home Depot's free-gift offer lets you select one tool with the kit. The SURGE 2761-20 was on that list on Nov 9, 2026.",
};

const BRANDS = [
  "Veto Pro Pac", "Yellow Jacket", "Klein", "Milwaukee", "Husky", "Fieldpiece", "Fluke",
  "Knipex", "Ridgid", "Testo", "NAVAC", "Appion", "DeWalt", "Makita",
];

/**
 * Exact research text → public text, or null to drop the line.
 *
 * The three "no longer available" flags are dropped because TruTech listed
 * those items at the recorded prices when re-checked on 2026-11-09.
 */
const TEXT_FIXES = new Map([
  [
    "Milwaukee's own page contradicts itself on bits and nut-driver sizes, so check the box before you film or buy",
    "Milwaukee's own page contradicts itself on bits and nut-driver sizes, so check the box before you buy",
  ],
  [
    "Exact bit and nut-driver sizes unverified; read them off the package before filming.",
    "Exact bit and nut-driver sizes are unverified; read them off the package before you buy.",
  ],
  // About the 48-22-2507 in Canada; the page links Home Depot's 48-22-2547.
  ["Milwaukee Canada lists this set as no longer available, so stock may be limited", null],
  ["TruTech's JL3KR4 page shows 'no longer available' [single-source]", null],
  ["TruTech's NMV1 page shows 'no longer available'", null],
  [
    "No independent reviews found; TruTech's page shows 'no longer available' [single-source]",
    "No independent reviews found",
  ],
]);
const usedFixes = new Set();

function publicText(text) {
  let out = text;
  if (TEXT_FIXES.has(text)) {
    usedFixes.add(text);
    out = TEXT_FIXES.get(text);
    if (out === null) return null;
  }
  const cleaned = out.replace(/\s*\[single-source\]/g, " (one source)");
  if (/rounds\.json|\bfilm|\[.*\]/i.test(cleaned)) throw new Error(`Internal note in public text: ${cleaned}`);
  return cleaned;
}

const texts = (list) => list.map((entry) => publicText(entry.text)).filter(Boolean);

function sourcesOf(contender) {
  const urls = [...contender.specs, ...contender.pros, ...contender.cons].map((entry) => entry.source);
  const seen = new Map();
  for (const url of urls) {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (!seen.has(host)) seen.set(host, url);
  }
  return [...seen].map(([host, url]) => ({ host, url }));
}

function brandOf(name) {
  const brand = BRANDS.find((candidate) => name.startsWith(candidate));
  if (!brand) throw new Error(`No brand for "${name}"`);
  return brand;
}

function recheckedOn(item) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(item.rechecked ?? "");
  return match ? match[1] : null;
}

function linksFor(key, store, round) {
  const links = STORE_LINKS[key];
  if (!links) throw new Error(`No store link for ${key}`);
  const all = links.map((link) => ({
    label: link.label ?? (link.search ? `Search ${store}` : `See it at ${store}`),
    href: link.href,
    kind: link.search ? "search" : "product",
  }));
  if (round === WRENCH_ROUND) all.push({ ...WRENCH_LINK, kind: "product" });
  return all;
}

const rounds = JSON.parse(readFileSync(ROUNDS, "utf8"));
const research = JSON.parse(readFileSync(PROS_CONS, "utf8"));
const byKey = new Map(research.contenders.map((contender) => [contender.item_key, contender]));
const whatMatters = new Map(research.rounds.map((round) => [round.round, round.what_matters]));

const recheckDates = [];

const outRounds = rounds.rounds.map((round) => {
  const matters = whatMatters.get(round.slot);
  if (!matters) throw new Error(`No research for round "${round.slot}"`);

  const contenders = [];
  const included = [];

  for (const [key, item] of Object.entries(round.items)) {
    const tiers = rounds.tiers.filter((tier) => round[tier] === key);

    if (item.tag === "INCLUDED") {
      if (item.price !== 0) throw new Error(`Included item ${key} has a price`);
      included.push({ name: item.name, tiers });
      continue;
    }

    const contender = byKey.get(key);
    if (!contender) throw new Error(`No research for ${key}`);
    if (contender.round !== round.slot) throw new Error(`${key} is filed under ${contender.round}`);

    const checked = recheckedOn(item);
    if (checked) recheckDates.push(checked);

    contenders.push({
      key,
      name: item.name,
      brand: brandOf(item.name),
      price: item.price,
      wasPrice: item.was ?? null,
      store: item.store,
      tag: item.tag,
      tiers,
      recheckedOn: checked,
      parts: (item.parts ?? []).map((part) => ({ name: part.name, price: part.price })),
      offerNote: OFFER_NOTES[key] ?? null,
      links: linksFor(key, item.store, round.slot),
      image: `${IMAGE_BASE}/${key}.webp`,
      extraImage: EXTRA_IMAGES[key] ? `${IMAGE_BASE}/${EXTRA_IMAGES[key]}.webp` : null,
      specs: texts(contender.specs),
      pros: texts(contender.pros),
      cons: texts(contender.cons),
      bestFor: publicText(contender.best_for),
      gaps: contender.gaps ? publicText(contender.gaps) : null,
      sources: sourcesOf(contender),
    });
  }

  for (const tier of rounds.tiers) {
    const pick = round[tier];
    if (!round.items[pick]) throw new Error(`${round.slot}: ${tier} pick ${pick} is not an item`);
  }

  const out = { slot: round.slot, whatMatters: publicText(matters), contenders, included, sharedTool: null };

  if (round.slot === WRENCH_ROUND) {
    const wrench = byKey.get("yj_60613");
    out.sharedTool = {
      name: "Yellow Jacket 60613 straight reversible service ratchet wrench",
      image: `${IMAGE_BASE}/wr_yj.webp`,
      link: { ...WRENCH_LINK, kind: "product" },
      specs: texts(wrench.specs),
      pros: texts(wrench.pros),
      cons: texts(wrench.cons),
      bestFor: publicText(wrench.best_for),
      sources: sourcesOf(wrench),
    };
  }
  return out;
});

const unusedFixes = [...TEXT_FIXES.keys()].filter((text) => !usedFixes.has(text));
if (unusedFixes.length > 0) throw new Error(`Corrections no longer match the research:\n${unusedFixes.join("\n")}`);

const lastChecked = recheckDates.sort().at(-1);
if (!lastChecked) throw new Error("No re-check dates in rounds.json");

const body = `// GENERATED by scripts/generate-black-friday-tool-bags.mjs. Do not edit by hand.
// Prices and picks: production rounds.json. Specs, pros, cons: research pros_cons.json.

export type ToolBagTier = "top" | "budget" | "pick";

export type ToolBagLink = {
  readonly label: string;
  readonly href: string;
  /** "search" marks a store search for the model, not a product page. */
  readonly kind: "product" | "search";
};

export type ToolBagSource = { readonly host: string; readonly url: string };

export type ToolBagContender = {
  readonly key: string;
  readonly name: string;
  readonly brand: string;
  readonly price: number;
  readonly wasPrice: number | null;
  readonly store: string;
  readonly tag: "EVERYDAY PRICE" | "REAL DEAL" | "FREE WITH KIT";
  readonly tiers: readonly ToolBagTier[];
  readonly recheckedOn: string | null;
  readonly parts: readonly { readonly name: string; readonly price: number }[];
  readonly offerNote: string | null;
  readonly links: readonly ToolBagLink[];
  readonly image: string;
  readonly extraImage: string | null;
  readonly specs: readonly string[];
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly bestFor: string;
  readonly gaps: string | null;
  readonly sources: readonly ToolBagSource[];
};

export type ToolBagSharedTool = {
  readonly name: string;
  readonly image: string;
  readonly link: ToolBagLink;
  readonly specs: readonly string[];
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly bestFor: string;
  readonly sources: readonly ToolBagSource[];
};

export type ToolBagRound = {
  readonly slot: string;
  readonly whatMatters: string;
  readonly contenders: readonly ToolBagContender[];
  /** A tier's pick that costs nothing because another tool already includes it. */
  readonly included: readonly { readonly name: string; readonly tiers: readonly ToolBagTier[] }[];
  readonly sharedTool: ToolBagSharedTool | null;
};

/** How every price on the page is dated. */
export const TOOL_BAG_PRICES_AS_OF = ${JSON.stringify(PRICES_AS_OF_LABEL)};

/** The most recent store re-check recorded in the source data. */
export const TOOL_BAG_PRICES_LAST_CHECKED = ${JSON.stringify(lastChecked)};

export const TOOL_BAG_ROUNDS: readonly ToolBagRound[] = ${JSON.stringify(outRounds, null, 2)};
`;

writeFileSync(OUTPUT, body);

const cents = (tier) =>
  outRounds.reduce((sum, round) => {
    const pick = round.contenders.find((contender) => contender.tiers.includes(tier));
    return sum + (pick ? Math.round(pick.price * 100) : 0);
  }, 0);
console.log(`Wrote ${OUTPUT}`);
console.log(`Rounds: ${outRounds.length}, contenders: ${outRounds.flatMap((round) => round.contenders).length}, last checked: ${lastChecked}`);
for (const tier of rounds.tiers) console.log(`  ${tier}: $${(cents(tier) / 100).toFixed(2)}`);
