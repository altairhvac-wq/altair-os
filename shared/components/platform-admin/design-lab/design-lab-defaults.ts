export type DesignLabColors = {
  pageBackground: string;
  cardBackground: string;
  cardBorder: string;
  primaryButton: string;
  primaryButtonText: string;
  secondaryButton: string;
  secondaryButtonText: string;
  headerText: string;
  bodyText: string;
  mutedText: string;
  successBadge: string;
  warningBadge: string;
  dangerBadge: string;
};

export const NORTH_STAR_DESIGN_LAB_DEFAULTS: DesignLabColors = {
  pageBackground: "#17130E",
  cardBackground: "#FFF8E8",
  cardBorder: "#E7D7B1",
  primaryButton: "#B8943F",
  primaryButtonText: "#17130E",
  secondaryButton: "#F7EED8",
  secondaryButtonText: "#2B2118",
  headerText: "#FFF8E8",
  bodyText: "#2B2118",
  mutedText: "#7A6A55",
  successBadge: "#DDEDD8",
  warningBadge: "#F5E6B8",
  dangerBadge: "#F2D0C8",
};

export const DESIGN_LAB_COLOR_FIELDS: {
  key: keyof DesignLabColors;
  label: string;
  helper: string;
}[] = [
  {
    key: "pageBackground",
    label: "Page background",
    helper: "Outer shell and page canvas preview.",
  },
  {
    key: "cardBackground",
    label: "Card background",
    helper: "Main work surfaces and cards.",
  },
  {
    key: "cardBorder",
    label: "Card border",
    helper: "Card outlines and section dividers.",
  },
  {
    key: "primaryButton",
    label: "Primary button",
    helper: "Main action buttons.",
  },
  {
    key: "primaryButtonText",
    label: "Primary button text",
    helper: "Text inside primary buttons.",
  },
  {
    key: "secondaryButton",
    label: "Secondary action buttons",
    helper: "Secondary actions inside the preview, such as New job.",
  },
  {
    key: "secondaryButtonText",
    label: "Secondary action button text",
    helper: "Text inside preview secondary action buttons.",
  },
  {
    key: "headerText",
    label: "Header text",
    helper: "Large titles on dark shell areas.",
  },
  {
    key: "bodyText",
    label: "Body text",
    helper: "Main readable content inside cards.",
  },
  {
    key: "mutedText",
    label: "Muted text",
    helper: "Helper text, metadata, and descriptions.",
  },
  {
    key: "successBadge",
    label: "Success badge",
    helper: "Positive status states.",
  },
  {
    key: "warningBadge",
    label: "Warning badge",
    helper: "Needs-attention status states.",
  },
  {
    key: "dangerBadge",
    label: "Danger badge",
    helper: "Error or blocked status states.",
  },
];

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();

  if (!HEX_PATTERN.test(trimmed)) {
    return null;
  }

  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return trimmed.toUpperCase();
}
