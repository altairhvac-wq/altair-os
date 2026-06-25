export const TRADE_KEYS = [
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "landscaping",
  "general_contracting",
  "appliance_repair",
  "garage_door",
  "cleaning",
  "other",
] as const;

export type TradeKey = (typeof TRADE_KEYS)[number];

export type TradeOption = {
  key: TradeKey;
  label: string;
  description: string;
  exampleServices: [string, string?];
};

export const TRADE_OPTIONS: TradeOption[] = [
  {
    key: "hvac",
    label: "HVAC",
    description: "Heating, cooling, and indoor air quality service businesses.",
    exampleServices: ["AC tune-up", "Furnace repair"],
  },
  {
    key: "plumbing",
    label: "Plumbing",
    description: "Residential and commercial plumbing contractors.",
    exampleServices: ["Drain cleaning", "Water heater install"],
  },
  {
    key: "electrical",
    label: "Electrical",
    description: "Electrical service, repair, and installation companies.",
    exampleServices: ["Panel upgrade", "Outlet troubleshooting"],
  },
  {
    key: "roofing",
    label: "Roofing",
    description: "Roof repair, replacement, and storm response contractors.",
    exampleServices: ["Roof inspection", "Shingle replacement"],
  },
  {
    key: "landscaping",
    label: "Landscaping",
    description: "Lawn care, landscaping, and outdoor property services.",
    exampleServices: ["Seasonal cleanup", "Irrigation repair"],
  },
  {
    key: "general_contracting",
    label: "General contracting",
    description: "Multi-trade remodel, repair, and construction businesses.",
    exampleServices: ["Bathroom remodel", "Drywall repair"],
  },
  {
    key: "appliance_repair",
    label: "Appliance repair",
    description: "In-home appliance diagnostics and repair services.",
    exampleServices: ["Refrigerator repair", "Washer diagnostics"],
  },
  {
    key: "garage_door",
    label: "Garage door",
    description: "Garage door installation, opener, and spring service.",
    exampleServices: ["Opener install", "Spring replacement"],
  },
  {
    key: "cleaning",
    label: "Cleaning",
    description: "Residential and commercial cleaning service companies.",
    exampleServices: ["Move-out clean", "Recurring service"],
  },
  {
    key: "other",
    label: "Other trade",
    description: "Another field service or trades business.",
    exampleServices: ["Service call", "Maintenance visit"],
  },
];

const TRADE_KEY_SET = new Set<string>(TRADE_KEYS);

const TRADE_OPTION_BY_KEY = new Map<TradeKey, TradeOption>(
  TRADE_OPTIONS.map((option) => [option.key, option]),
);

export function isTradeKey(value: unknown): value is TradeKey {
  return typeof value === "string" && TRADE_KEY_SET.has(value);
}

export function normalizeTradeKey(value: unknown): TradeKey | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (!normalized) {
    return null;
  }

  return isTradeKey(normalized) ? normalized : null;
}

export function parseTradeKey(
  value: unknown,
  fallback: TradeKey = "other",
): TradeKey {
  return normalizeTradeKey(value) ?? fallback;
}

export function getTradeOption(key: TradeKey): TradeOption {
  return TRADE_OPTION_BY_KEY.get(key) ?? TRADE_OPTION_BY_KEY.get("other")!;
}

export function getTradeLabel(key: TradeKey | null | undefined): string {
  if (!key) {
    return getTradeOption("other").label;
  }

  return getTradeOption(key).label;
}

/** Resolves which trade key demo seed packs should use (Phase 1: HVAC fallback). */
export function resolveDemoSeedTradeKey(
  companyTrade: string | null | undefined,
): TradeKey {
  return normalizeTradeKey(companyTrade) ?? "hvac";
}
