/**
 * Shared trade taxonomy and display helpers for the live Network directory/referrals UI.
 *
 * Do NOT confuse with:
 * - `network_profiles` — public/internal directory profile (see network-referral.ts)
 * - `network_partners` — private company partner CRM / My Network (see network-partner.ts)
 * - `network_referrals` — cross-company lead handoff (see network-referral.ts)
 * - `companies.trade` / `shared/lib/trades/trade-options.ts` — signup bootstrap keys (snake_case)
 *
 * See `shared/components/network/README.md` for the full model map.
 */

/** Canonical Community / Network business categories (exact stored strings). */
export const NETWORK_TRADE_TYPES = [
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

export type TradeType = (typeof NETWORK_TRADE_TYPES)[number];

const NETWORK_TRADE_TYPE_SET = new Set<string>(NETWORK_TRADE_TYPES);

export function isTradeType(value: string): value is TradeType {
  return NETWORK_TRADE_TYPE_SET.has(value);
}

/** Maps unknown/legacy DB values to a safe canonical category for display. */
export function normalizeTradeType(value: string): TradeType {
  return isTradeType(value) ? value : "General Contracting";
}

export const NETWORK_TRADE_OPTIONS: {
  value: TradeType;
  label: string;
}[] = NETWORK_TRADE_TYPES.map((value) => ({ value, label: value }));

export type NetworkLocationPrecision = "none" | "city" | "zip";

export function getPartnerInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
