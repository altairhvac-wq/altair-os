import {
  DESIGN_LAB_COLOR_FIELDS,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

export type DesignLabEditTargetId =
  | "page-background"
  | "card-surface"
  | "primary-action"
  | "secondary-action"
  | "header-text"
  | "body-text"
  | "muted-text"
  | "success-badge"
  | "warning-badge"
  | "danger-badge"
  | "sidebar-shell"
  | "sidebar-active-item"
  | "topbar-shell";

export type DesignLabEditTarget = {
  id: DesignLabEditTargetId;
  label: string;
  helper: string;
  fields: Array<keyof DesignLabColors>;
};

export const DESIGN_LAB_EDIT_TARGETS: DesignLabEditTarget[] = [
  {
    id: "page-background",
    label: "Page background",
    helper: "Outer shell and page canvas behind cards.",
    fields: ["pageBackground"],
  },
  {
    id: "card-surface",
    label: "Card surface",
    helper: "Main work surfaces, cards, and their outlines.",
    fields: ["cardBackground", "cardBorder"],
  },
  {
    id: "primary-action",
    label: "Primary action buttons",
    helper: "Main calls to action, such as Dispatch board.",
    fields: ["primaryButton", "primaryButtonText"],
  },
  {
    id: "secondary-action",
    label: "Secondary action buttons",
    helper: "Secondary actions inside the preview, such as New job.",
    fields: ["secondaryButton", "secondaryButtonText"],
  },
  {
    id: "header-text",
    label: "Header text",
    helper: "Large titles on dark shell areas.",
    fields: ["headerText"],
  },
  {
    id: "body-text",
    label: "Body text",
    helper: "Main readable content inside cards.",
    fields: ["bodyText"],
  },
  {
    id: "muted-text",
    label: "Muted text",
    helper: "Helper text, metadata, and descriptions.",
    fields: ["mutedText"],
  },
  {
    id: "success-badge",
    label: "Success badge",
    helper: "Positive status states such as Ready or Completed.",
    fields: ["successBadge"],
  },
  {
    id: "warning-badge",
    label: "Warning badge",
    helper: "Needs-attention status states.",
    fields: ["warningBadge"],
  },
  {
    id: "danger-badge",
    label: "Danger badge",
    helper: "Error or blocked status states.",
    fields: ["dangerBadge"],
  },
  {
    id: "sidebar-shell",
    label: "Sidebar shell",
    helper: "Preview-only sidebar background and navigation text.",
    fields: ["sidebarBackground", "sidebarText", "sidebarMutedText"],
  },
  {
    id: "sidebar-active-item",
    label: "Sidebar active item",
    helper: "Preview-only active navigation item surface.",
    fields: ["sidebarActiveBackground", "sidebarText"],
  },
  {
    id: "topbar-shell",
    label: "Topbar shell",
    helper: "Preview-only top header background and text.",
    fields: ["topbarBackground", "topbarText"],
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
