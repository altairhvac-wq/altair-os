/** Altair Shell Color Lab v1 — frozen v3 layout, palette-only exploration. */

export type PaletteId =
  | "mission-control-refined"
  | "graphite-brass"
  | "luxury-hybrid"
  | "warm-executive";

export type HeroMode = "dark" | "light";

export type PaletteTokens = {
  id: PaletteId;
  label: string;
  intent: string;
  heroMode: HeroMode;

  root: string;
  topBar: string;
  sidebar: string;
  navActiveRail: string;
  sidebarLogoRing: string;
  sidebarActiveIcon: string;
  sidebarActiveRing: string;
  sidebarFooterAccent: string;
  topBarAvatarRing: string;

  canvas: string;
  canvasGlowPrimary: string;
  canvasGlowSecondary: string;

  heroShell: string;
  heroAccentRail: string;
  heroHeader: string;
  heroBody: string;
  heroFooter: string;

  eyebrowAccent: string;
  eyebrowLight: string;
  heroTitle: string;
  bodyPrimary: string;
  bodySecondary: string;
  meta: string;
  metaDark: string;
  bodySecondaryDark: string;
  conceptMarker: string;
  conceptMarkerText: string;

  primaryAction: string;
  accentCta: string;
  accentBadge: string;
  accentLine: string;
  secondaryAction: string;
  secondaryActionIndex: string;
  insightSurface: string;
  signalChip: string;
  signalLabel: string;
  opsScoreInline: string;
  opsScoreLabel: string;
  opsScoreValue: string;
  opsScoreTrack: string;
  opsScoreFill: string;
  opsScoreDivider: string;
  liveBadge: string;
  primaryActionMetric: string;

  operatingBoard: string;
  boardHeader: string;
  boardTopAccent: string;
  boardTitle: string;
  columnHeader: string;
  columnRail: string;
  row: string;
  workspaceSubheading: string;
  labelMuted: string;
  link: string;
  connectionChip: string;
  connectionArrow: string;
  columnDivider: string;
  officeHover: string;
  soonBadge: string;
  soonBadgeRing: string;
  techAvatarBg: string;
  moneyTrack: string;
  moneyLeadBorder: string;

  footer: string;
  footerTopAccent: string;
  footerSection: string;
  footerMetric: string;
  surfaceInset: string;
  momentumDot: string;
  activityTitle: string;
  activityTime: string;
  metricLabel: string;
  metricDelta: string;

  healthScoreTrack: string;
  healthScoreGradientId: string;
  healthScoreGradientStart: string;
  healthScoreGradientEnd: string;
  healthScoreValue: string;
  systemStatusText: string;
  systemNotificationText: string;

  intelligenceAccent: string;
};

const sharedSemantics = {
  healthScoreGradientStart: "#059669",
  healthScoreGradientEnd: "#047857",
  healthScoreValue: "text-[11px] font-bold tabular-nums text-emerald-800",
  systemStatusText: "inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700",
} as const;

