/**
 * Design Lab editable token vocabulary.
 *
 * Keys map 1:1 to live CSS custom properties from `app/globals.css`.
 * Persisted themes store the CSS variable names as JSON keys (Stage 2).
 *
 * Defaults are the literal live values from globals.css — North Star chrome
 * from `.admin-north-star-shell` where that block overrides `:root`, surface
 * hierarchy + Altair foundation from `:root`, hub work-table cool-gray bands
 * from `.admin-north-star-shell`. Alias tokens that resolve via `var(...)` in
 * CSS are stored as their resolved live color so each control is independently
 * editable.
 *
 * Dispatch / Schedule / Reports / Dashboard exception boards consume the Altair
 * foundation materials + status tokens (via Tailwind `altair-*` utilities) —
 * there are no separate `--dispatch-*` / `--exception-urgency-*` product vars.
 */

export type DesignLabTokenGroupId =
  | "chrome"
  | "brass"
  | "text-on-chrome"
  | "sidebar-states"
  | "surfaces"
  | "altair-foundation"
  | "hub-work-tables";

export type DesignLabColorKey =
  /* Chrome */
  | "northStarRoot"
  | "northStarSidebar"
  | "northStarTopbar"
  | "northStarPanel"
  | "northStarBorder"
  | "northStarSectionDivider"
  | "northStarPlateBorder"
  | "northStarHeaderStrip"
  | "northStarContentWell"
  | "northStarCaughtUpFill"
  /* Brass ladder */
  | "northStarBronze"
  | "northStarBrass"
  | "northStarGold"
  | "northStarChampagne"
  | "northStarBrassRail"
  | "northStarBrassRing"
  /* Text on chrome — role-split light ink + remaining dark/ivory */
  | "northStarTopbarHeading"
  | "northStarSectionTitle"
  | "northStarLinkHover"
  | "northStarTopbarSubcopy"
  | "northStarSectionSecondary"
  | "northStarLink"
  | "northStarTopbarIcon"
  | "northStarIvory"
  | "northStarIvoryStrong"
  | "northStarTextDark"
  | "northStarTextSecondary"
  | "northStarTextMuted"
  /* Sidebar states */
  | "northStarSidebarLink"
  | "northStarSidebarLinkHover"
  | "northStarSidebarLinkActive"
  | "northStarSidebarIcon"
  | "northStarSidebarIconHover"
  | "northStarSidebarIconActive"
  | "northStarSidebarLabel"
  /* Surface hierarchy */
  | "surfaceCanvas"
  | "surfaceSection"
  | "surfacePanel"
  | "surfaceCard"
  | "surfaceTile"
  | "surfaceMuted"
  | "borderSubtle"
  | "borderStrong"
  /* Altair foundation — materials */
  | "altairStone"
  | "altairPaper"
  | "altairPaperElevated"
  | "altairPaperSubtle"
  | "altairGraphite"
  | "altairInk"
  | "altairInkSecondary"
  | "altairInkMuted"
  | "altairBorder"
  | "altairBorderStrong"
  | "altairBrass"
  | "altairBrassInteractive"
  /* Altair foundation — status mid + foreground + surface */
  | "altairSuccess"
  | "altairSuccessForeground"
  | "altairSuccessSurface"
  | "altairWarning"
  | "altairWarningForeground"
  | "altairWarningSurface"
  | "altairDanger"
  | "altairDangerForeground"
  | "altairDangerSurface"
  | "altairInformation"
  | "altairInformationForeground"
  | "altairInformationSurface"
  /* Hub work tables — cool-gray bands (Customers / Team / Work / Sales) */
  | "northStarWorkSurface"
  | "northStarWorkBand"
  | "northStarWorkRow"
  | "northStarWorkRowHover"
  | "northStarWorkInput"
  | "northStarWorkBorder"
  | "northStarWorkBorderStrong"
  | "northStarWorkText"
  | "northStarWorkTextSecondary"
  | "northStarWorkTextMuted"
  | "northStarWorkPlaceholder";

