import { RESOURCES_BLACK_FRIDAY_TOOL_BAGS_PATH } from "@/shared/lib/resources/catalog";
import {
  TOOL_BAG_ROUNDS,
  type ToolBagContender,
  type ToolBagRound,
  type ToolBagTier,
} from "@/shared/lib/resources/black-friday-tool-bags.generated";
import {
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_ORIGIN,
} from "@/shared/lib/site/public-site";

/**
 * The hand-written half of the Black Friday tool-bag guide: the video, the
 * three builds, and everything derived from the generated round data. Prices
 * live only in `black-friday-tool-bags.generated.ts`; totals are added up here
 * so a regenerated price can never disagree with a printed total.
 */

/**
 * The embedded video. To swap it, change the id and the upload date together:
 * the page's VideoObject structured data reports that date.
 */
export const TOOL_BAG_VIDEO_ID = "4jq0QatBtG4";
export const TOOL_BAG_VIDEO_UPLOAD_DATE = "2026-11-08T23:45:49-08:00";
export const TOOL_BAG_VIDEO_TITLE = "Best HVAC Tools for Black Friday 2026";

export const TOOL_BAG_VIDEO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${TOOL_BAG_VIDEO_ID}?rel=0`;
export const TOOL_BAG_VIDEO_WATCH_URL = `https://www.youtube.com/watch?v=${TOOL_BAG_VIDEO_ID}`;

export const TOOL_BAG_PAGE_TITLE = "Best HVAC Tool Bag for Black Friday 2026 (3 Builds Compared)";
export const TOOL_BAG_PAGE_DESCRIPTION =
  "Three complete HVAC tool bags compared for Black Friday 2026: top tier, best deals and what I'd buy. 12 rounds of tools with prices, pros, cons and store links.";

const ASSET_BASE = "/resources/black-friday-tool-bags-2026";

export const TOOL_BAG_OG_IMAGE = {
  url: `${ASSET_BASE}/og.jpg`,
  width: 1200,
  height: 630,
  alt: "The top-tier HVAC tool bag and every tool in it, laid out flat",
} as const;

export const TOOL_BAG_BOARD_SIZE = { width: 1280, height: 720 } as const;

export type ToolBagTierInfo = {
  readonly key: ToolBagTier;
  readonly label: string;
  readonly bag: string;
  readonly summary: string;
  readonly board: string;
  readonly boardAlt: string;
};

export const TOOL_BAG_TIERS: readonly ToolBagTierInfo[] = [
  {
    key: "top",
    label: "Top tier",
    bag: "Veto Pro Pac TECH-MCT + DHX holster",
    summary:
      "The strongest option from each round: a closed bag with a waterproof base, a Fluke meter with app logging, and wireless Fieldpiece probes.",
    board: `${ASSET_BASE}/boards/top.webp`,
    boardAlt: "Flat-lay of the top-tier build: Veto Pro Pac bag and holster with every tool in it",
  },
  {
    key: "budget",
    label: "Best deals",
    bag: "Husky Build-Out 14 in.",
    summary:
      "The lower-cost build: one Klein kit covers the clamp meter and the voltage tester, and a compact NAVAC manifold handles pressures.",
    board: `${ASSET_BASE}/boards/budget.webp`,
    boardAlt: "Flat-lay of the best-deals build: Husky Build-Out tote with every tool in it",
  },
  {
    key: "pick",
    label: "What I'd buy",
    bag: "Klein Tradesman Pro 10 in. tote",
    summary:
      "Where I'd spend my own money: an open Klein tote, a Fieldpiece meter with inrush, and a Testo manifold with pipe clamps in the kit.",
    board: `${ASSET_BASE}/boards/pick.webp`,
    boardAlt: "Flat-lay of the what-I'd-buy build: Klein Tradesman Pro tote with every tool in it",
  },
];

export function tierLabel(tier: ToolBagTier): string {
  return TOOL_BAG_TIERS.find((info) => info.key === tier)?.label ?? tier;
}

export function formatToolBagMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

/** "2026-11-08" → "Nov 8, 2026", in UTC so the day never shifts by time zone. */
export function formatToolBagDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function roundAnchor(slot: string): string {
  return slot.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export type ToolBagPick =
  | { readonly kind: "contender"; readonly contender: ToolBagContender }
  | { readonly kind: "included"; readonly name: string };

export function pickForTier(round: ToolBagRound, tier: ToolBagTier): ToolBagPick | null {
  const contender = round.contenders.find((item) => item.tiers.includes(tier));
  if (contender) return { kind: "contender", contender };
  const included = round.included.find((item) => item.tiers.includes(tier));
  return included ? { kind: "included", name: included.name } : null;
}

/** Whole cents, so adding twelve prices cannot pick up floating-point dust. */
export function tierTotal(tier: ToolBagTier): number {
  const cents = TOOL_BAG_ROUNDS.reduce((sum, round) => {
    const pick = pickForTier(round, tier);
    return sum + (pick?.kind === "contender" ? Math.round(pick.contender.price * 100) : 0);
  }, 0);
  return cents / 100;
}

function absolute(path: string): string {
  return `${PUBLIC_SITE_ORIGIN}${path}`;
}

/** Only what the page shows: no ratings, reviews, stock or validity claims. */
export function buildToolBagItemListStructuredData(): Record<string, unknown> {
  const contenders = TOOL_BAG_ROUNDS.flatMap((round) => round.contenders);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TOOL_BAG_PAGE_TITLE,
    numberOfItems: contenders.length,
    itemListElement: contenders.map((contender, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: contender.name,
        brand: { "@type": "Brand", name: contender.brand },
        image: absolute(contender.image),
        url: absolute(`${RESOURCES_BLACK_FRIDAY_TOOL_BAGS_PATH}#${contender.key}`),
        description: contender.bestFor,
        offers: {
          "@type": "Offer",
          price: contender.price.toFixed(2),
          priceCurrency: "USD",
          url: contender.links[0]?.href,
          seller: { "@type": "Organization", name: contender.store },
        },
      },
    })),
  };
}

export function buildToolBagVideoStructuredData(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: TOOL_BAG_VIDEO_TITLE,
    description: TOOL_BAG_PAGE_DESCRIPTION,
    thumbnailUrl: [`https://i.ytimg.com/vi/${TOOL_BAG_VIDEO_ID}/hqdefault.jpg`],
    uploadDate: TOOL_BAG_VIDEO_UPLOAD_DATE,
    embedUrl: TOOL_BAG_VIDEO_EMBED_URL,
    url: TOOL_BAG_VIDEO_WATCH_URL,
    publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
  };
}
