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
    helper: "Outer shell behind cards and navigation in the preview.",
  },
  {
    key: "cardBackground",
    label: "Card background",
    helper: "Primary surface for panels and content blocks.",
  },
  {
    key: "cardBorder",
    label: "Card border",
    helper: "Outline around cards and nested sections.",
  },
  {
    key: "primaryButton",
    label: "Primary button",
    helper: "Main call-to-action fill color.",
  },
  {
    key: "primaryButtonText",
    label: "Primary button text",
    helper: "Label color on primary buttons.",
  },
  {
    key: "secondaryButton",
    label: "Secondary button",
    helper: "Secondary action fill color.",
  },
  {
    key: "secondaryButtonText",
    label: "Secondary button text",
    helper: "Label color on secondary buttons.",
  },
  {
    key: "headerText",
    label: "Header text",
    helper: "Page titles and section headings.",
  },
  {
    key: "bodyText",
    label: "Body text",
    helper: "Default paragraph and list copy.",
  },
  {
    key: "mutedText",
    label: "Muted text",
    helper: "Subtitles, captions, and de-emphasized copy.",
  },
  {
    key: "successBadge",
    label: "Success badge",
    helper: "Positive status pill background.",
  },
  {
    key: "warningBadge",
    label: "Warning badge",
    helper: "Attention or pending status pill background.",
  },
  {
    key: "dangerBadge",
    label: "Danger badge",
    helper: "Error or critical status pill background.",
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