export type DesignLabColors = Record<DesignLabColorKey, string>;

export type DesignLabTokenDef = {
  key: DesignLabColorKey;
  cssVar: string;
  label: string;
  helper: string;
  group: DesignLabTokenGroupId;
  /** Literal default from live globals.css (or resolved product utility color). */
  defaultValue: string;
};

export const DESIGN_LAB_TOKEN_GROUPS: {
  id: DesignLabTokenGroupId;
  label: string;
  helper: string;
}[] = [
  {
    id: "chrome",
    label: "Chrome",
    helper:
      "Olive-graphite shell planes — root, sidebar, topbar, panel, chrome/section/plate borders, two-tone canvas, caught-up fill.",
  },
  {
    id: "brass",
    label: "Brass ladder",
    helper: "Bronze → brass → gold → champagne, plus rail and ring accents.",
  },
  {
    id: "text-on-chrome",
    label: "Text on chrome",
    helper:
      "Role-split light ink (topbar / section / link) plus ivory and dark reading ink.",
  },
  {
    id: "sidebar-states",
    label: "Sidebar states",
    helper: "Nav link, icon, and group-label colors including hover/active.",
  },
  {
    id: "surfaces",
    label: "Surface hierarchy",
    helper:
      "Canvas → section → panel → card → tile → muted, plus legacy --border-subtle / --border-strong.",
  },
  {
    id: "altair-foundation",
    label: "Altair foundation",
    helper:
      "Shared materials + status colors — Dispatch, Schedule, Reports, and the Dashboard exception board all read these.",
  },
  {
    id: "hub-work-tables",
    label: "Hub work tables",
    helper:
      "Cool-gray table bands for Customers / Team / Work / Sales list surfaces.",
  },
];

/**
 * Canonical editable set. Defaults pulled from `app/globals.css`:
 * - Chrome / brass / text / sidebar / hub work tables: `.admin-north-star-shell`
 * - Surfaces + Altair foundation: `:root` Design Foundation block
 */
