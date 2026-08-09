/**
 * Shared trade taxonomy and display helpers for the live Network directory/referrals UI.
 *
 * Do NOT confuse with:
 * - `network_profiles` — public/internal directory profile (see network-referral.ts)
 * - `network_partners` — private company partner CRM / My Network (see network-partner.ts)
 * - `network_referrals` — cross-company lead handoff (see network-referral.ts)
 *
 * See `shared/components/network/README.md` for the full model map.
 *
 * IMPORTANT: `NETWORK_TRADE_CATEGORIES` is the single source of truth for the
 * app-side taxonomy and MUST stay in sync with the database CHECK constraints
 * (see `supabase/migrations/121_expand_network_trade_categories.sql`, which
 * governs `network_profiles.trade_type`, `network_partners.trade_type`, and
 * `network_invites.trade_category`). If a category is added there, add it here
 * in the same change — query-layer normalization funnels any unknown value to
 * "Other", so a missing entry silently mislabels real businesses.
 */

export const NETWORK_TRADE_CATEGORIES = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "General Contracting",
  "Cleaning Services",
  "Janitorial Services",
  "Carpet Cleaning",
  "Window Cleaning",
  "Pressure Washing",
  "Landscaping",
  "Lawn Care",
  "Roofing",
  "Painting",
  "Flooring",
  "Handyman Services",
  "Pest Control",
  "Restoration",
  "Water Damage Restoration",
  "Fire and Smoke Restoration",
  "Property Management",
  "Real Estate",
  "Appliance Repair",
  "Garage Door Services",
  "Locksmith",
  "Pool and Spa Services",
  "Moving Services",
  "Junk Removal",
  "Home Inspection",
  "Concrete and Masonry",
  "Excavation",
  "Fencing",
  "Drywall",
  "Insulation",
  "Solar",
  "Security Systems",
  "Other",
] as const;

export type TradeType = (typeof NETWORK_TRADE_CATEGORIES)[number];

const NETWORK_TRADE_CATEGORY_SET: ReadonlySet<string> = new Set(
  NETWORK_TRADE_CATEGORIES,
);

export function isNetworkTradeType(value: string): value is TradeType {
  return NETWORK_TRADE_CATEGORY_SET.has(value);
}

/**
 * Map a raw DB value onto the shared taxonomy. Values outside the allowlist
 * (which the DB CHECK constraints should prevent anyway) fall back to "Other"
 * rather than being silently relabeled as a real trade.
 */
export function normalizeNetworkTradeType(value: string): TradeType {
  return isNetworkTradeType(value) ? value : "Other";
}

export const NETWORK_TRADE_OPTIONS: {
  value: TradeType;
  label: string;
}[] = NETWORK_TRADE_CATEGORIES.map((value) => ({ value, label: value }));

export type NetworkLocationPrecision = "none" | "city" | "zip";

export function getPartnerInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