export const missionControlRefined: PaletteTokens = {
  id: "mission-control-refined",
  label: "Mission Control Original Refined",
  intent: "Dark graphite shell, navy hero, cyan live signals — energy without cyberpunk glow.",
  heroMode: "dark",

  root: "bg-[#0b1220]",
  topBar:
    "flex shrink-0 items-center justify-between gap-4 border-b border-slate-800/60 bg-[#0b1220]/95 px-4 py-3 backdrop-blur-2xl sm:px-6",
  sidebar:
    "hidden w-[16rem] shrink-0 flex-col border-r border-slate-800/60 bg-gradient-to-b from-[#0b1220] via-[#0e1628] to-[#0b1220] lg:flex",
  navActiveRail:
    "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-400",
  sidebarLogoRing: "ring-1 ring-cyan-500/30",
  sidebarActiveIcon: "text-cyan-400",
  sidebarActiveRing: "ring-1 ring-cyan-500/25",
  sidebarFooterAccent: "text-cyan-400/90",
  topBarAvatarRing: "ring-1 ring-cyan-500/25",

  canvas:
    "relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#d8e0ea_0%,#e4eaf1_28%,#edf1f6_62%,#f2f5f8_100%)]",
  canvasGlowPrimary:
    "pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_60%_70%_at_30%_0%,rgba(56,189,248,0.08),transparent_70%)]",
  canvasGlowSecondary:
    "pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_100%_0%,rgba(100,116,139,0.06),transparent_68%)]",

  heroShell:
    "relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#111b2e]/98 via-[#0e1726]/96 to-[#0b1220]/98 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset] ring-1 ring-slate-700/35",
  heroAccentRail:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(56,189,248,0.45)] to-transparent",
  heroHeader: "border-b border-slate-700/30 px-5 py-4 sm:px-6 sm:py-5",
  heroBody: "px-5 py-4 sm:px-6 sm:py-5",
  heroFooter: "border-t border-slate-700/25 bg-slate-900/20 px-5 py-4 sm:px-6",

  eyebrowAccent: "text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/90",
  eyebrowLight: "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400",
  heroTitle: "text-xl font-semibold tracking-tight text-white sm:text-2xl",
  bodyPrimary: "text-sm font-medium text-slate-200",
  bodySecondary: "text-sm text-slate-300",
  meta: "text-xs text-slate-400",
  metaDark: "text-xs text-slate-400",
  bodySecondaryDark: "text-sm text-slate-300",
  conceptMarker:
    "inline-flex items-center rounded-full bg-violet-950/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/90 ring-1 ring-violet-500/25",
  conceptMarkerText: "text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500",

  primaryAction:
    "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-cyan-400 bg-gradient-to-br from-[#0f1a2e] via-[#0c1525] to-[#0a1220] p-4 text-left shadow-[0_10px_36px_-14px_rgba(0,0,0,0.42)] ring-1 ring-cyan-500/20 transition-all hover:border-l-cyan-300 hover:ring-cyan-400/30 sm:flex-row sm:items-center sm:justify-between sm:p-5",
  accentCta:
    "relative inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_2px_10px_rgba(34,211,238,0.22)] transition-all group-hover:bg-cyan-400 sm:self-center",
  accentBadge:
    "inline-flex items-center rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300 ring-1 ring-cyan-500/30",
  accentLine: "h-px bg-gradient-to-r from-transparent via-[rgba(56,189,248,0.35)] to-transparent",
  secondaryAction:
    "group inline-flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-800/40 px-3 py-2 transition-all hover:border-cyan-500/30 hover:bg-slate-800/60",
  secondaryActionIndex:
    "flex h-5 w-5 items-center justify-center rounded-md bg-slate-700/80 text-[10px] font-bold tabular-nums text-cyan-300",
  insightSurface:
    "rounded-lg border-l-2 border-l-violet-400/60 bg-slate-800/35 px-4 py-3 ring-1 ring-slate-700/40",
  signalChip:
    "flex flex-col gap-0.5 rounded-lg border border-slate-600/40 bg-slate-800/35 px-3 py-2",
  signalLabel: "text-[10px] leading-tight text-slate-400",
  opsScoreInline:
    "inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-slate-800/40 px-3 py-1.5",
  opsScoreLabel: "text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/80",
  opsScoreValue: "text-lg font-semibold tabular-nums text-white",
  opsScoreTrack: "h-1.5 w-16 overflow-hidden rounded-full bg-slate-700/80",
  opsScoreFill: "h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600",
  opsScoreDivider: "h-4 w-px bg-cyan-500/25",
  liveBadge:
    "inline-flex items-center gap-1.5 rounded-md border border-cyan-500/25 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-medium text-cyan-300",
  primaryActionMetric: "mt-1.5 text-base font-medium tabular-nums text-cyan-200",

  operatingBoard:
    "relative overflow-hidden rounded-[1.5rem] bg-[#f6f8fb]/92 shadow-[0_10px_44px_-14px_rgba(15,23,42,0.10),0_0_0_1px_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-200/80",
  boardHeader: "border-b border-slate-200/80 px-5 py-4 sm:px-6 sm:py-5",
  boardTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(56,189,248,0.30)] to-transparent",
  boardTitle: "text-lg font-semibold text-slate-900 sm:text-xl",
  columnHeader:
    "rounded-lg border border-slate-200/90 bg-white/85 px-3.5 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.04)]",
  columnRail:
    "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-slate-300/60 to-transparent lg:block",
  row: "flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.03)] transition-all hover:border-cyan-300/50 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]",
  workspaceSubheading: "text-base font-semibold text-slate-900",
  labelMuted: "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500",
  link: "text-xs font-medium text-cyan-700 transition-colors hover:text-cyan-800",
  connectionChip:
    "inline-flex items-center gap-1.5 rounded-md border border-slate-200/90 bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-slate-600",
  connectionArrow: "h-3 w-3 text-cyan-600",
  columnDivider: "border-[rgba(148,163,184,0.25)]",
  officeHover: "hover:bg-slate-100",
  soonBadge: "bg-slate-100 text-slate-700",
  soonBadgeRing: "ring-slate-200",
  techAvatarBg: "bg-slate-200",
  moneyTrack: "bg-slate-200",
  moneyLeadBorder: "border-l-cyan-500",

  footer:
    "relative overflow-hidden rounded-[1.25rem] bg-[#f6f8fb]/90 shadow-[0_6px_28px_-10px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.85)_inset] ring-1 ring-slate-200/80",
  footerTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(56,189,248,0.25)] to-transparent",
  footerSection: "border-t border-slate-200/70 first:border-t-0",
  footerMetric:
    "px-4 py-3.5 sm:px-5 border-b border-slate-200/60 sm:border-b-0 sm:border-r last:border-r-0 last:border-b-0",
  surfaceInset:
    "rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]",
  momentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500",
  activityTitle: "min-w-0 flex-1 text-xs font-medium text-slate-800",
  activityTime: "shrink-0 text-[10px] tabular-nums text-slate-500",
  metricLabel: "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500",
  metricDelta: "text-[11px] text-slate-500",

  healthScoreTrack: "rgba(148,163,184,0.25)",
  healthScoreGradientId: "mc-health-score",
  ...sharedSemantics,
  systemNotificationText: "inline-flex items-center gap-1 text-[11px] text-slate-500",

  intelligenceAccent: "text-violet-400/80",
};