export const DESIGN_LAB_TOKEN_DEFS: DesignLabTokenDef[] = [
  /* —— Chrome —— */
  {
    key: "northStarRoot",
    cssVar: "--north-star-root",
    label: "Page canvas",
    helper:
      "Outer shell / page canvas behind sidebar + main — not the sidebar itself.",
    group: "chrome",
    defaultValue: "#555f48",
  },
  {
    key: "northStarSidebar",
    cssVar: "--north-star-sidebar",
    label: "Sidebar",
    helper: "Left nav olive plane.",
    group: "chrome",
    defaultValue: "#4a5540",
  },
  {
    key: "northStarTopbar",
    cssVar: "--north-star-topbar",
    label: "Topbar",
    helper: "Premium header band.",
    group: "chrome",
    defaultValue: "#5d6850",
  },
  {
    key: "northStarPanel",
    cssVar: "--north-star-panel",
    label: "Panel",
    helper: "Elevated chrome panel mid-tone.",
    group: "chrome",
    defaultValue: "#6a755c",
  },
  {
    key: "northStarBorder",
    cssVar: "--north-star-border",
    label: "Chrome border",
    helper: "Structural hairline — sidebar edge, page-header, Settings strip.",
    group: "chrome",
    defaultValue: "#838f68",
  },
  {
    key: "northStarSectionDivider",
    cssVar: "--north-star-section-divider",
    label: "Section divider",
    helper: "MC section band dividers (Needs attention / Schedule bands).",
    group: "chrome",
    defaultValue: "#838f68",
  },
  {
    key: "northStarPlateBorder",
    cssVar: "--north-star-plate-border",
    label: "Plate border",
    helper: "mc-surface card / tile / list plate hairlines.",
    group: "chrome",
    defaultValue: "#838f68",
  },
  {
    key: "northStarHeaderStrip",
    cssVar: "--north-star-header-strip",
    label: "Header strip",
    helper: "Two-tone canvas — page header band.",
    group: "chrome",
    defaultValue: "#4a5540",
  },
  {
    key: "northStarContentWell",
    cssVar: "--north-star-content-well",
    label: "Content well",
    helper: "Two-tone canvas — main content well (independent from sidebar; default #414a35).",
    group: "chrome",
    defaultValue: "#414a35",
  },
  {
    key: "northStarCaughtUpFill",
    cssVar: "--north-star-caught-up-fill",
    label: "Caught-up fill",
    helper:
      "Next Recommended “caught up” card fill — independent from content well.",
    group: "chrome",
    defaultValue: "#414a35",
  },

  /* —— Brass ladder —— */
  {
    key: "northStarBronze",
    cssVar: "--north-star-bronze",
    label: "Bronze",
    helper: "Deepest brass ladder step.",
    group: "brass",
    defaultValue: "#8a6324",
  },
  {
    key: "northStarBrass",
    cssVar: "--north-star-brass",
    label: "Brass",
    helper: "Primary brass mid.",
    group: "brass",
    defaultValue: "#b88a2e",
  },
  {
    key: "northStarGold",
    cssVar: "--north-star-gold",
    label: "Gold",
    helper: "Bright brass / command accent.",
    group: "brass",
    defaultValue: "#c9a44d",
  },
  {
    key: "northStarChampagne",
    cssVar: "--north-star-champagne",
    label: "Champagne",
    helper: "Lightest brass ladder step.",
    group: "brass",
    defaultValue: "#e6d092",
  },
  {
    key: "northStarBrassRail",
    cssVar: "--north-star-brass-rail",
    label: "Brass rail",
    helper: "Active nav rail accent (resolves to gold live).",
    group: "brass",
    defaultValue: "#c9a44d",
  },
  {
    key: "northStarBrassRing",
    cssVar: "--north-star-brass-ring",
    label: "Brass ring",
    helper: "Soft brass focus/halo ring.",
    group: "brass",
    defaultValue: "rgb(201 164 77 / 0.28)",
  },

  /* —— Text on chrome —— */
  {
    key: "northStarTopbarHeading",
    cssVar: "--north-star-topbar-heading",
    label: "Topbar heading",
    helper:
      "Premium header greeting, company/view switchers, hub page-header titles, Settings title.",
    group: "text-on-chrome",
    defaultValue: "#f3ebdd",
  },
  {
    key: "northStarSectionTitle",
    cssVar: "--north-star-section-title",
    label: "Section title",
    helper:
      "Olive-canvas section titles (.altair-canvas-ink), Reports hero, caught-up title.",
    group: "text-on-chrome",
    defaultValue: "#f3ebdd",
  },
  {
    key: "northStarLinkHover",
    cssVar: "--north-star-link-hover",
    label: "Link hover",
    helper: "Canvas “View all” hover + header sign-out hover ink.",
    group: "text-on-chrome",
    defaultValue: "#f3ebdd",
  },
  {
    key: "northStarTopbarSubcopy",
    cssVar: "--north-star-topbar-subcopy",
    label: "Topbar subcopy",
    helper: "Topbar date / switcher helpers / Settings eyebrow / hub header helpers.",
    group: "text-on-chrome",
    defaultValue: "#d6cdb9",
  },
  {
    key: "northStarSectionSecondary",
    cssVar: "--north-star-section-secondary",
    label: "Section secondary",
    helper: "Olive-canvas secondary ink (.altair-canvas-ink-secondary) + caught-up body.",
    group: "text-on-chrome",
    defaultValue: "#d6cdb9",
  },
  {
    key: "northStarLink",
    cssVar: "--north-star-link",
    label: "Link",
    helper: "Canvas link base (.altair-canvas-ink-link) before hover.",
    group: "text-on-chrome",
    defaultValue: "#d6cdb9",
  },
  {
    key: "northStarTopbarIcon",
    cssVar: "--north-star-topbar-icon",
    label: "Topbar icon",
    helper: "Header search / bell / calendar / sign-out base icon ink.",
    group: "text-on-chrome",
    defaultValue: "#d6cdb9",
  },
  {
    key: "northStarIvory",
    cssVar: "--north-star-ivory",
    label: "Ivory",
    helper: "Shell ivory (live shell cools this toward paper-white).",
    group: "text-on-chrome",
    defaultValue: "#f8fafc",
  },
  {
    key: "northStarIvoryStrong",
    cssVar: "--north-star-ivory-strong",
    label: "Ivory strong",
    helper: "Brightest ivory / active link ink on chrome.",
    group: "text-on-chrome",
    defaultValue: "#ffffff",
  },
  {
    key: "northStarTextDark",
    cssVar: "--north-star-text-dark",
    label: "Text dark",
    helper: "Dark ink for light paper nested in chrome.",
    group: "text-on-chrome",
    defaultValue: "#17130e",
  },
  {
    key: "northStarTextSecondary",
    cssVar: "--north-star-text-secondary",
    label: "Text secondary",
    helper: "Secondary dark reading ink.",
    group: "text-on-chrome",
    defaultValue: "#4f4638",
  },
  {
    key: "northStarTextMuted",
    cssVar: "--north-star-text-muted",
    label: "Text muted",
    helper: "Muted metadata ink (shell maps to work-text-muted).",
    group: "text-on-chrome",
    defaultValue: "#64748b",
  },

  /* —— Sidebar states —— */
  {
    key: "northStarSidebarLink",
    cssVar: "--north-star-sidebar-link",
    label: "Sidebar link",
    helper: "Default nav label color.",
    group: "sidebar-states",
    defaultValue: "#d6cdb9",
  },
  {
    key: "northStarSidebarLinkHover",
    cssVar: "--north-star-sidebar-link-hover",
    label: "Sidebar link hover",
    helper: "Nav label on hover (literal; not aliased through link-hover).",
    group: "sidebar-states",
    defaultValue: "#f3ebdd",
  },
  {
    key: "northStarSidebarLinkActive",
    cssVar: "--north-star-sidebar-link-active",
    label: "Sidebar link active",
    helper: "Active destination label (ivory-strong).",
    group: "sidebar-states",
    defaultValue: "#ffffff",
  },
  {
    key: "northStarSidebarIcon",
    cssVar: "--north-star-sidebar-icon",
    label: "Sidebar icon",
    helper: "Default nav icon color.",
    group: "sidebar-states",
    defaultValue: "#c4b9a4",
  },
  {
    key: "northStarSidebarIconHover",
    cssVar: "--north-star-sidebar-icon-hover",
    label: "Sidebar icon hover",
    helper: "Nav icon on hover (champagne).",
    group: "sidebar-states",
    defaultValue: "#e6d092",
  },
  {
    key: "northStarSidebarIconActive",
    cssVar: "--north-star-sidebar-icon-active",
    label: "Sidebar icon active",
    helper: "Active nav icon (champagne).",
    group: "sidebar-states",
    defaultValue: "#e6d092",
  },
  {
    key: "northStarSidebarLabel",
    cssVar: "--north-star-sidebar-label",
    label: "Sidebar group label",
    helper: "Uppercase group labels (gold).",
    group: "sidebar-states",
    defaultValue: "#c9a44d",
  },

  /* —— Surfaces —— */
  {
    key: "surfaceCanvas",
    cssVar: "--surface-canvas",
    label: "Surface canvas",
    helper: "Surface 0 — warm gray page canvas.",
    group: "surfaces",
    defaultValue: "#f3f5f7",
  },
  {
    key: "surfaceSection",
    cssVar: "--surface-section",
    label: "Surface section",
    helper: "Surface 1 — section plates.",
    group: "surfaces",
    defaultValue: "#eef1f4",
  },
  {
    key: "surfacePanel",
    cssVar: "--surface-panel",
    label: "Surface panel",
    helper: "Surface 2 — panels.",
    group: "surfaces",
    defaultValue: "#fafbfc",
  },
  {
    key: "surfaceCard",
    cssVar: "--surface-card",
    label: "Surface card",
    helper: "Surface 2/3 — cards and lists.",
    group: "surfaces",
    defaultValue: "#fafbfc",
  },
  {
    key: "surfaceTile",
    cssVar: "--surface-tile",
    label: "Surface tile",
    helper: "Surface 3 — KPI / metric tiles.",
    group: "surfaces",
    defaultValue: "#f7f8fa",
  },
  {
    key: "surfaceMuted",
    cssVar: "--surface-muted",
    label: "Surface muted",
    helper: "Muted inset surface.",
    group: "surfaces",
    defaultValue: "#e8ecf0",
  },
  {
    key: "borderSubtle",
    cssVar: "--border-subtle",
    label: "Border subtle",
    helper: "Legacy quiet hairline on surface cards / lists.",
    group: "surfaces",
    defaultValue: "rgb(203 213 225 / 0.42)",
  },
  {
    key: "borderStrong",
    cssVar: "--border-strong",
    label: "Border strong",
    helper: "Legacy emphasized surface border.",
    group: "surfaces",
    defaultValue: "rgb(148 163 184 / 0.32)",
  },

  /* —— Altair foundation —— */
  {
    key: "altairStone",
    cssVar: "--altair-stone",
    label: "Stone",
    helper: "Secondary structural backing.",
    group: "altair-foundation",
    defaultValue: "#dce3ec",
  },
  {
    key: "altairPaper",
    cssVar: "--altair-paper",
    label: "Paper",
    helper: "Primary work surface (also exception-board low shell).",
    group: "altair-foundation",
    defaultValue: "#fbf7ef",
  },
  {
    key: "altairPaperElevated",
    cssVar: "--altair-paper-elevated",
    label: "Paper elevated",
    helper: "Brightest focused paper.",
    group: "altair-foundation",
    defaultValue: "#ffffff",
  },
  {
    key: "altairPaperSubtle",
    cssVar: "--altair-paper-subtle",
    label: "Paper subtle",
    helper: "Quiet resting paper plane.",
    group: "altair-foundation",
    defaultValue: "#eef2f6",
  },
  {
    key: "altairGraphite",
    cssVar: "--altair-graphite",
    label: "Graphite",
    helper: "Dark-page panels — Dispatch lanes, Schedule, Reports elevated cards.",
    group: "altair-foundation",
    defaultValue: "#1a2029",
  },
  {
    key: "altairInk",
    cssVar: "--altair-ink",
    label: "Ink",
    helper: "Primary ink and Dispatch / Schedule dark canvas.",
    group: "altair-foundation",
    defaultValue: "#17130e",
  },
  {
    key: "altairInkSecondary",
    cssVar: "--altair-ink-secondary",
    label: "Ink secondary",
    helper: "Secondary ink strength.",
    group: "altair-foundation",
    defaultValue: "#4f4638",
  },
  {
    key: "altairInkMuted",
    cssVar: "--altair-ink-muted",
    label: "Ink muted",
    helper: "Muted ink strength.",
    group: "altair-foundation",
    defaultValue: "#64748b",
  },
  {
    key: "altairBorder",
    cssVar: "--altair-border",
    label: "Border",
    helper: "Quiet separation on paper and dark-page hairlines.",
    group: "altair-foundation",
    defaultValue: "rgb(100 116 139 / 0.18)",
  },
  {
    key: "altairBorderStrong",
    cssVar: "--altair-border-strong",
    label: "Border strong",
    helper: "Emphasized selection/focus border.",
    group: "altair-foundation",
    defaultValue: "rgb(148 163 184 / 0.35)",
  },
  {
    key: "altairBrass",
    cssVar: "--altair-brass",
    label: "Altair brass",
    helper: "Foundation brass command role.",
    group: "altair-foundation",
    defaultValue: "#b88a2e",
  },
  {
    key: "altairBrassInteractive",
    cssVar: "--altair-brass-interactive",
    label: "Altair brass interactive",
    helper: "Brass hover/active.",
    group: "altair-foundation",
    defaultValue: "#c9a44d",
  },
  {
    key: "altairSuccess",
    cssVar: "--altair-success",
    label: "Success",
    helper: "Status mid — icons/dots; exception-board low accent.",
    group: "altair-foundation",
    defaultValue: "#059669",
  },
  {
    key: "altairSuccessForeground",
    cssVar: "--altair-success-foreground",
    label: "Success foreground",
    helper: "Small-text-safe success ink on paper.",
    group: "altair-foundation",
    defaultValue: "#047653",
  },
  {
    key: "altairSuccessSurface",
    cssVar: "--altair-success-surface",
    label: "Success surface",
    helper: "Success tinted paper surface.",
    group: "altair-foundation",
    defaultValue: "#ecfdf5",
  },
  {
    key: "altairWarning",
    cssVar: "--altair-warning",
    label: "Warning",
    helper: "Status mid — amber; exception medium + Dispatch high priority.",
    group: "altair-foundation",
    defaultValue: "#d97706",
  },
  {
    key: "altairWarningForeground",
    cssVar: "--altair-warning-foreground",
    label: "Warning foreground",
    helper: "Small-text-safe warning ink on paper.",
    group: "altair-foundation",
    defaultValue: "#9f5704",
  },
  {
    key: "altairWarningSurface",
    cssVar: "--altair-warning-surface",
    label: "Warning surface",
    helper: "Warning tinted paper — exception-board medium shell.",
    group: "altair-foundation",
    defaultValue: "#fffbeb",
  },
  {
    key: "altairDanger",
    cssVar: "--altair-danger",
    label: "Danger",
    helper: "Status mid — red; exception high + Dispatch urgent priority.",
    group: "altair-foundation",
    defaultValue: "#dc2626",
  },
  {
    key: "altairDangerForeground",
    cssVar: "--altair-danger-foreground",
    label: "Danger foreground",
    helper: "Small-text-safe danger ink on paper.",
    group: "altair-foundation",
    defaultValue: "#d32222",
  },
  {
    key: "altairDangerSurface",
    cssVar: "--altair-danger-surface",
    label: "Danger surface",
    helper: "Danger tinted paper — exception-board high shell.",
    group: "altair-foundation",
    defaultValue: "#fff1f2",
  },
  {
    key: "altairInformation",
    cssVar: "--altair-information",
    label: "Information",
    helper: "Status mid — blue; Dispatch normal priority fill.",
    group: "altair-foundation",
    defaultValue: "#2563eb",
  },
  {
    key: "altairInformationForeground",
    cssVar: "--altair-information-foreground",
    label: "Information foreground",
    helper: "Small-text-safe information ink on paper.",
    group: "altair-foundation",
    defaultValue: "#1a5bea",
  },
  {
    key: "altairInformationSurface",
    cssVar: "--altair-information-surface",
    label: "Information surface",
    helper: "Information tinted paper surface.",
    group: "altair-foundation",
    defaultValue: "#f0f9ff",
  },

  /* —— Hub work tables —— */
  {
    key: "northStarWorkSurface",
    cssVar: "--north-star-work-surface",
    label: "Work surface",
    helper: "Cool-gray table workspace fill.",
    group: "hub-work-tables",
    defaultValue: "#e8edf3",
  },
  {
    key: "northStarWorkBand",
    cssVar: "--north-star-work-band",
    label: "Work band",
    helper: "Table header / filter band.",
    group: "hub-work-tables",
    defaultValue: "#dce3ec",
  },
  {
    key: "northStarWorkRow",
    cssVar: "--north-star-work-row",
    label: "Work row",
    helper: "Default table row fill.",
    group: "hub-work-tables",
    defaultValue: "#ffffff",
  },
  {
    key: "northStarWorkRowHover",
    cssVar: "--north-star-work-row-hover",
    label: "Work row hover",
    helper: "Hovered table row fill.",
    group: "hub-work-tables",
    defaultValue: "#f2f5f8",
  },
  {
    key: "northStarWorkInput",
    cssVar: "--north-star-work-input",
    label: "Work input",
    helper: "Search / filter input fill on table bands.",
    group: "hub-work-tables",
    defaultValue: "#ffffff",
  },
  {
    key: "northStarWorkBorder",
    cssVar: "--north-star-work-border",
    label: "Work border",
    helper: "Quiet table hairline.",
    group: "hub-work-tables",
    defaultValue: "rgb(100 116 139 / 0.18)",
  },
  {
    key: "northStarWorkBorderStrong",
    cssVar: "--north-star-work-border-strong",
    label: "Work border strong",
    helper: "Emphasized input / selection border on tables.",
    group: "hub-work-tables",
    defaultValue: "rgb(148 163 184 / 0.24)",
  },
  {
    key: "northStarWorkText",
    cssVar: "--north-star-work-text",
    label: "Work text",
    helper: "Primary table body ink.",
    group: "hub-work-tables",
    defaultValue: "#101827",
  },
  {
    key: "northStarWorkTextSecondary",
    cssVar: "--north-star-work-text-secondary",
    label: "Work text secondary",
    helper: "Secondary table / header ink.",
    group: "hub-work-tables",
    defaultValue: "#4b5563",
  },
  {
    key: "northStarWorkTextMuted",
    cssVar: "--north-star-work-text-muted",
    label: "Work text muted",
    helper: "Muted metadata ink on table surfaces.",
    group: "hub-work-tables",
    defaultValue: "#64748b",
  },
  {
    key: "northStarWorkPlaceholder",
    cssVar: "--north-star-work-placeholder",
    label: "Work placeholder",
    helper: "Placeholder ink inside table filters.",
    group: "hub-work-tables",
    defaultValue: "#6b7280",
  },
];

