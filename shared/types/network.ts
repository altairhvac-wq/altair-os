/**
 * Shared trade taxonomy and display helpers for the live Network directory/referrals UI.
 *
 * Do NOT confuse with:
 * - `network_profiles` — public/internal directory profile (see network-referral.ts)
 * - `network_partners` — private company partner CRM / My Network (see network-partner.ts)
 * - `network_referrals` — cross-company lead handoff (see network-referral.ts)
 *
 * See `shared/components/network/README.md` for the full model map.
 */

export type TradeType =
  | "HVAC"
  | "Plumbing"
  | "Electrical"
  | "Roofing"
  | "General Contracting"
  | "Landscaping"
  | "Painting";

export const NETWORK_TRADE_OPTIONS: {
  value: TradeType;
  label: string;
}[] = [
  { value: "HVAC", label: "HVAC" },
  { value: "Plumbing", label: "Plumbing" },
  { value: "Electrical", label: "Electrical" },
  { value: "Roofing", label: "Roofing" },
  { value: "General Contracting", label: "General Contracting" },
  { value: "Landscaping", label: "Landscaping" },
  { value: "Painting", label: "Painting" },
];

export type NetworkLocationPrecision = "none" | "city" | "zip";

export function getPartnerInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