export const graphiteBrass: PaletteTokens = {
  id: "graphite-brass",
  label: "Graphite Brass",
  intent: "Dark shell and hero with crisp warm workspace — gold as premium command accent, not beige.",
  heroMode: "dark",

  root: "bg-[#0F141B]",
  topBar:
    "flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#111720]/95 px-4 py-3 backdrop-blur-2xl sm:px-6",
  sidebar:
    "hidden w-[16rem] shrink-0 flex-col border-r border-white/[0.08] bg-gradient-to-b from-[#0F141B] via-[#111720] to-[#0F141B] lg:flex",
  navActiveRail:
    "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#C6A757]",
  sidebarLogoRing: "ring-1 ring-[rgba(198,167,87,0.35)]",
  sidebarActiveIcon: "text-[#C6A757]",
  sidebarActiveRing: "ring-1 ring-[rgba(198,167,87,0.28)]",
  sidebarFooterAccent: "text-[#C6A757]",
  topBarAvatarRing: "ring-1 ring-[rgba(198,167,87,0.28)]",

  canvas:
    "relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F8F6F2_0%,#F3F0EA_28%,#F8F6F2_72%,#FCFBF8_100%)]",
  canvasGlowPrimary:
    "pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_60%_70%_at_30%_0%,rgba(198,167,87,0.06),transparent_70%)]",
  canvasGlowSecondary:
    "pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_100%_0%,rgba(30,27,22,0.04),transparent_68%)]",

  heroShell:
    "relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#171A1F] via-[#141B24] to-[#111720] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.05)_inset] ring-1 ring-[rgba(198,167,87,0.18)]",
  heroAccentRail:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.50)] to-transparent",
  heroHeader: "border-b border-[rgba(198,167,87,0.14)] px-5 py-4 sm:px-6 sm:py-5",
  heroBody: "px-5 py-4 sm:px-6 sm:py-5",
  heroFooter: "border-t border-[rgba(198,167,87,0.12)] bg-black/15 px-5 py-4 sm:px-6",

  eyebrowAccent: "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C6A757]",
  eyebrowLight: "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400",
  heroTitle: "text-xl font-semibold tracking-tight text-white sm:text-2xl",
  bodyPrimary: "text-sm font-medium text-slate-200",
  bodySecondary: "text-sm text-slate-300",
  meta: "text-xs text-slate-400",
  metaDark: "text-xs text-slate-400",
  bodySecondaryDark: "text-sm text-slate-300",
  conceptMarker:
    "inline-flex items-center rounded-full bg-[rgba(198,167,87,0.12)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.30)]",
  conceptMarkerText: "text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(41,34,24,0.48)]",

  primaryAction:
    "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-[#C6A757] bg-gradient-to-br from-[#171A1F] via-[#141B24] to-[#111720] p-4 text-left shadow-[0_10px_36px_-14px_rgba(0,0,0,0.38)] ring-1 ring-[rgba(198,167,87,0.18)] transition-all hover:border-l-[#D4B76A] hover:ring-[rgba(198,167,87,0.32)] sm:flex-row sm:items-center sm:justify-between sm:p-5",
  accentCta:
    "relative inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[#B8943F] px-4 py-2.5 text-sm font-semibold text-[#FCFBF8] shadow-[0_2px_10px_rgba(184,148,63,0.28)] transition-all group-hover:bg-[#C6A757] sm:self-center",
  accentBadge:
    "inline-flex items-center rounded-md bg-[rgba(198,167,87,0.18)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.32)]",
  accentLine: "h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.40)] to-transparent",
  secondaryAction:
    "group inline-flex items-center gap-2 rounded-lg border border-slate-600/45 bg-slate-800/35 px-3 py-2 transition-all hover:border-[rgba(198,167,87,0.30)] hover:bg-slate-800/55",
  secondaryActionIndex:
    "flex h-5 w-5 items-center justify-center rounded-md bg-slate-700/70 text-[10px] font-bold tabular-nums text-[#C6A757]",
  insightSurface:
    "rounded-lg border-l-2 border-l-[#C6A757] bg-slate-800/30 px-4 py-3 ring-1 ring-slate-700/35",
  signalChip:
    "flex flex-col gap-0.5 rounded-lg border border-slate-600/40 bg-slate-800/30 px-3 py-2",
  signalLabel: "text-[10px] leading-tight text-slate-400",
  opsScoreInline:
    "inline-flex items-center gap-2 rounded-lg border border-[rgba(198,167,87,0.22)] bg-slate-800/35 px-3 py-1.5",
  opsScoreLabel: "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C6A757]",
  opsScoreValue: "text-lg font-semibold tabular-nums text-white",
  opsScoreTrack: "h-1.5 w-16 overflow-hidden rounded-full bg-slate-700/70",
  opsScoreFill: "h-full rounded-full bg-gradient-to-r from-[#C6A757] to-[#8B7232]",
  opsScoreDivider: "h-4 w-px bg-[rgba(198,167,87,0.28)]",
  liveBadge:
    "inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-950/35 px-2 py-0.5 text-[10px] font-medium text-emerald-300",
  primaryActionMetric: "mt-1.5 text-base font-medium tabular-nums text-[#E8DDC2]",

  operatingBoard:
    "relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#FCFBF8_0%,#F8F6F2_48%,#FCFBF8_100%)] shadow-[0_10px_44px_-14px_rgba(30,27,22,0.10),0_0_0_1px_rgba(255,255,255,0.88)_inset] ring-1 ring-[rgba(30,27,22,0.08)]",
  boardHeader: "border-b border-[rgba(198,167,87,0.14)] px-5 py-4 sm:px-6 sm:py-5",
  boardTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.40)] to-transparent",
  boardTitle: "text-lg font-semibold text-[#1E1B16] sm:text-xl",
  columnHeader:
    "rounded-lg border border-[rgba(198,167,87,0.14)] bg-[#FCFBF8]/90 px-3.5 py-3 shadow-[0_1px_4px_rgba(30,27,22,0.04)]",
  columnRail:
    "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[rgba(198,167,87,0.28)] to-transparent lg:block",
  row: "flex items-center gap-3 rounded-lg border border-[rgba(30,27,22,0.07)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFBF8_100%)] px-3.5 py-3 shadow-[0_1px_4px_rgba(30,27,22,0.04)] transition-all hover:border-[rgba(198,167,87,0.22)] hover:shadow-[0_4px_14px_rgba(30,27,22,0.07)]",
  workspaceSubheading: "text-base font-semibold text-[#1E1B16]",
  labelMuted: "text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(30,27,22,0.48)]",
  link: "text-xs font-medium text-[#8B7232] transition-colors hover:text-[#6B5A2E]",
  connectionChip:
    "inline-flex items-center gap-1.5 rounded-md border border-[rgba(198,167,87,0.16)] bg-[#FCFBF8]/85 px-2.5 py-1.5 text-[10px] font-medium text-[rgba(30,27,22,0.72)]",
  connectionArrow: "h-3 w-3 text-[#B8943F]",
  columnDivider: "border-[rgba(198,167,87,0.12)]",
  officeHover: "hover:bg-[#F3F0EA]/80",
  soonBadge: "bg-[#F3F0EA] text-[#3D3428]",
  soonBadgeRing: "ring-[rgba(30,27,22,0.10)]",
  techAvatarBg: "bg-[#F3F0EA]",
  moneyTrack: "bg-[#F3F0EA]",
  moneyLeadBorder: "border-l-[#B8943F]",

  footer:
    "relative overflow-hidden rounded-[1.25rem] bg-[linear-gradient(180deg,#FCFBF8_0%,#F8F6F2_100%)] shadow-[0_6px_28px_-10px_rgba(30,27,22,0.08),0_0_0_1px_rgba(255,255,255,0.85)_inset] ring-1 ring-[rgba(30,27,22,0.08)]",
  footerTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.35)] to-transparent",
  footerSection: "border-t border-[rgba(198,167,87,0.12)] first:border-t-0",
  footerMetric:
    "px-4 py-3.5 sm:px-5 border-b border-[rgba(198,167,87,0.10)] sm:border-b-0 sm:border-r last:border-r-0 last:border-b-0",
  surfaceInset:
    "rounded-lg border border-[rgba(30,27,22,0.07)] bg-[#FCFBF8]/85 px-3 py-2.5 shadow-[0_1px_3px_rgba(30,27,22,0.03)]",
  momentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8943F]",
  activityTitle: "min-w-0 flex-1 text-xs font-medium text-[#1E1B16]",
  activityTime: "shrink-0 text-[10px] tabular-nums text-[rgba(30,27,22,0.48)]",
  metricLabel: "text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(30,27,22,0.48)]",
  metricDelta: "text-[11px] text-[rgba(30,27,22,0.58)]",

  healthScoreTrack: "rgba(198,167,87,0.20)",
  healthScoreGradientId: "gb-health-score",
  ...sharedSemantics,
  systemNotificationText: "inline-flex items-center gap-1 text-[11px] text-[rgba(30,27,22,0.58)]",

  intelligenceAccent: "text-[#C6A757]",
};