export const DESIGN_LAB_COLOR_FIELDS: {
  key: DesignLabColorKey;
  label: string;
  helper: string;
  group: DesignLabTokenGroupId;
  cssVar: string;
}[] = DESIGN_LAB_TOKEN_DEFS.map(({ key, label, helper, group, cssVar }) => ({
  key,
  label,
  helper,
  group,
  cssVar,
}));

export const DESIGN_LAB_CSS_VAR_BY_KEY: Record<DesignLabColorKey, string> =
  Object.fromEntries(
    DESIGN_LAB_TOKEN_DEFS.map((def) => [def.key, def.cssVar]),
  ) as Record<DesignLabColorKey, string>;

export const LIVE_CHROME_DESIGN_LAB_DEFAULTS: DesignLabColors =
  Object.fromEntries(
    DESIGN_LAB_TOKEN_DEFS.map((def) => [def.key, def.defaultValue]),
  ) as DesignLabColors;

/** @deprecated Use LIVE_CHROME_DESIGN_LAB_DEFAULTS — name kept for call-site churn. */
export const NORTH_STAR_DESIGN_LAB_DEFAULTS = LIVE_CHROME_DESIGN_LAB_DEFAULTS;

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const RGB_PATTERN =
  /^rgba?\(\s*[\d.]+\s+[\d.]+\s+[\d.]+(?:\s*\/\s*[\d.%]+)?\s*\)$/i;
