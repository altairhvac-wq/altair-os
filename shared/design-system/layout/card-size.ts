/**
 * Compact-by-Default card sizing vocabulary.
 *
 * Sizes describe a module's purpose and expected composition. They do not
 * apply width, max-width, or grid placement; the page remains responsible for
 * those decisions through ModuleGridItem spans or its own layout.
 */
export const CARD_SIZES = ["xs", "s", "m", "l", "xl"] as const;

export type CardSize = (typeof CARD_SIZES)[number];

export type CardSizeContractEntry = {
  label: string;
  purpose: string;
  recommendedSpan: 1 | 2 | 3;
};

export const cardSizeContract = {
  xs: {
    label: "Single decision",
    purpose: "One focused decision, next action, progress, or compact alert.",
    recommendedSpan: 1,
  },
  s: {
    label: "Compact information",
    purpose: "A concise status, fact group, shortcut set, or single insight.",
    recommendedSpan: 1,
  },
  m: {
    label: "Standard module",
    purpose: "A short list, recommendation set, or focused information group.",
    recommendedSpan: 1,
  },
  l: {
    label: "Dual-width module",
    purpose: "Related modules or content that benefits from two grid columns.",
    recommendedSpan: 2,
  },
  xl: {
    label: "Workspace",
    purpose:
      "Tables, dispatch, calendars, kanban, maps, charts, and document editors.",
    recommendedSpan: 3,
  },
} as const satisfies Record<CardSize, CardSizeContractEntry>;