export const luxuryHybrid: PaletteTokens = {
  id: "luxury-hybrid",
  label: "Luxury Hybrid",
  intent: "Dark shell, brass command + muted cyan field ops on a warm workspace — realistic production blend.",
  heroMode: "dark",

  root: "bg-[#0D1219]",
  topBar:
    "flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] bg-[#10161F]/95 px-4 py-3 backdrop-blur-2xl sm:px-6",
  sidebar:
    "hidden w-[16rem] shrink-0 flex-col border-r border-white/[0.07] bg-gradient-to-b from-[#0D1219] via-[#121A24] to-[#0D1219] lg:flex",
  navActiveRail:
    "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#C6A757]",
  sidebarLogoRing: "ring-1 ring-[rgba(198,167,87,0.30)]",
  sidebarActiveIcon: "text-[#C6A757]",
  sidebarActiveRing: "ring-1 ring-[rgba(56,189,248,0.15)]",
  sidebarFooterAccent: "text-[#C6A757]",
  topBarAvatarRing: "ring-1 ring-[rgba(198,167,87,0.25)]",

  canvas:
    "relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F5F3EF_0%,#EEEAE4_28%,#F5F3EF_72%,#FAF9F6_100%)]",
  canvasGlowPrimary:
    "pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_60%_70%_at_25%_0%,rgba(198,167,87,0.05),transparent_70%)]",
  canvasGlowSecondary:
    "pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.04),transparent_68%)]",

  heroShell:
    "relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#141C28] via-[#111A26] to-[#0D1219] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.46),0_0_0_1px_rgba(255,255,255,0.04)_inset] ring-1 ring-[rgba(198,167,87,0.16)]",
  heroAccentRail:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.40)] via-50% via-[rgba(56,189,248,0.25)] to-transparent",
  heroHeader: "border-b border-[rgba(198,167,87,0.12)] px-5 py-4 sm:px-6 sm:py-5",
  heroBody: "px-5 py-4 sm:px-6 sm:py-5",
  heroFooter: "border-t border-slate-700/25 bg-black/12 px-5 py-4 sm:px-6",

  eyebrowAccent: "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C6A757]",
  eyebrowLight: "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400",
  heroTitle: "text-xl font-semibold tracking-tight text-white sm:text-2xl",
  bodyPrimary: "text-sm font-medium text-slate-200",
  bodySecondary: "text-sm text-slate-300",
  meta: "text-xs text-slate-400",
  metaDark: "text-xs text-slate-400",
  bodySecondaryDark: "text-sm text-slate-300",
  conceptMarker:
    "inline-flex items-center rounded-full bg-[rgba(198,167,87,0.10)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.25)]",
  conceptMarkerText: "text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(41,34,24,0.48)]",

  primaryAction:
    "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-[#C6A757] bg-gradient-to-br from-[#141C28] via-[#111A26] to-[#0D1219] p-4 text-left shadow-[0_10px_36px_-14px_rgba(0,0,0,0.40)] ring-1 ring-[rgba(198,167,87,0.16)] transition-all hover:border-l-[#D4B76A] hover:ring-[rgba(198,167,87,0.28)] sm:flex-row sm:items-center sm:justify-between sm:p-5",
  accentCta:
    "relative inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[#B8943F] px-4 py-2.5 text-sm font-semibold text-[#FAF9F6] shadow-[0_2px_10px_rgba(184,148,63,0.24)] transition-all group-hover:bg-[#C6A757] sm:self-center",
  accentBadge:
    "inline-flex items-center rounded-md bg-[rgba(198,167,87,0.16)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.28)]",
  accentLine: "h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.35)] to-transparent",
  secondaryAction:
    "group inline-flex items-center gap-2 rounded-lg border border-slate-600/40 bg-slate-800/30 px-3 py-2 transition-all hover:border-cyan-500/25 hover:bg-slate-800/50",
  secondaryActionIndex:
    "flex h-5 w-5 items-center justify-center rounded-md bg-slate-700/70 text-[10px] font-bold tabular-nums text-cyan-300",
  insightSurface:
    "rounded-lg border-l-2 border-l-violet-400/50 bg-slate-800/28 px-4 py-3 ring-1 ring-slate-700/30",
  signalChip:
    "flex flex-col gap-0.5 rounded-lg border border-slate-600/35 bg-slate-800/28 px-3 py-2",
  signalLabel: "text-[10px] leading-tight text-slate-400",
  opsScoreInline:
    "inline-flex items-center gap-2 rounded-lg border border-[rgba(198,167,87,0.18)] bg-slate-800/30 px-3 py-1.5",
  opsScoreLabel: "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C6A757]",
  opsScoreValue: "text-lg font-semibold tabular-nums text-white",
  opsScoreTrack: "h-1.5 w-16 overflow-hidden rounded-full bg-slate-700/65",
  opsScoreFill: "h-full rounded-full bg-gradient-to-r from-[#C6A757] to-[#8B7232]",
  opsScoreDivider: "h-4 w-px bg-[rgba(198,167,87,0.22)]",
  liveBadge:
    "inline-flex items-center gap-1.5 rounded-md border border-cyan-500/22 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-medium text-cyan-300",
  primaryActionMetric: "mt-1.5 text-base font-medium tabular-nums text-[#E8DDC2]",

  operatingBoard:
    "relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#FAF9F6_0%,#F5F3EF_48%,#FAF9F6_100%)] shadow-[0_10px_44px_-14px_rgba(30,27,22,0.09),0_0_0_1px_rgba(255,255,255,0.86)_inset] ring-1 ring-[rgba(30,27,22,0.07)]",
  boardHeader: "border-b border-[rgba(198,167,87,0.12)] px-5 py-4 sm:px-6 sm:py-5",
  boardTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.32)] to-transparent",
  boardTitle: "text-lg font-semibold text-[#1E1B16] sm:text-xl",
  columnHeader:
    "rounded-lg border border-[rgba(30,27,22,0.08)] bg-[#FAF9F6]/90 px-3.5 py-3 shadow-[0_1px_4px_rgba(30,27,22,0.04)]",
  columnRail:
    "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[rgba(198,167,87,0.22)] to-transparent lg:block",
  row: "flex items-center gap-3 rounded-lg border border-[rgba(30,27,22,0.07)] bg-white px-3.5 py-3 shadow-[0_1px_4px_rgba(30,27,22,0.03)] transition-all hover:border-cyan-300/35 hover:shadow-[0_4px_14px_rgba(30,27,22,0.06)]",
  workspaceSubheading: "text-base font-semibold text-[#1E1B16]",
  labelMuted: "text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(30,27,22,0.48)]",
  link: "text-xs font-medium text-[#8B7232] transition-colors hover:text-[#6B5A2E]",
  connectionChip:
    "inline-flex items-center gap-1.5 rounded-md border border-[rgba(30,27,22,0.08)] bg-[#FAF9F6]/85 px-2.5 py-1.5 text-[10px] font-medium text-[rgba(30,27,22,0.72)]",
  connectionArrow: "h-3 w-3 text-cyan-600",
  columnDivider: "border-[rgba(198,167,87,0.10)]",
  officeHover: "hover:bg-[#EEEAE4]/80",
  soonBadge: "bg-[#EEEAE4] text-[#3D3428]",
  soonBadgeRing: "ring-[rgba(30,27,22,0.10)]",
  techAvatarBg: "bg-[#EEEAE4]",
  moneyTrack: "bg-[#EEEAE4]",
  moneyLeadBorder: "border-l-[#B8943F]",

  footer:
    "relative overflow-hidden rounded-[1.25rem] bg-[linear-gradient(180deg,#FAF9F6_0%,#F5F3EF_100%)] shadow-[0_6px_28px_-10px_rgba(30,27,22,0.07),0_0_0_1px_rgba(255,255,255,0.84)_inset] ring-1 ring-[rgba(30,27,22,0.07)]",
  footerTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.28)] to-transparent",
  footerSection: "border-t border-[rgba(198,167,87,0.10)] first:border-t-0",
  footerMetric:
    "px-4 py-3.5 sm:px-5 border-b border-[rgba(198,167,87,0.08)] sm:border-b-0 sm:border-r last:border-r-0 last:border-b-0",
  surfaceInset:
    "rounded-lg border border-[rgba(30,27,22,0.07)] bg-[#FAF9F6]/85 px-3 py-2.5 shadow-[0_1px_3px_rgba(30,27,22,0.03)]",
  momentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8943F]",
  activityTitle: "min-w-0 flex-1 text-xs font-medium text-[#1E1B16]",
  activityTime: "shrink-0 text-[10px] tabular-nums text-[rgba(30,27,22,0.48)]",
  metricLabel: "text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(30,27,22,0.48)]",
  metricDelta: "text-[11px] text-[rgba(30,27,22,0.58)]",

  healthScoreTrack: "rgba(198,167,87,0.18)",
  healthScoreGradientId: "lh-health-score",
  ...sharedSemantics,
  systemNotificationText: "inline-flex items-center gap-1 text-[11px] text-[rgba(30,27,22,0.58)]",

  intelligenceAccent: "text-violet-400/70",
};