const RGB_CHANNELS_PATTERN =
  /^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i;

export type DesignLabColorChannels = {
  r: number;
  g: number;
  b: number;
  /** 0–1 */
  a: number;
};

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toHexByte(value: number): string {
  return clampByte(value).toString(16).padStart(2, "0").toUpperCase();
}

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

export function isValidDesignLabColor(value: string): boolean {
  const trimmed = value.trim();
  return HEX_PATTERN.test(trimmed) || RGB_PATTERN.test(trimmed);
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

/** Parse hex or modern `rgb(r g b / a)` into channels. */
export function parseDesignLabColorChannels(
  value: string,
): DesignLabColorChannels | null {
  const hex = normalizeHexColor(value);
  if (hex) {
    return {
      r: Number.parseInt(hex.slice(1, 3), 16),
      g: Number.parseInt(hex.slice(3, 5), 16),
      b: Number.parseInt(hex.slice(5, 7), 16),
      a: 1,
    };
  }

  const match = value.trim().match(RGB_CHANNELS_PATTERN);
  if (!match) {
    return null;
  }

  const alphaRaw = match[4];
  let a = 1;
  if (alphaRaw != null) {
    a = alphaRaw.endsWith("%")
      ? Number.parseFloat(alphaRaw) / 100
      : Number.parseFloat(alphaRaw);
  }

  return {
    r: clampByte(Number.parseFloat(match[1])),
    g: clampByte(Number.parseFloat(match[2])),
    b: clampByte(Number.parseFloat(match[3])),
    a: clampUnit(Number.isFinite(a) ? a : 1),
  };
}

/**
 * Format channels for storage. Fully opaque → hex (default / no visual change).
 * Transparent → modern `rgb(r g b / a)` accepted by Design Lab + CSS vars.
 */
export function formatDesignLabColorFromChannels(
  channels: DesignLabColorChannels,
): string {
  const r = clampByte(channels.r);
  const g = clampByte(channels.g);
  const b = clampByte(channels.b);
  const a = clampUnit(channels.a);

  if (a >= 0.999) {
    return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  }

  const percent = Math.round(a * 1000) / 10;
  const alphaStr =
    Number.isInteger(percent) || Math.abs(percent - Math.round(percent)) < 0.05
      ? `${Math.round(percent)}%`
      : String(Math.round(a * 1000) / 1000);

  return `rgb(${r} ${g} ${b} / ${alphaStr})`;
}

/** Opacity as 0–100 for editor sliders. Unparseable → 100. */
export function getDesignLabOpacityPercent(value: string): number {
  const channels = parseDesignLabColorChannels(value);
  if (!channels) {
    return 100;
  }
  return Math.round(channels.a * 100);
}

/** Replace opacity while preserving RGB. Returns null if value is unparseable. */
export function withDesignLabOpacity(
  value: string,
  opacityPercent: number,
): string | null {
  const channels = parseDesignLabColorChannels(value);
  if (!channels) {
    return null;
  }

  return formatDesignLabColorFromChannels({
    ...channels,
    a: clampUnit(opacityPercent / 100),
  });
}

/** Replace RGB while preserving opacity. */
export function withDesignLabRgb(
  value: string,
  hexOrRgb: string,
): string | null {
  const nextRgb = parseDesignLabColorChannels(hexOrRgb);
  const current = parseDesignLabColorChannels(value);
  if (!nextRgb) {
    return null;
  }

  return formatDesignLabColorFromChannels({
    r: nextRgb.r,
    g: nextRgb.g,
    b: nextRgb.b,
    a: current?.a ?? 1,
  });
}

/** Normalize hex to uppercase; canonicalize valid rgb()/rgba() literals. */
export function normalizeDesignLabColor(value: string): string | null {
  const channels = parseDesignLabColorChannels(value);
  if (!channels) {
    return null;
  }
  return formatDesignLabColorFromChannels(channels);
}

/** Solid hex for `<input type="color">` — strips alpha. */
export function designLabColorPickerValue(value: string): string {
  const channels = parseDesignLabColorChannels(value);
  if (!channels) {
    return "#808080";
  }
  return formatDesignLabColorFromChannels({ ...channels, a: 1 });
}

export function getDesignLabTokenDef(
  key: DesignLabColorKey,
): DesignLabTokenDef | undefined {
  return DESIGN_LAB_TOKEN_DEFS.find((def) => def.key === key);
}
