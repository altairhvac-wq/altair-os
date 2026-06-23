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
  sidebarBackground: string;
  sidebarText: string;
  sidebarActiveBackground: string;
  sidebarMutedText: string;
  topbarBackground: string;
  topbarText: string;
};

export const DESIGN_LAB_SHELL_CHROME: Pick<
  DesignLabColors,
  | "sidebarBackground"
  | "sidebarText"
  | "sidebarActiveBackground"
  | "sidebarMutedText"
  | "topbarBackground"
  | "topbarText"
> = {
  sidebarBackground: "#0B1118",
  sidebarText: "#C9BFAE",
  sidebarActiveBackground: "#2A2418",
  sidebarMutedText: "#C9A44D",
  topbarBackground: "#0E141D",
  topbarText: "#F3EBDD",
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
  ...DESIGN_LAB_SHELL_CHROME,
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
  {
    key: "sidebarBackground",
    label: "Sidebar background",
    helper: "Preview-only sidebar shell surface.",
  },
  {
    key: "sidebarText",
    label: "Sidebar text",
    helper: "Preview-only sidebar navigation labels.",
  },
  {
    key: "sidebarActiveBackground",
    label: "Sidebar active background",
    helper: "Preview-only active nav item surface.",
  },
  {
    key: "sidebarMutedText",
    label: "Sidebar muted text",
    helper: "Preview-only sidebar group labels.",
  },
  {
    key: "topbarBackground",
    label: "Topbar background",
    helper: "Preview-only top header shell surface.",
  },
  {
    key: "topbarText",
    label: "Topbar text",
    helper: "Preview-only top header titles and labels.",
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