export const warmExecutive: PaletteTokens = {
  id: "warm-executive",
  label: "Warm Executive",
  intent: "Graphite shell, calm warm workspace, champagne accents — office-friendly with quiet confidence.",
  heroMode: "light",

  root: "bg-[#111318]",
  topBar:
    "flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#13161C]/95 px-4 py-3 backdrop-blur-2xl sm:px-6",
  sidebar:
    "hidden w-[16rem] shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#111318] via-[#14171E] to-[#111318] lg:flex",
  navActiveRail:
    "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#D4C4A0]",
  sidebarLogoRing: "ring-1 ring-[rgba(212,196,160,0.22)]",
  sidebarActiveIcon: "text-[#D4C4A0]",
  sidebarActiveRing: "ring-1 ring-[rgba(212,196,160,0.18)]",
  sidebarFooterAccent: "text-[#D4C4A0]",
  topBarAvatarRing: "ring-1 ring-[rgba(212,196,160,0.20)]",

  canvas:
    "relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F7F5F1_0%,#F2EFE9_28%,#F7F5F1_72%,#FBFAF7_100%)]",
  canvasGlowPrimary:
    "pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_60%_70%_at_30%_0%,rgba(212,196,160,0.04),transparent_72%)]",
  canvasGlowSecondary:
    "pointer-events-none absolute right-0 top-0 h-24 w-36 bg-[radial-gradient(circle_at_100%_0%,rgba(30,27,22,0.03),transparent_70%)]",

  heroShell:
    "relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#FBFAF7_0%,#F5F3EF_100%)] shadow-[0_8px_36px_-14px_rgba(30,27,22,0.10),0_0_0_1px_rgba(255,255,255,0.92)_inset] ring-1 ring-[rgba(30,27,22,0.06)]",
  heroAccentRail:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,196,160,0.40)] to-transparent",
  heroHeader: "border-b border-[rgba(212,196,160,0.14)] px-5 py-4 sm:px-6 sm:py-5",
  heroBody: "px-5 py-4 sm:px-6 sm:py-5",
  heroFooter: "border-t border-[rgba(212,196,160,0.10)] bg-[#F2EFE9]/30 px-5 py-4 sm:px-6",

  eyebrowAccent: "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A8B6E]",
  eyebrowLight: "text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(30,27,22,0.48)]",
  heroTitle: "text-xl font-semibold tracking-tight text-[#1E1B16] sm:text-2xl",
  bodyPrimary: "text-sm font-medium text-[#3A342C]",
  bodySecondary: "text-sm text-[rgba(30,27,22,0.72)]",
  meta: "text-xs text-[rgba(30,27,22,0.58)]",
  metaDark: "text-xs text-slate-400",
  bodySecondaryDark: "text-sm text-slate-300",
  conceptMarker:
    "inline-flex items-center rounded-full bg-[rgba(212,196,160,0.22)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B5F4A] ring-1 ring-[rgba(212,196,160,0.28)]",
  conceptMarkerText: "text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(30,27,22,0.45)]",

  primaryAction:
    "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-[#B8A882] bg-gradient-to-br from-[#1A1D22] via-[#161920] to-[#13161C] p-4 text-left shadow-[0_8px_32px_-14px_rgba(0,0,0,0.32)] ring-1 ring-[rgba(212,196,160,0.14)] transition-all hover:border-l-[#D4C4A0] hover:ring-[rgba(212,196,160,0.24)] sm:flex-row sm:items-center sm:justify-between sm:p-5",
  accentCta:
    "relative inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[#9A8B6E] px-4 py-2.5 text-sm font-semibold text-[#FBFAF7] shadow-[0_2px_8px_rgba(154,139,110,0.20)] transition-all group-hover:bg-[#B8A882] sm:self-center",
  accentBadge:
    "inline-flex items-center rounded-md bg-[rgba(212,196,160,0.16)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8E0D0] ring-1 ring-[rgba(212,196,160,0.24)]",
  accentLine: "h-px bg-gradient-to-r from-transparent via-[rgba(212,196,160,0.32)] to-transparent",
  secondaryAction:
    "group inline-flex items-center gap-2 rounded-lg border border-[rgba(30,27,22,0.08)] bg-[#FBFAF7]/90 px-3 py-2 shadow-[0_1px_3px_rgba(30,27,22,0.03)] transition-all hover:border-[rgba(212,196,160,0.22)] hover:shadow-[0_3px_10px_rgba(30,27,22,0.05)]",
  secondaryActionIndex:
    "flex h-5 w-5 items-center justify-center rounded-md bg-[#F2EFE9] text-[10px] font-bold tabular-nums text-[#9A8B6E]",
  insightSurface:
    "rounded-lg border-l-2 border-l-[#B8A882] bg-[#FBFAF7]/85 px-4 py-3 ring-1 ring-[rgba(30,27,22,0.05)]",
  signalChip:
    "flex flex-col gap-0.5 rounded-lg border border-[rgba(30,27,22,0.07)] bg-[#FBFAF7]/90 px-3 py-2 shadow-[0_1px_3px_rgba(30,27,22,0.03)]",
  signalLabel: "text-[10px] leading-tight text-[rgba(30,27,22,0.52)]",
  opsScoreInline:
    "inline-flex items-center gap-2 rounded-lg border border-[rgba(212,196,160,0.16)] bg-[#FBFAF7]/90 px-3 py-1.5 shadow-[0_1px_3px_rgba(30,27,22,0.03)]",
  opsScoreLabel: "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A8B6E]",
  opsScoreValue: "text-lg font-semibold tabular-nums text-[#1E1B16]",
  opsScoreTrack: "h-1.5 w-16 overflow-hidden rounded-full bg-[#F2EFE9]",
  opsScoreFill: "h-full rounded-full bg-gradient-to-r from-[#B8A882] to-[#9A8B6E]",
  opsScoreDivider: "h-4 w-px bg-[rgba(212,196,160,0.22)]",
  liveBadge:
    "inline-flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-medium text-emerald-800",
  primaryActionMetric: "mt-1.5 text-base font-medium tabular-nums text-[#E8E0D0]",

  operatingBoard:
    "relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#FBFAF7_0%,#F5F3EF_48%,#FBFAF7_100%)] shadow-[0_8px_36px_-12px_rgba(30,27,22,0.08),0_0_0_1px_rgba(255,255,255,0.88)_inset] ring-1 ring-[rgba(30,27,22,0.06)]",
  boardHeader: "border-b border-[rgba(212,196,160,0.12)] px-5 py-4 sm:px-6 sm:py-5",
  boardTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,196,160,0.28)] to-transparent",
  boardTitle: "text-lg font-semibold text-[#1E1B16] sm:text-xl",
  columnHeader:
    "rounded-lg border border-[rgba(30,27,22,0.06)] bg-[#FBFAF7]/90 px-3.5 py-3 shadow-[0_1px_3px_rgba(30,27,22,0.03)]",
  columnRail:
    "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[rgba(212,196,160,0.20)] to-transparent lg:block",
  row: "flex items-center gap-3 rounded-lg border border-[rgba(30,27,22,0.06)] bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(30,27,22,0.03)] transition-all hover:border-[rgba(212,196,160,0.18)] hover:shadow-[0_3px_12px_rgba(30,27,22,0.05)]",
  workspaceSubheading: "text-base font-semibold text-[#1E1B16]",
  labelMuted: "text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(30,27,22,0.45)]",
  link: "text-xs font-medium text-[#8B7D62] transition-colors hover:text-[#6B5F4A]",
  connectionChip:
    "inline-flex items-center gap-1.5 rounded-md border border-[rgba(30,27,22,0.06)] bg-[#FBFAF7]/85 px-2.5 py-1.5 text-[10px] font-medium text-[rgba(30,27,22,0.68)]",
  connectionArrow: "h-3 w-3 text-[#9A8B6E]",
  columnDivider: "border-[rgba(212,196,160,0.10)]",
  officeHover: "hover:bg-[#F2EFE9]/75",
  soonBadge: "bg-[#F2EFE9] text-[#3A342C]",
  soonBadgeRing: "ring-[rgba(30,27,22,0.08)]",
  techAvatarBg: "bg-[#F2EFE9]",
  moneyTrack: "bg-[#F2EFE9]",
  moneyLeadBorder: "border-l-[#B8A882]",

  footer:
    "relative overflow-hidden rounded-[1.25rem] bg-[linear-gradient(180deg,#FBFAF7_0%,#F5F3EF_100%)] shadow-[0_5px_24px_-10px_rgba(30,27,22,0.06),0_0_0_1px_rgba(255,255,255,0.84)_inset] ring-1 ring-[rgba(30,27,22,0.06)]",
  footerTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,196,160,0.22)] to-transparent",
  footerSection: "border-t border-[rgba(212,196,160,0.10)] first:border-t-0",
  footerMetric:
    "px-4 py-3.5 sm:px-5 border-b border-[rgba(212,196,160,0.08)] sm:border-b-0 sm:border-r last:border-r-0 last:border-b-0",
  surfaceInset:
    "rounded-lg border border-[rgba(30,27,22,0.06)] bg-[#FBFAF7]/85 px-3 py-2.5 shadow-[0_1px_2px_rgba(30,27,22,0.02)]",
  momentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8A882]",
  activityTitle: "min-w-0 flex-1 text-xs font-medium text-[#1E1B16]",
  activityTime: "shrink-0 text-[10px] tabular-nums text-[rgba(30,27,22,0.45)]",
  metricLabel: "text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(30,27,22,0.45)]",
  metricDelta: "text-[11px] text-[rgba(30,27,22,0.55)]",

  healthScoreTrack: "rgba(212,196,160,0.18)",
  healthScoreGradientId: "we-health-score",
  ...sharedSemantics,
  systemNotificationText: "inline-flex items-center gap-1 text-[11px] text-[rgba(30,27,22,0.55)]",

  intelligenceAccent: "text-[#9A8B6E]",
};

export const colorLabPalettes: PaletteTokens[] = [
  missionControlRefined,
  graphiteBrass,
  luxuryHybrid,
  warmExecutive,
];

export function getPaletteById(id: PaletteId): PaletteTokens {
  const palette = colorLabPalettes.find((p) => p.id === id);
  if (!palette) {
    return missionControlRefined;
  }
  return palette;
}
