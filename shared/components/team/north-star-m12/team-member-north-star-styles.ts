import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { settingsNorthStarStyles as settingsSt } from "@/shared/components/settings/north-star-m10/settings-north-star-styles";

export const teamMemberNorthStarStyles = {
  pageCanvas: dt.pageCanvas,
  backLink: dt.backLink,
  heroShell: dt.heroShell,
  heroAccentRail: dt.heroAccentRail,
  heroEyebrow: dt.heroEyebrow,
  heroTitle: dt.heroTitle,
  heroMeta: dt.heroMeta,
  heroMetaIcon: dt.heroMetaIcon,
  heroAvatar: dt.heroAvatar,
  workspaceGrid: dt.workspaceGrid,
  workspaceMain: dt.workspaceMain,
  workspaceSide: dt.workspaceSide,
  sectionSurface: dt.sectionSurface,
  sectionTitle: dt.sectionTitle,
  sectionSubtitle: dt.sectionSubtitle,
  metaRow: "flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-[rgba(138,99,36,0.08)] py-2.5 last:border-b-0",
  metaLabel: "text-xs font-semibold text-[#6B6255]",
  metaValue: "text-sm font-medium text-[#17130E]",
  tagChip: dt.ivoryTagChip,
  emptyState: dt.emptyState,
  listDivider: dt.listDivider,
  listRow:
    "flex min-h-11 items-start gap-2 rounded-lg px-1 py-2 transition-colors hover:bg-[rgba(201,164,77,0.08)]",
  activityType:
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6324]",
  activityLabel: "text-sm font-semibold text-[#17130E]",
  activityDetail: "mt-0.5 truncate text-xs text-[#6B6255]",
  activityTime: "mt-0.5 text-[11px] text-[#6B6255]",
  metricCard: dt.metricCard,
  metricLabel: dt.metricLabel,
  metricValue: dt.metricValue,
  metricValueAccent: "mt-0.5 text-sm font-bold tabular-nums text-emerald-800",
  formInput: settingsSt.formInput,
  formTextarea: settingsSt.formTextarea,
  formLabel: settingsSt.formLabel,
  saveButton: settingsSt.saveButton,
  secondaryButton: settingsSt.panelAction,
  feedbackSuccess:
    "rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-sm text-emerald-900",
  feedbackError:
    "rounded-lg border border-rose-200/80 bg-rose-50 px-3 py-2 text-sm text-rose-900",
  bannerInvited:
    "rounded-lg border border-amber-200/70 bg-amber-50/90 px-3 py-2 text-sm text-amber-950",
  bannerSuspended:
    "rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#F5F0E4] px-3 py-2 text-sm text-[#4F4638]",
  statusActive:
    "inline-flex items-center rounded-full bg-[rgba(16,185,129,0.12)] px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-[rgba(16,185,129,0.22)]",
  statusInvited:
    "inline-flex items-center rounded-full bg-[rgba(245,158,11,0.12)] px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-[rgba(245,158,11,0.22)]",
  statusSuspended:
    "inline-flex items-center rounded-full bg-[rgba(138,99,36,0.08)] px-2.5 py-0.5 text-xs font-medium text-[#6B6255] ring-1 ring-[rgba(138,99,36,0.14)]",
  toggleTrackOn: "bg-[#B88A2E]",
  toggleTrackOff: "bg-[rgba(138,99,36,0.18)]",
  certChip:
    "inline-flex items-center gap-1 rounded-full border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-2.5 py-1 text-sm font-medium text-[#4F4638]",
  certRemove:
    "ml-0.5 text-[#6B6255] transition-colors hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60",
} as const;

export const tm = teamMemberNorthStarStyles;
