import {
  DESIGN_LAB_COLOR_FIELDS,
  type DesignLabColorKey,
  type DesignLabColors,
  type DesignLabTokenGroupId,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

export type DesignLabEditTargetId =
  | "chrome-shell"
  | "chrome-panel"
  | "chrome-border"
  | "section-divider"
  | "plate-border"
  | "header-strip"
  | "content-well"
  | "caught-up-fill"
  | "brass-ladder"
  | "text-on-chrome"
  | "topbar-heading"
  | "section-title"
  | "link-hover"
  | "topbar-subcopy"
  | "section-secondary"
  | "link-base"
  | "topbar-icon"
  | "sidebar-shell"
  | "sidebar-states"
  | "surface-hierarchy"
  | "border-subtle"
  | "border-strong"
  | "altair-materials"
  | "altair-border"
  | "altair-border-strong"
  | "altair-status"
  | "dark-pages"
  | "status-colors"
  | "hub-work-tables"
  | "work-border"
  | "work-border-strong"
  | "topbar-shell";

export type DesignLabEditTarget = {
  id: DesignLabEditTargetId;
  label: string;
  helper: string;
  fields: DesignLabColorKey[];
  group?: DesignLabTokenGroupId;
};

function keysInGroup(group: DesignLabTokenGroupId): DesignLabColorKey[] {
  return DESIGN_LAB_COLOR_FIELDS.filter((field) => field.group === group).map(
    (field) => field.key,
  );
}

/** Ivory + dark reading ink — light-ink roles have individual targets. */
const TEXT_ON_CHROME_REMAINING: DesignLabColorKey[] = [
  "northStarIvory",
  "northStarIvoryStrong",
  "northStarTextDark",
  "northStarTextSecondary",
  "northStarTextMuted",
];

export const DESIGN_LAB_EDIT_TARGETS: DesignLabEditTarget[] = [
  {
    id: "chrome-shell",
    label: "Page canvas",
    helper: "Outer shell canvas behind sidebar + main (`--north-star-root`).",
    fields: ["northStarRoot"],
    group: "chrome",
  },
  {
    id: "chrome-panel",
    label: "Chrome panel",
    helper: "Elevated chrome panel mid-tone (`--north-star-panel`).",
    fields: ["northStarPanel"],
    group: "chrome",
  },
  {
    id: "chrome-border",
    label: "Chrome border",
    helper:
      "Structural hairline — sidebar edge, page-header, Settings strip (`--north-star-border`).",
    fields: ["northStarBorder"],
    group: "chrome",
  },
  {
    id: "section-divider",
    label: "Section divider",
    helper:
      "MC section band dividers (`--north-star-section-divider`).",
    fields: ["northStarSectionDivider"],
    group: "chrome",
  },
  {
    id: "plate-border",
    label: "Plate border",
    helper: "mc-surface plate hairlines (`--north-star-plate-border`).",
    fields: ["northStarPlateBorder"],
    group: "chrome",
  },
  {
    id: "header-strip",
    label: "Header strip",
    helper: "Two-tone page header band (`--north-star-header-strip`).",
    fields: ["northStarHeaderStrip"],
    group: "chrome",
  },
  {
    id: "content-well",
    label: "Content well",
    helper:
      "Main content-well canvas — independent from sidebar (`--north-star-content-well`).",
    fields: ["northStarContentWell"],
    group: "chrome",
  },
  {
    id: "caught-up-fill",
    label: "Caught-up fill",
    helper:
      "Next Recommended caught-up card fill (`--north-star-caught-up-fill`).",
    fields: ["northStarCaughtUpFill"],
    group: "chrome",
  },
  {
    id: "brass-ladder",
    label: "Brass ladder",
    helper: "Bronze / brass / gold / champagne plus rail and ring.",
    fields: keysInGroup("brass"),
    group: "brass",
  },
  {
    id: "topbar-heading",
    label: "Topbar heading",
    helper: "Premium header / hub / Settings chrome heading (`--north-star-topbar-heading`).",
    fields: ["northStarTopbarHeading"],
    group: "text-on-chrome",
  },
  {
    id: "section-title",
    label: "Section title",
    helper: "Olive-canvas section titles (`--north-star-section-title`).",
    fields: ["northStarSectionTitle"],
    group: "text-on-chrome",
  },
  {
    id: "link-hover",
    label: "Link hover",
    helper: "Canvas link hover + sign-out hover (`--north-star-link-hover`).",
    fields: ["northStarLinkHover"],
    group: "text-on-chrome",
  },
  {
    id: "topbar-subcopy",
    label: "Topbar subcopy",
    helper: "Topbar / hub header secondary copy (`--north-star-topbar-subcopy`).",
    fields: ["northStarTopbarSubcopy"],
    group: "text-on-chrome",
  },
  {
    id: "section-secondary",
    label: "Section secondary",
    helper: "Olive-canvas secondary ink (`--north-star-section-secondary`).",
    fields: ["northStarSectionSecondary"],
    group: "text-on-chrome",
  },
  {
    id: "link-base",
    label: "Link",
    helper: "Canvas link base before hover (`--north-star-link`).",
    fields: ["northStarLink"],
    group: "text-on-chrome",
  },
  {
    id: "topbar-icon",
    label: "Topbar icon",
    helper: "Header icon ink (`--north-star-topbar-icon`).",
    fields: ["northStarTopbarIcon"],
    group: "text-on-chrome",
  },
  {
    id: "text-on-chrome",
    label: "Text on chrome",
    helper: "Ivory and dark reading ink for olive shell surfaces.",
    fields: TEXT_ON_CHROME_REMAINING,
    group: "text-on-chrome",
  },
  {
    id: "sidebar-shell",
    label: "Sidebar shell",
    helper: "Sidebar olive plane.",
    fields: ["northStarSidebar"],
    group: "chrome",
  },
  {
    id: "sidebar-states",
    label: "Sidebar states",
    helper: "Link, icon, and group-label colors including hover/active.",
    fields: keysInGroup("sidebar-states"),
    group: "sidebar-states",
  },
  {
    id: "topbar-shell",
    label: "Topbar shell",
    helper: "Premium header background (`--north-star-topbar`).",
    fields: ["northStarTopbar"],
    group: "chrome",
  },
  {
    id: "surface-hierarchy",
    label: "Surface hierarchy",
    helper: "Canvas → section → panel → card → tile → muted.",
    fields: keysInGroup("surfaces").filter(
      (key) => key !== "borderSubtle" && key !== "borderStrong",
    ),
    group: "surfaces",
  },
  {
    id: "border-subtle",
    label: "Border subtle",
    helper: "Legacy quiet surface hairline (`--border-subtle`).",
    fields: ["borderSubtle"],
    group: "surfaces",
  },
  {
    id: "border-strong",
    label: "Border strong",
    helper: "Legacy emphasized surface border (`--border-strong`).",
    fields: ["borderStrong"],
    group: "surfaces",
  },
  {
    id: "altair-materials",
    label: "Altair materials",
    helper: "Foundation materials — stone, paper, graphite, ink, brass (borders are separate).",
    fields: [
      "altairStone",
      "altairPaper",
      "altairPaperElevated",
      "altairPaperSubtle",
      "altairGraphite",
      "altairInk",
      "altairInkSecondary",
      "altairInkMuted",
      "altairBrass",
      "altairBrassInteractive",
    ],
    group: "altair-foundation",
  },
  {
    id: "altair-border",
    label: "Altair border",
    helper: "Quiet separation on paper and dark-page hairlines (`--altair-border`).",
    fields: ["altairBorder"],
    group: "altair-foundation",
  },
  {
    id: "altair-border-strong",
    label: "Altair border strong",
    helper: "Emphasized selection/focus border (`--altair-border-strong`).",
    fields: ["altairBorderStrong"],
    group: "altair-foundation",
  },
  {
    id: "altair-status",
    label: "Altair status",
    helper: "Full status set — success / warning / danger / information mid + foreground + surface.",
    fields: [
      "altairSuccess",
      "altairSuccessForeground",
      "altairSuccessSurface",
      "altairWarning",
      "altairWarningForeground",
      "altairWarningSurface",
      "altairDanger",
      "altairDangerForeground",
      "altairDangerSurface",
      "altairInformation",
      "altairInformationForeground",
      "altairInformationSurface",
    ],
    group: "altair-foundation",
  },
  {
    id: "dark-pages",
    label: "Dark pages",
    helper:
      "Shared foundation materials used by Dispatch, Schedule, and Reports — not Dispatch-only colors.",
    fields: [
      "altairInk",
      "altairGraphite",
      "altairPaper",
      "altairBrass",
    ],
    group: "altair-foundation",
  },
  {
    id: "status-colors",
    label: "Status colors",
    helper:
      "Shared status tokens — Dashboard exception board, Dispatch priority fills, and status UI across the product.",
    fields: [
      "altairSuccess",
      "altairSuccessForeground",
      "altairSuccessSurface",
      "altairWarning",
      "altairWarningForeground",
      "altairWarningSurface",
      "altairDanger",
      "altairDangerForeground",
      "altairDangerSurface",
      "altairInformation",
      "altairInformationForeground",
      "altairInformationSurface",
    ],
    group: "altair-foundation",
  },
  {
    id: "hub-work-tables",
    label: "Hub work tables",
    helper:
      "Cool-gray table fills/text for Customers / Team / Work / Sales (borders are separate).",
    fields: keysInGroup("hub-work-tables").filter(
      (key) => key !== "northStarWorkBorder" && key !== "northStarWorkBorderStrong",
    ),
    group: "hub-work-tables",
  },
  {
    id: "work-border",
    label: "Work border",
    helper: "Quiet hub table hairline (`--north-star-work-border`).",
    fields: ["northStarWorkBorder"],
    group: "hub-work-tables",
  },
  {
    id: "work-border-strong",
    label: "Work border strong",
    helper: "Emphasized input / selection border on tables (`--north-star-work-border-strong`).",
    fields: ["northStarWorkBorderStrong"],
    group: "hub-work-tables",
  },
];

export function getDesignLabEditTarget(
  id: DesignLabEditTargetId,
): DesignLabEditTarget | undefined {
  return DESIGN_LAB_EDIT_TARGETS.find((target) => target.id === id);
}

export function getDesignLabColorFieldMeta(key: keyof DesignLabColors) {
  return DESIGN_LAB_COLOR_FIELDS.find((field) => field.key === key);
}
