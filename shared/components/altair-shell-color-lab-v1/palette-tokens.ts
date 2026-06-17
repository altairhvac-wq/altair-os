/** Altair Shell Color Lab v1 — frozen v3 layout, palette-only exploration. */

export type PaletteId =
  | "mission-control-refined"
  | "graphite-brass"
  | "luxury-hybrid"
  | "warm-executive";

export type HeroMode = "dark" | "light";

/** Raw color roles — single source of truth per palette. */
export type PaletteRoles = {
  shell: {
    shellBg: string;
    shellPanel: string;
    shellBorder: string;
    shellText: string;
    shellMuted: string;
    shellActiveBg: string;
    shellActiveText: string;
    shellActiveRail: string;
    shellIcon: string;
    shellLogoFrom: string;
    shellLogoTo: string;
    shellLogoText: string;
    shellGroupLabel: string;
    shellNavInactive: string;
    shellNavHover: string;
    shellAvatarBg: string;
  };
  workspace: {
    workspaceBg: string;
    workspaceWash: string;
    cardBg: string;
    cardElevatedBg: string;
    cardBorder: string;
    cardStrongBorder: string;
    cardShadow: string;
    cardHoverShadow: string;
    cardText: string;
    cardMuted: string;
    divider: string;
    icon: string;
    iconMuted: string;
    iconHover: string;
    rowArrow: string;
  };
  hero: {
    heroBg: string;
    heroBgVia: string;
    heroBgTo: string;
    heroBorder: string;
    heroText: string;
    heroMuted: string;
    heroAccent: string;
    heroAccentSoft: string;
    heroAccentRail: string;
    primaryActionBg: string;
    primaryActionBgVia: string;
    primaryActionBgTo: string;
    primaryActionBorder: string;
    primaryActionRing: string;
    primaryActionText: string;
    primaryActionSubtext: string;
    primaryActionMetric: string;
    primaryActionTitle: string;
    insightBorder: string;
    insightBg: string;
    insightRing: string;
    secondaryBg: string;
    secondaryBorder: string;
    secondaryHoverBorder: string;
    secondaryIndexBg: string;
    secondaryIndexText: string;
    signalChipBorder: string;
    signalChipBg: string;
    signalLabel: string;
    opsScoreBorder: string;
    opsScoreBg: string;
    opsScoreTrack: string;
    opsScoreFillFrom: string;
    opsScoreFillTo: string;
    opsScoreDivider: string;
    footerWash: string;
    accentLine: string;
    shiftMuted: string;
    secondaryLabel: string;
    secondaryMetric: string;
    secondaryChevron: string;
    secondaryChevronHover: string;
    insightHeadline: string;
    signalNeutral: string;
    signalAttention: string;
    signalPositive: string;
    signalRisk: string;
    liveDot: string;
  };
  brand: {
    brandAccent: string;
    brandAccentHover: string;
    brandAccentSoft: string;
    brandAccentBorder: string;
    brandAccentText: string;
    brandAccentMuted: string;
    brandCtaBg: string;
    brandCtaBgHover: string;
    brandCtaText: string;
    brandCtaShadow: string;
    brandBadgeBg: string;
    brandBadgeText: string;
    brandBadgeRing: string;
    brandLink: string;
    brandLinkHover: string;
    brandMomentumDot: string;
    brandMoneyLeadBorder: string;
    brandConnectionArrow: string;
    brandRowHoverBorder: string;
    brandCanvasGlow: string;
    brandCanvasGlowSecondary: string;
    brandBoardAccent: string;
    brandFooterAccent: string;
    brandColumnRail: string;
    brandHealthTrack: string;
    brandIntelligence: string;
    brandConceptBg: string;
    brandConceptText: string;
    brandConceptRing: string;
    brandConceptLabel: string;
  };
  semantic: {
    success: string;
    successSoft: string;
    successText: string;
    successTextDark: string;
    successBadge: string;
    successDot: string;
    successRing: string;
    successGradientFrom: string;
    successGradientTo: string;
    warning: string;
    warningSoft: string;
    warningText: string;
    warningTextDark: string;
    warningDot: string;
    warningGradientFrom: string;
    warningGradientTo: string;
    danger: string;
    dangerSoft: string;
    dangerText: string;
    dangerTextDark: string;
    dangerDot: string;
    dangerIcon: string;
    info: string;
    infoSoft: string;
    infoText: string;
    infoTextDark: string;
    infoBadge: string;
    neutral: string;
    neutralSoft: string;
    neutralText: string;
    neutralDot: string;
    neutralGradientFrom: string;
    neutralGradientTo: string;
    notificationDot: string;
    liveBadgeShell: string;
    healthGradientStart: string;
    healthGradientEnd: string;
    healthValue: string;
    systemStatus: string;
    systemNotification: string;
  };
};

export type PaletteTokens = {
  id: PaletteId;
  label: string;
  intent: string;
  heroMode: HeroMode;
  roles: PaletteRoles;

  root: string;
  topBar: string;
  sidebar: string;
  navActiveRail: string;
  sidebarLogoRing: string;
  sidebarActiveIcon: string;
  sidebarActiveRing: string;
  sidebarFooterAccent: string;
  topBarAvatarRing: string;
  shellText: string;
  shellMuted: string;
  shellGroupLabel: string;
  shellNavInactive: string;
  shellNavHover: string;
  shellLogoGradient: string;
  shellLogoText: string;
  shellBorder: string;
  shellAvatarBg: string;
  liveBadgeTopBar: string;
  notificationDot: string;
  topBarButton: string;

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
  heroShiftMuted: string;
  heroSecondaryLabel: string;
  heroSecondaryMetric: string;
  heroSecondaryChevron: string;
  heroInsightHeadline: string;
  heroSignalNeutral: string;
  heroSignalAttention: string;
  heroSignalPositive: string;
  heroSignalRisk: string;
  heroLiveDot: string;
  primaryActionTitle: string;
  primaryActionSubtext: string;
  primaryActionBody: string;

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
  workspaceIcon: string;
  workspaceIconMuted: string;
  workspaceIconHover: string;
  workspaceRowArrow: string;
  moneyIcon: string;
  moneyStagePositive: string;
  moneyStageNeutral: string;
  moneyStageAttention: string;

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
  metricToneEmerald: string;
  metricToneAmber: string;
  activityDotSlate: string;
  activityDotEmerald: string;
  activityDotAmber: string;
  urgencyNowBadge: string;
  urgencyTodayBadge: string;
  urgencyNowDot: string;
  urgencyTodayDot: string;
  urgencySoonDot: string;
  urgencyDangerIcon: string;
  jobStatusInProgressDot: string;
  jobStatusInProgressText: string;
  jobStatusEnRouteDot: string;
  jobStatusEnRouteText: string;
  jobStatusScheduledDot: string;
  jobStatusScheduledText: string;
  jobStatusCompletedDot: string;
  jobStatusCompletedText: string;
  techOnJobRing: string;
  techOnJobBg: string;
  techAvailableRing: string;
  techAvailableBg: string;
  techBreakRing: string;
  techBreakBg: string;
  techOfflineRing: string;
  techOfflineBg: string;

  healthScoreTrack: string;
  healthScoreGradientId: string;
  healthScoreGradientStart: string;
  healthScoreGradientEnd: string;
  healthScoreValue: string;
  systemStatusText: string;
  systemNotificationText: string;
  intelligenceAccent: string;
};

function buildPaletteTokens(
  id: PaletteId,
  label: string,
  intent: string,
  heroMode: HeroMode,
  roles: PaletteRoles,
): PaletteTokens {
  const { shell, workspace, hero, brand, semantic } = roles;
  const isDarkHero = heroMode === "dark";

  return {
    id,
    label,
    intent,
    heroMode,
    roles,

    root: `bg-[${shell.shellBg}]`,
    topBar: `flex shrink-0 items-center justify-between gap-4 border-b border-[${shell.shellBorder}] bg-[${shell.shellPanel}]/95 px-4 py-3 backdrop-blur-2xl sm:px-6`,
    sidebar: `hidden w-[16rem] shrink-0 flex-col border-r border-[${shell.shellBorder}] bg-gradient-to-b from-[${shell.shellBg}] via-[${shell.shellPanel}] to-[${shell.shellBg}] lg:flex`,
    navActiveRail: `absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[${shell.shellActiveRail}]`,
    sidebarLogoRing: `ring-1 ring-[${brand.brandAccentBorder}]`,
    sidebarActiveIcon: `text-[${shell.shellActiveRail}]`,
    sidebarActiveRing: `ring-1 ring-[${brand.brandAccentBorder}]`,
    sidebarFooterAccent: `text-[${brand.brandAccent}]`,
    topBarAvatarRing: `ring-1 ring-[${brand.brandAccentBorder}]`,
    shellText: `text-[${shell.shellText}]`,
    shellMuted: `text-[${shell.shellMuted}]`,
    shellGroupLabel: `text-[${shell.shellGroupLabel}]`,
    shellNavInactive: `text-[${shell.shellNavInactive}]`,
    shellNavHover: `hover:bg-white/[0.04] hover:text-[${shell.shellNavHover}]`,
    shellLogoGradient: `bg-gradient-to-br from-[${shell.shellLogoFrom}] to-[${shell.shellLogoTo}]`,
    shellLogoText: `text-[${shell.shellLogoText}]`,
    shellBorder: `border-[${shell.shellBorder}]`,
    shellAvatarBg: `bg-[${shell.shellAvatarBg}]`,
    liveBadgeTopBar: semantic.liveBadgeShell,
    notificationDot: semantic.notificationDot,
    topBarButton: `bg-white/[0.04] text-[${shell.shellMuted}] ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.06] hover:text-[${shell.shellText}]`,

    canvas: `relative flex-1 overflow-y-auto bg-[${workspace.workspaceBg.replace(/\s/g, "_")}]`,
    canvasGlowPrimary: brand.brandCanvasGlow,
    canvasGlowSecondary: brand.brandCanvasGlowSecondary,

    heroShell: isDarkHero
      ? `relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[${hero.heroBg}]/98 via-[${hero.heroBgVia}]/96 to-[${hero.heroBgTo}]/98 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset] ring-1 ring-[${hero.heroBorder}]`
      : `relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,${hero.heroBg}_0%,${hero.heroBgTo}_100%)] shadow-[0_8px_36px_-14px_rgba(30,27,22,0.12),0_0_0_1px_rgba(255,255,255,0.92)_inset] ring-1 ring-[${hero.heroBorder}]`,
    heroAccentRail: `pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[${hero.heroAccentRail}] to-transparent`,
    heroHeader: `border-b border-[${hero.heroBorder}] px-5 py-4 sm:px-6 sm:py-5`,
    heroBody: "px-5 py-4 sm:px-6 sm:py-5",
    heroFooter: isDarkHero
      ? `border-t border-[${hero.heroBorder}] bg-black/15 px-5 py-4 sm:px-6`
      : `border-t border-[${hero.heroBorder}] bg-[${hero.footerWash}]/30 px-5 py-4 sm:px-6`,
    eyebrowAccent: `text-[10px] font-semibold uppercase tracking-[0.18em] text-[${hero.heroAccent}]`,
    eyebrowLight: isDarkHero
      ? `text-[10px] font-semibold uppercase tracking-[0.16em] text-[${hero.heroMuted}]`
      : `text-[10px] font-semibold uppercase tracking-[0.16em] text-[${workspace.cardMuted}]`,
    heroTitle: isDarkHero
      ? "text-xl font-semibold tracking-tight text-white sm:text-2xl"
      : `text-xl font-semibold tracking-tight text-[${hero.heroText}] sm:text-2xl`,
    bodyPrimary: isDarkHero
      ? `text-sm font-medium text-[${hero.primaryActionSubtext}]`
      : `text-sm font-medium text-[${hero.heroText}]`,
    bodySecondary: isDarkHero
      ? `text-sm text-[${hero.heroMuted}]`
      : `text-sm text-[${workspace.cardMuted}]`,
    meta: isDarkHero
      ? `text-xs text-[${hero.heroMuted}]`
      : `text-xs text-[${workspace.cardMuted}]`,
    metaDark: isDarkHero
      ? `text-xs text-[${hero.heroMuted}]`
      : `text-xs text-[${workspace.cardMuted}]`,
    bodySecondaryDark: isDarkHero
      ? `text-sm text-[${hero.primaryActionSubtext}]`
      : `text-sm text-[${workspace.cardMuted}]`,
    conceptMarker: brand.brandConceptBg,
    conceptMarkerText: brand.brandConceptLabel,
    heroShiftMuted: `text-[${hero.shiftMuted}]`,
    heroSecondaryLabel: hero.secondaryLabel,
    heroSecondaryMetric: hero.secondaryMetric,
    heroSecondaryChevron: hero.secondaryChevron,
    heroInsightHeadline: hero.insightHeadline,
    heroSignalNeutral: hero.signalNeutral,
    heroSignalAttention: hero.signalAttention,
    heroSignalPositive: hero.signalPositive,
    heroSignalRisk: hero.signalRisk,
    heroLiveDot: hero.liveDot,
    primaryActionTitle: hero.primaryActionTitle,
    primaryActionSubtext: `text-[11px] font-medium text-[${hero.primaryActionSubtext}]`,
    primaryActionBody: `text-sm font-medium text-[${hero.primaryActionText}]`,

    primaryAction: isDarkHero
      ? `group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-[${hero.primaryActionBorder}] bg-gradient-to-br from-[${hero.primaryActionBg}] via-[${hero.primaryActionBgVia}] to-[${hero.primaryActionBgTo}] p-4 text-left shadow-[0_10px_36px_-14px_rgba(0,0,0,0.40)] ring-1 ring-[${hero.primaryActionRing}] transition-all hover:border-l-[${brand.brandAccentHover}] hover:ring-[${brand.brandAccentBorder}] sm:flex-row sm:items-center sm:justify-between sm:p-5`
      : `group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-[${hero.primaryActionBorder}] bg-gradient-to-br from-[${hero.primaryActionBg}] via-[${hero.primaryActionBgVia}] to-[${hero.primaryActionBgTo}] p-4 text-left shadow-[0_8px_32px_-14px_rgba(0,0,0,0.32)] ring-1 ring-[${hero.primaryActionRing}] transition-all hover:border-l-[${brand.brandAccentHover}] hover:ring-[${brand.brandAccentBorder}] sm:flex-row sm:items-center sm:justify-between sm:p-5`,
    accentCta: `relative inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[${brand.brandCtaBg}] px-4 py-2.5 text-sm font-semibold text-[${brand.brandCtaText}] shadow-[${brand.brandCtaShadow}] transition-all group-hover:bg-[${brand.brandCtaBgHover}] sm:self-center`,
    accentBadge: brand.brandBadgeBg,
    accentLine: `h-px bg-gradient-to-r from-transparent via-[${hero.accentLine}] to-transparent`,
    secondaryAction: isDarkHero
      ? `group inline-flex items-center gap-2 rounded-lg border border-[${hero.secondaryBorder}] bg-[${hero.secondaryBg}] px-3 py-2 transition-all hover:border-[${hero.secondaryHoverBorder}] hover:bg-[${hero.secondaryBg}]/80`
      : `group inline-flex items-center gap-2 rounded-lg border border-[${hero.secondaryBorder}] bg-[${hero.secondaryBg}] px-3 py-2 shadow-[0_1px_3px_rgba(30,27,22,0.03)] transition-all hover:border-[${hero.secondaryHoverBorder}] hover:shadow-[0_3px_10px_rgba(30,27,22,0.05)]`,
    secondaryActionIndex: `flex h-5 w-5 items-center justify-center rounded-md bg-[${hero.secondaryIndexBg}] text-[10px] font-bold tabular-nums text-[${hero.secondaryIndexText}]`,
    insightSurface: isDarkHero
      ? `rounded-lg border-l-2 border-l-[${hero.insightBorder}] bg-[${hero.insightBg}] px-4 py-3 ring-1 ring-[${hero.insightRing}]`
      : `rounded-lg border-l-2 border-l-[${hero.insightBorder}] bg-[${hero.insightBg}] px-4 py-3 ring-1 ring-[${hero.insightRing}]`,
    signalChip: `flex flex-col gap-0.5 rounded-lg border border-[${hero.signalChipBorder}] bg-[${hero.signalChipBg}] px-3 py-2`,
    signalLabel: `text-[10px] leading-tight text-[${hero.signalLabel}]`,
    opsScoreInline: `inline-flex items-center gap-2 rounded-lg border border-[${hero.opsScoreBorder}] bg-[${hero.opsScoreBg}] px-3 py-1.5`,
    opsScoreLabel: `text-[10px] font-semibold uppercase tracking-[0.14em] text-[${hero.heroAccent}]`,
    opsScoreValue: isDarkHero
      ? "text-lg font-semibold tabular-nums text-white"
      : `text-lg font-semibold tabular-nums text-[${hero.heroText}]`,
    opsScoreTrack: `h-1.5 w-16 overflow-hidden rounded-full bg-[${hero.opsScoreTrack}]`,
    opsScoreFill: `h-full rounded-full bg-gradient-to-r from-[${hero.opsScoreFillFrom}] to-[${hero.opsScoreFillTo}]`,
    opsScoreDivider: `h-4 w-px bg-[${hero.opsScoreDivider}]`,
    liveBadge: semantic.infoBadge,
    primaryActionMetric: `mt-1.5 text-base font-medium tabular-nums text-[${hero.primaryActionMetric}]`,

    operatingBoard: `relative overflow-hidden rounded-[1.5rem] bg-[${workspace.cardElevatedBg.replace(/\s/g, "_")}] shadow-[${workspace.cardShadow}] ring-1 ring-[${workspace.cardStrongBorder}]`,
    boardHeader: `border-b border-[${workspace.cardBorder}] px-5 py-4 sm:px-6 sm:py-5`,
    boardTopAccent: brand.brandBoardAccent,
    boardTitle: `text-lg font-semibold text-[${workspace.cardText}] sm:text-xl`,
    columnHeader: `rounded-lg border border-[${workspace.cardBorder}] bg-[${workspace.cardBg}] px-3.5 py-3 shadow-[0_1px_4px_rgba(30,27,22,0.05),0_0_0_1px_rgba(255,255,255,0.6)_inset]`,
    columnRail: brand.brandColumnRail,
    row: `flex items-center gap-3 rounded-lg border border-[${workspace.cardBorder}] bg-[${workspace.cardBg}] px-3.5 py-3 shadow-[0_1px_4px_rgba(30,27,22,0.04)] transition-all hover:border-[${brand.brandRowHoverBorder}] hover:shadow-[${workspace.cardHoverShadow}]`,
    workspaceSubheading: `text-base font-semibold text-[${workspace.cardText}]`,
    labelMuted: `text-[10px] font-semibold uppercase tracking-[0.14em] text-[${workspace.cardMuted}]`,
    link: `text-xs font-medium text-[${brand.brandLink}] transition-colors hover:text-[${brand.brandLinkHover}]`,
    connectionChip: `inline-flex items-center gap-1.5 rounded-md border border-[${workspace.cardBorder}] bg-[${workspace.cardBg}]/85 px-2.5 py-1.5 text-[10px] font-medium text-[${workspace.cardMuted}]`,
    connectionArrow: brand.brandConnectionArrow,
    columnDivider: `border-[${workspace.divider}]`,
    officeHover: `hover:bg-[${workspace.workspaceWash}]/80`,
    soonBadge: `bg-[${workspace.workspaceWash}] text-[${workspace.cardText}]`,
    soonBadgeRing: `ring-[${workspace.cardBorder}]`,
    techAvatarBg: `bg-[${workspace.workspaceWash}]`,
    moneyTrack: `bg-[${workspace.workspaceWash}]`,
    moneyLeadBorder: `border-l-[${brand.brandMoneyLeadBorder}]`,
    workspaceIcon: `text-[${workspace.icon}]`,
    workspaceIconMuted: `text-[${workspace.iconMuted}]`,
    workspaceIconHover: `group-hover:text-[${workspace.iconHover}]`,
    workspaceRowArrow: `text-[${workspace.rowArrow}] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[${workspace.iconHover}]`,
    moneyIcon: `text-[${brand.brandAccentMuted}]`,
    moneyStagePositive: `from-[${semantic.successGradientFrom}] to-[${semantic.successGradientTo}]`,
    moneyStageNeutral: `from-[${semantic.neutralGradientFrom}] to-[${semantic.neutralGradientTo}]`,
    moneyStageAttention: `from-[${semantic.warningGradientFrom}] to-[${semantic.warningGradientTo}]`,

    footer: `relative overflow-hidden rounded-[1.25rem] bg-[${workspace.cardElevatedBg.replace(/\s/g, "_")}] shadow-[${workspace.cardShadow}] ring-1 ring-[${workspace.cardStrongBorder}]`,
    footerTopAccent: brand.brandFooterAccent,
    footerSection: `border-t border-[${workspace.divider}] first:border-t-0`,
    footerMetric: `px-4 py-3.5 sm:px-5 border-b border-[${workspace.divider}] sm:border-b-0 sm:border-r last:border-r-0 last:border-b-0`,
    surfaceInset: `rounded-lg border border-[${workspace.cardBorder}] bg-[${workspace.cardBg}]/85 px-3 py-2.5 shadow-[0_1px_3px_rgba(30,27,22,0.04)]`,
    momentumDot: brand.brandMomentumDot,
    activityTitle: `min-w-0 flex-1 text-xs font-medium text-[${workspace.cardText}]`,
    activityTime: `shrink-0 text-[10px] tabular-nums text-[${workspace.cardMuted}]`,
    metricLabel: `text-[10px] font-semibold uppercase tracking-[0.12em] text-[${workspace.cardMuted}]`,
    metricDelta: `text-[11px] text-[${workspace.cardMuted}]`,
    metricToneEmerald: semantic.successText,
    metricToneAmber: semantic.warningText,
    activityDotSlate: semantic.neutralDot,
    activityDotEmerald: semantic.successDot,
    activityDotAmber: semantic.warningDot,
    urgencyNowBadge: `${semantic.dangerSoft} ${semantic.dangerText} ring-red-200`,
    urgencyTodayBadge: `${semantic.warningSoft} ${semantic.warningText} ring-amber-200`,
    urgencyNowDot: semantic.dangerDot,
    urgencyTodayDot: semantic.warningDot,
    urgencySoonDot: semantic.neutralDot,
    urgencyDangerIcon: semantic.dangerIcon,
    jobStatusInProgressDot: semantic.neutralDot,
    jobStatusInProgressText: semantic.neutralText,
    jobStatusEnRouteDot: semantic.neutralDot,
    jobStatusEnRouteText: semantic.neutralText,
    jobStatusScheduledDot: semantic.neutralDot,
    jobStatusScheduledText: semantic.neutralText,
    jobStatusCompletedDot: semantic.successDot,
    jobStatusCompletedText: semantic.successText,
    techOnJobRing: semantic.neutralSoft,
    techOnJobBg: "from-[#F5F3EF] to-white",
    techAvailableRing: semantic.successRing,
    techAvailableBg: "from-emerald-50/80 to-white",
    techBreakRing: semantic.neutralSoft,
    techBreakBg: "from-[#F5F3EF]/80 to-white",
    techOfflineRing: semantic.neutralSoft,
    techOfflineBg: "from-[#F5F3EF]/60 to-white",

    healthScoreTrack: brand.brandHealthTrack,
    healthScoreGradientId: `${id}-health-score`,
    healthScoreGradientStart: semantic.healthGradientStart,
    healthScoreGradientEnd: semantic.healthGradientEnd,
    healthScoreValue: semantic.healthValue,
    systemStatusText: semantic.systemStatus,
    systemNotificationText: semantic.systemNotification,
    intelligenceAccent: brand.brandIntelligence,
  };
}

/* ── Palette 1: Mission Control Original Refined (cyan identity allowed) ── */

const missionControlRoles: PaletteRoles = {
  shell: {
    shellBg: "#0b1220",
    shellPanel: "#0e1628",
    shellBorder: "rgba(148,163,184,0.18)",
    shellText: "#e2e8f0",
    shellMuted: "#94a3b8",
    shellActiveBg: "rgba(255,255,255,0.06)",
    shellActiveText: "#ffffff",
    shellActiveRail: "#22d3ee",
    shellIcon: "#22d3ee",
    shellLogoFrom: "#1a2230",
    shellLogoTo: "#0F141B",
    shellLogoText: "#e2e8f0",
    shellGroupLabel: "#64748b",
    shellNavInactive: "#64748b",
    shellNavHover: "#cbd5e1",
    shellAvatarBg: "#141B24",
  },
  workspace: {
    workspaceBg: "linear-gradient(180deg,#d8e0ea_0%,#e4eaf1_28%,#edf1f6_62%,#f2f5f8_100%)",
    workspaceWash: "#e2e8f0",
    cardBg: "#ffffff",
    cardElevatedBg: "#f6f8fb",
    cardBorder: "rgba(148,163,184,0.35)",
    cardStrongBorder: "rgba(148,163,184,0.28)",
    cardShadow: "0_10px_44px_-14px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.9)_inset",
    cardHoverShadow: "0_4px_14px_rgba(15,23,42,0.08)",
    cardText: "#0f172a",
    cardMuted: "#64748b",
    divider: "rgba(148,163,184,0.25)",
    icon: "#475569",
    iconMuted: "#94a3b8",
    iconHover: "#334155",
    rowArrow: "#94a3b8",
  },
  hero: {
    heroBg: "#111b2e",
    heroBgVia: "#0e1726",
    heroBgTo: "#0b1220",
    heroBorder: "rgba(148,163,184,0.22)",
    heroText: "#ffffff",
    heroMuted: "#94a3b8",
    heroAccent: "#22d3ee",
    heroAccentSoft: "rgba(34,211,238,0.15)",
    heroAccentRail: "rgba(34,211,238,0.40)",
    primaryActionBg: "#0f1a2e",
    primaryActionBgVia: "#0c1525",
    primaryActionBgTo: "#0a1220",
    primaryActionBorder: "#22d3ee",
    primaryActionRing: "rgba(34,211,238,0.20)",
    primaryActionText: "#e2e8f0",
    primaryActionSubtext: "#94a3b8",
    primaryActionMetric: "#a5f3fc",
    primaryActionTitle: "text-lg font-semibold leading-snug text-white sm:text-xl",
    insightBorder: "#64748b",
    insightBg: "rgba(30,41,59,0.35)",
    insightRing: "rgba(148,163,184,0.25)",
    secondaryBg: "rgba(30,41,59,0.40)",
    secondaryBorder: "rgba(100,116,139,0.45)",
    secondaryHoverBorder: "rgba(34,211,238,0.30)",
    secondaryIndexBg: "rgba(51,65,85,0.80)",
    secondaryIndexText: "#67e8f9",
    signalChipBorder: "rgba(100,116,139,0.40)",
    signalChipBg: "rgba(30,41,59,0.35)",
    signalLabel: "#94a3b8",
    opsScoreBorder: "rgba(34,211,238,0.20)",
    opsScoreBg: "rgba(30,41,59,0.40)",
    opsScoreTrack: "rgba(51,65,85,0.80)",
    opsScoreFillFrom: "#22d3ee",
    opsScoreFillTo: "#0891b2",
    opsScoreDivider: "rgba(34,211,238,0.25)",
    footerWash: "#0f172a",
    accentLine: "rgba(34,211,238,0.30)",
    shiftMuted: "#94a3b8",
    secondaryLabel: "text-sm font-medium text-slate-200 group-hover:text-white",
    secondaryMetric: "hidden text-xs tabular-nums text-slate-400 sm:inline",
    secondaryChevron: "h-3.5 w-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300",
    secondaryChevronHover: "",
    insightHeadline: "text-sm font-medium leading-snug text-white",
    signalNeutral: "text-white",
    signalAttention: "text-amber-300",
    signalPositive: "text-emerald-300",
    signalRisk: "text-red-300",
    liveDot: "bg-emerald-500",
  },
  brand: {
    brandAccent: "#22d3ee",
    brandAccentHover: "#67e8f9",
    brandAccentSoft: "rgba(34,211,238,0.15)",
    brandAccentBorder: "rgba(34,211,238,0.28)",
    brandAccentText: "#0f172a",
    brandAccentMuted: "#0891b2",
    brandCtaBg: "#06b6d4",
    brandCtaBgHover: "#22d3ee",
    brandCtaText: "#0f172a",
    brandCtaShadow: "0_2px_10px_rgba(34,211,238,0.22)",
    brandBadgeBg:
      "inline-flex items-center rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300 ring-1 ring-cyan-500/30",
    brandBadgeText: "",
    brandBadgeRing: "",
    brandLink: "#0e7490",
    brandLinkHover: "#155e75",
    brandMomentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500",
    brandMoneyLeadBorder: "#06b6d4",
    brandConnectionArrow: "h-3 w-3 text-cyan-600",
    brandRowHoverBorder: "rgba(34,211,238,0.40)",
    brandCanvasGlow:
      "pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_60%_70%_at_30%_0%,rgba(34,211,238,0.07),transparent_70%)]",
    brandCanvasGlowSecondary:
      "pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_100%_0%,rgba(100,116,139,0.06),transparent_68%)]",
    brandBoardAccent:
      "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(34,211,238,0.28)] to-transparent",
    brandFooterAccent:
      "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(34,211,238,0.22)] to-transparent",
    brandColumnRail:
      "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-slate-300/60 to-transparent lg:block",
    brandHealthTrack: "rgba(148,163,184,0.25)",
    brandIntelligence: "text-slate-400",
    brandConceptBg:
      "inline-flex items-center rounded-full bg-slate-800/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 ring-1 ring-slate-600/30",
    brandConceptText: "",
    brandConceptRing: "",
    brandConceptLabel: "text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500",
  },
  semantic: {
    success: "#10b981",
    successSoft: "bg-emerald-950/35",
    successText: "text-emerald-700",
    successTextDark: "text-emerald-300",
    successBadge:
      "inline-flex items-center gap-1.5 rounded-md border border-cyan-500/25 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-medium text-cyan-300",
    successDot: "bg-emerald-500",
    successRing: "ring-emerald-200/80",
    successGradientFrom: "#10b981",
    successGradientTo: "#059669",
    warning: "#f59e0b",
    warningSoft: "bg-amber-50",
    warningText: "text-amber-800",
    warningTextDark: "text-amber-300",
    warningDot: "bg-amber-500",
    warningGradientFrom: "#f59e0b",
    warningGradientTo: "#d97706",
    danger: "#ef4444",
    dangerSoft: "bg-red-50",
    dangerText: "text-red-700",
    dangerTextDark: "text-red-300",
    dangerDot: "bg-red-500",
    dangerIcon: "text-red-600",
    info: "#22d3ee",
    infoSoft: "rgba(34,211,238,0.12)",
    infoText: "text-cyan-700",
    infoTextDark: "text-cyan-300",
    infoBadge:
      "inline-flex items-center gap-1.5 rounded-md border border-cyan-500/25 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-medium text-cyan-300",
    neutral: "#94a3b8",
    neutralSoft: "ring-slate-200",
    neutralText: "text-slate-600",
    neutralDot: "bg-slate-400",
    neutralGradientFrom: "#94a3b8",
    neutralGradientTo: "#64748b",
    notificationDot: "bg-amber-500",
    liveBadgeShell:
      "hidden items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-600/20 sm:inline-flex",
    healthGradientStart: "#059669",
    healthGradientEnd: "#047857",
    healthValue: "text-[11px] font-bold tabular-nums text-emerald-800",
    systemStatus: "inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700",
    systemNotification: "inline-flex items-center gap-1 text-[11px] text-slate-500",
  },
};

/* ── Palette 2: Graphite Brass (no cyan/blue/purple) ── */

const graphiteBrassRoles: PaletteRoles = {
  shell: {
    shellBg: "#0F141B",
    shellPanel: "#111720",
    shellBorder: "rgba(255,255,255,0.08)",
    shellText: "#F5F3EF",
    shellMuted: "#9A9590",
    shellActiveBg: "rgba(255,255,255,0.06)",
    shellActiveText: "#FCFBF8",
    shellActiveRail: "#C6A757",
    shellIcon: "#C6A757",
    shellLogoFrom: "#1A1D22",
    shellLogoTo: "#0F141B",
    shellLogoText: "#E8E0D0",
    shellGroupLabel: "#6B6560",
    shellNavInactive: "#7A756F",
    shellNavHover: "#D4CFC8",
    shellAvatarBg: "#141B24",
  },
  workspace: {
    workspaceBg: "linear-gradient(180deg,#EDE8DF_0%,#E8E2D8_28%,#F0EBE3_62%,#F8F5F0_100%)",
    workspaceWash: "#E8E2D8",
    cardBg: "#FFFFFF",
    cardElevatedBg: "linear-gradient(180deg,#FCFBF8_0%,#F5F1EA_48%,#FCFBF8_100%)",
    cardBorder: "rgba(30,27,22,0.14)",
    cardStrongBorder: "rgba(198,167,87,0.22)",
    cardShadow: "0_10px_44px_-14px_rgba(30,27,22,0.14),0_0_0_1px_rgba(255,255,255,0.88)_inset",
    cardHoverShadow: "0_4px_16px_rgba(30,27,22,0.10)",
    cardText: "#1E1B16",
    cardMuted: "rgba(30,27,22,0.55)",
    divider: "rgba(198,167,87,0.16)",
    icon: "#5C5348",
    iconMuted: "rgba(30,27,22,0.45)",
    iconHover: "#3D3428",
    rowArrow: "rgba(30,27,22,0.40)",
  },
  hero: {
    heroBg: "#171A1F",
    heroBgVia: "#141B24",
    heroBgTo: "#111720",
    heroBorder: "rgba(198,167,87,0.18)",
    heroText: "#FCFBF8",
    heroMuted: "#9A9590",
    heroAccent: "#C6A757",
    heroAccentSoft: "rgba(198,167,87,0.15)",
    heroAccentRail: "rgba(198,167,87,0.48)",
    primaryActionBg: "#171A1F",
    primaryActionBgVia: "#141B24",
    primaryActionBgTo: "#111720",
    primaryActionBorder: "#C6A757",
    primaryActionRing: "rgba(198,167,87,0.22)",
    primaryActionText: "#E8E0D0",
    primaryActionSubtext: "#9A9590",
    primaryActionMetric: "#E8DDC2",
    primaryActionTitle: "text-lg font-semibold leading-snug text-white sm:text-xl",
    insightBorder: "#C6A757",
    insightBg: "rgba(23,26,31,0.55)",
    insightRing: "rgba(198,167,87,0.14)",
    secondaryBg: "rgba(23,26,31,0.45)",
    secondaryBorder: "rgba(100,95,88,0.40)",
    secondaryHoverBorder: "rgba(198,167,87,0.32)",
    secondaryIndexBg: "rgba(45,42,38,0.70)",
    secondaryIndexText: "#C6A757",
    signalChipBorder: "rgba(100,95,88,0.35)",
    signalChipBg: "rgba(23,26,31,0.40)",
    signalLabel: "#9A9590",
    opsScoreBorder: "rgba(198,167,87,0.24)",
    opsScoreBg: "rgba(23,26,31,0.45)",
    opsScoreTrack: "rgba(45,42,38,0.70)",
    opsScoreFillFrom: "#C6A757",
    opsScoreFillTo: "#8B7232",
    opsScoreDivider: "rgba(198,167,87,0.28)",
    footerWash: "#111720",
    accentLine: "rgba(198,167,87,0.38)",
    shiftMuted: "#9A9590",
    secondaryLabel: "text-sm font-medium text-[#E8E0D0] group-hover:text-white",
    secondaryMetric: "hidden text-xs tabular-nums text-[#9A9590] sm:inline",
    secondaryChevron: "h-3.5 w-3.5 text-[#7A756F] transition-transform group-hover:translate-x-0.5 group-hover:text-[#C6A757]",
    secondaryChevronHover: "",
    insightHeadline: "text-sm font-medium leading-snug text-white",
    signalNeutral: "text-white",
    signalAttention: "text-amber-300",
    signalPositive: "text-emerald-300",
    signalRisk: "text-red-300",
    liveDot: "bg-emerald-500",
  },
  brand: {
    brandAccent: "#C6A757",
    brandAccentHover: "#D4B76A",
    brandAccentSoft: "rgba(198,167,87,0.15)",
    brandAccentBorder: "rgba(198,167,87,0.32)",
    brandAccentText: "#FCFBF8",
    brandAccentMuted: "#8B7232",
    brandCtaBg: "#B8943F",
    brandCtaBgHover: "#C6A757",
    brandCtaText: "#FCFBF8",
    brandCtaShadow: "0_2px_10px_rgba(184,148,63,0.30)",
    brandBadgeBg:
      "inline-flex items-center rounded-md bg-[rgba(198,167,87,0.18)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.35)]",
    brandBadgeText: "",
    brandBadgeRing: "",
    brandLink: "#8B7232",
    brandLinkHover: "#6B5A2E",
    brandMomentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8943F]",
    brandMoneyLeadBorder: "#B8943F",
    brandConnectionArrow: "h-3 w-3 text-[#B8943F]",
    brandRowHoverBorder: "rgba(198,167,87,0.28)",
    brandCanvasGlow:
      "pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_60%_70%_at_30%_0%,rgba(198,167,87,0.07),transparent_70%)]",
    brandCanvasGlowSecondary:
      "pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_100%_0%,rgba(30,27,22,0.04),transparent_68%)]",
    brandBoardAccent:
      "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.42)] to-transparent",
    brandFooterAccent:
      "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.35)] to-transparent",
    brandColumnRail:
      "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[rgba(198,167,87,0.30)] to-transparent lg:block",
    brandHealthTrack: "rgba(198,167,87,0.22)",
    brandIntelligence: "text-[#C6A757]",
    brandConceptBg:
      "inline-flex items-center rounded-full bg-[rgba(198,167,87,0.14)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.32)]",
    brandConceptText: "",
    brandConceptRing: "",
    brandConceptLabel: "text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(30,27,22,0.50)]",
  },
  semantic: {
    success: "#059669",
    successSoft: "bg-emerald-950/35",
    successText: "text-emerald-700",
    successTextDark: "text-emerald-300",
    successBadge:
      "inline-flex items-center gap-1.5 rounded-md border border-emerald-500/28 bg-emerald-950/35 px-2 py-0.5 text-[10px] font-medium text-emerald-300",
    successDot: "bg-emerald-500",
    successRing: "ring-emerald-200/80",
    successGradientFrom: "#10b981",
    successGradientTo: "#059669",
    warning: "#d97706",
    warningSoft: "bg-amber-50",
    warningText: "text-amber-800",
    warningTextDark: "text-amber-300",
    warningDot: "bg-amber-500",
    warningGradientFrom: "#f59e0b",
    warningGradientTo: "#d97706",
    danger: "#dc2626",
    dangerSoft: "bg-red-50",
    dangerText: "text-red-700",
    dangerTextDark: "text-red-300",
    dangerDot: "bg-red-500",
    dangerIcon: "text-red-600",
    info: "#8B7232",
    infoSoft: "rgba(198,167,87,0.12)",
    infoText: "text-[#8B7232]",
    infoTextDark: "text-[#E8DDC2]",
    infoBadge:
      "inline-flex items-center gap-1.5 rounded-md border border-emerald-500/28 bg-emerald-950/35 px-2 py-0.5 text-[10px] font-medium text-emerald-300",
    neutral: "#78716c",
    neutralSoft: "ring-[rgba(30,27,22,0.12)]",
    neutralText: "text-[#5C5348]",
    neutralDot: "bg-[#78716c]",
    neutralGradientFrom: "#a8a29e",
    neutralGradientTo: "#78716c",
    notificationDot: "bg-amber-500",
    liveBadgeShell:
      "hidden items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-600/20 sm:inline-flex",
    healthGradientStart: "#059669",
    healthGradientEnd: "#047857",
    healthValue: "text-[11px] font-bold tabular-nums text-emerald-800",
    systemStatus: "inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700",
    systemNotification: "inline-flex items-center gap-1 text-[11px] text-[rgba(30,27,22,0.58)]",
  },
};

/* ── Palette 3: Luxury Hybrid (brass primary, muted cyan field ops only) ── */

const luxuryHybridRoles: PaletteRoles = {
  shell: {
    shellBg: "#0D1219",
    shellPanel: "#10161F",
    shellBorder: "rgba(255,255,255,0.07)",
    shellText: "#F0EDE8",
    shellMuted: "#969088",
    shellActiveBg: "rgba(255,255,255,0.06)",
    shellActiveText: "#FAF9F6",
    shellActiveRail: "#C6A757",
    shellIcon: "#C6A757",
    shellLogoFrom: "#181C24",
    shellLogoTo: "#0D1219",
    shellLogoText: "#E8E0D0",
    shellGroupLabel: "#6B6560",
    shellNavInactive: "#7A756F",
    shellNavHover: "#D4CFC8",
    shellAvatarBg: "#141B24",
  },
  workspace: {
    workspaceBg: "linear-gradient(180deg,#F0EBE3_0%,#EAE4DC_28%,#F2EDE6_62%,#FAF8F5_100%)",
    workspaceWash: "#EAE4DC",
    cardBg: "#FFFFFF",
    cardElevatedBg: "linear-gradient(180deg,#FAF9F6_0%,#F2EDE6_48%,#FAF9F6_100%)",
    cardBorder: "rgba(30,27,22,0.12)",
    cardStrongBorder: "rgba(198,167,87,0.18)",
    cardShadow: "0_10px_44px_-14px_rgba(30,27,22,0.12),0_0_0_1px_rgba(255,255,255,0.86)_inset",
    cardHoverShadow: "0_4px_14px_rgba(30,27,22,0.08)",
    cardText: "#1E1B16",
    cardMuted: "rgba(30,27,22,0.52)",
    divider: "rgba(198,167,87,0.14)",
    icon: "#5C5348",
    iconMuted: "rgba(30,27,22,0.42)",
    iconHover: "#3D3428",
    rowArrow: "rgba(30,27,22,0.38)",
  },
  hero: {
    heroBg: "#141C28",
    heroBgVia: "#111A26",
    heroBgTo: "#0D1219",
    heroBorder: "rgba(198,167,87,0.16)",
    heroText: "#FAF9F6",
    heroMuted: "#969088",
    heroAccent: "#C6A757",
    heroAccentSoft: "rgba(198,167,87,0.14)",
    heroAccentRail: "rgba(198,167,87,0.38)",
    primaryActionBg: "#141C28",
    primaryActionBgVia: "#111A26",
    primaryActionBgTo: "#0D1219",
    primaryActionBorder: "#C6A757",
    primaryActionRing: "rgba(198,167,87,0.18)",
    primaryActionText: "#E8E0D0",
    primaryActionSubtext: "#969088",
    primaryActionMetric: "#E8DDC2",
    primaryActionTitle: "text-lg font-semibold leading-snug text-white sm:text-xl",
    insightBorder: "#C6A757",
    insightBg: "rgba(20,28,40,0.45)",
    insightRing: "rgba(198,167,87,0.12)",
    secondaryBg: "rgba(20,28,40,0.40)",
    secondaryBorder: "rgba(100,95,88,0.38)",
    secondaryHoverBorder: "rgba(198,167,87,0.28)",
    secondaryIndexBg: "rgba(45,42,38,0.65)",
    secondaryIndexText: "#C6A757",
    signalChipBorder: "rgba(100,95,88,0.32)",
    signalChipBg: "rgba(20,28,40,0.38)",
    signalLabel: "#969088",
    opsScoreBorder: "rgba(198,167,87,0.20)",
    opsScoreBg: "rgba(20,28,40,0.40)",
    opsScoreTrack: "rgba(45,42,38,0.65)",
    opsScoreFillFrom: "#C6A757",
    opsScoreFillTo: "#8B7232",
    opsScoreDivider: "rgba(198,167,87,0.22)",
    footerWash: "#0D1219",
    accentLine: "rgba(198,167,87,0.32)",
    shiftMuted: "#969088",
    secondaryLabel: "text-sm font-medium text-[#E8E0D0] group-hover:text-white",
    secondaryMetric: "hidden text-xs tabular-nums text-[#969088] sm:inline",
    secondaryChevron: "h-3.5 w-3.5 text-[#7A756F] transition-transform group-hover:translate-x-0.5 group-hover:text-[#C6A757]",
    secondaryChevronHover: "",
    insightHeadline: "text-sm font-medium leading-snug text-white",
    signalNeutral: "text-white",
    signalAttention: "text-amber-300",
    signalPositive: "text-emerald-300",
    signalRisk: "text-red-300",
    liveDot: "bg-emerald-500",
  },
  brand: {
    brandAccent: "#C6A757",
    brandAccentHover: "#D4B76A",
    brandAccentSoft: "rgba(198,167,87,0.14)",
    brandAccentBorder: "rgba(198,167,87,0.28)",
    brandAccentText: "#FAF9F6",
    brandAccentMuted: "#8B7232",
    brandCtaBg: "#B8943F",
    brandCtaBgHover: "#C6A757",
    brandCtaText: "#FAF9F6",
    brandCtaShadow: "0_2px_10px_rgba(184,148,63,0.26)",
    brandBadgeBg:
      "inline-flex items-center rounded-md bg-[rgba(198,167,87,0.16)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.30)]",
    brandBadgeText: "",
    brandBadgeRing: "",
    brandLink: "#8B7232",
    brandLinkHover: "#6B5A2E",
    brandMomentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8943F]",
    brandMoneyLeadBorder: "#B8943F",
    brandConnectionArrow: "h-3 w-3 text-[#5B8A9A]",
    brandRowHoverBorder: "rgba(198,167,87,0.24)",
    brandCanvasGlow:
      "pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_60%_70%_at_25%_0%,rgba(198,167,87,0.05),transparent_70%)]",
    brandCanvasGlowSecondary:
      "pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_100%_0%,rgba(91,138,154,0.05),transparent_68%)]",
    brandBoardAccent:
      "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.32)] to-transparent",
    brandFooterAccent:
      "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.26)] to-transparent",
    brandColumnRail:
      "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[rgba(198,167,87,0.24)] to-transparent lg:block",
    brandHealthTrack: "rgba(198,167,87,0.18)",
    brandIntelligence: "text-[#C6A757]",
    brandConceptBg:
      "inline-flex items-center rounded-full bg-[rgba(198,167,87,0.12)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.28)]",
    brandConceptText: "",
    brandConceptRing: "",
    brandConceptLabel: "text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(30,27,22,0.48)]",
  },
  semantic: {
    success: "#059669",
    successSoft: "bg-emerald-950/35",
    successText: "text-emerald-700",
    successTextDark: "text-emerald-300",
    successBadge:
      "inline-flex items-center gap-1.5 rounded-md border border-[rgba(91,138,154,0.30)] bg-[rgba(15,35,45,0.50)] px-2 py-0.5 text-[10px] font-medium text-[#7BA8B8]",
    successDot: "bg-emerald-500",
    successRing: "ring-emerald-200/80",
    successGradientFrom: "#10b981",
    successGradientTo: "#059669",
    warning: "#d97706",
    warningSoft: "bg-amber-50",
    warningText: "text-amber-800",
    warningTextDark: "text-amber-300",
    warningDot: "bg-amber-500",
    warningGradientFrom: "#f59e0b",
    warningGradientTo: "#d97706",
    danger: "#dc2626",
    dangerSoft: "bg-red-50",
    dangerText: "text-red-700",
    dangerTextDark: "text-red-300",
    dangerDot: "bg-red-500",
    dangerIcon: "text-red-600",
    info: "#5B8A9A",
    infoSoft: "rgba(91,138,154,0.12)",
    infoText: "text-[#5B8A9A]",
    infoTextDark: "text-[#7BA8B8]",
    infoBadge:
      "inline-flex items-center gap-1.5 rounded-md border border-[rgba(91,138,154,0.30)] bg-[rgba(15,35,45,0.50)] px-2 py-0.5 text-[10px] font-medium text-[#7BA8B8]",
    neutral: "#78716c",
    neutralSoft: "ring-[rgba(30,27,22,0.10)]",
    neutralText: "text-[#5C5348]",
    neutralDot: "bg-[#78716c]",
    neutralGradientFrom: "#a8a29e",
    neutralGradientTo: "#78716c",
    notificationDot: "bg-amber-500",
    liveBadgeShell:
      "hidden items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-600/20 sm:inline-flex",
    healthGradientStart: "#059669",
    healthGradientEnd: "#047857",
    healthValue: "text-[11px] font-bold tabular-nums text-emerald-800",
    systemStatus: "inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700",
    systemNotification: "inline-flex items-center gap-1 text-[11px] text-[rgba(30,27,22,0.58)]",
  },
};

/* ── Palette 4: Warm Executive (no cyan/blue/purple) ── */

const warmExecutiveRoles: PaletteRoles = {
  shell: {
    shellBg: "#111318",
    shellPanel: "#13161C",
    shellBorder: "rgba(255,255,255,0.06)",
    shellText: "#F2EFE9",
    shellMuted: "#969088",
    shellActiveBg: "rgba(255,255,255,0.05)",
    shellActiveText: "#FBFAF7",
    shellActiveRail: "#D4C4A0",
    shellIcon: "#D4C4A0",
    shellLogoFrom: "#1A1D22",
    shellLogoTo: "#111318",
    shellLogoText: "#E8E0D0",
    shellGroupLabel: "#6B6560",
    shellNavInactive: "#7A756F",
    shellNavHover: "#D4CFC8",
    shellAvatarBg: "#1A1D22",
  },
  workspace: {
    workspaceBg: "linear-gradient(180deg,#F2EFE9_0%,#EBE6DE_28%,#F5F2EC_62%,#FBFAF7_100%)",
    workspaceWash: "#EBE6DE",
    cardBg: "#FFFFFF",
    cardElevatedBg: "linear-gradient(180deg,#FBFAF7_0%,#F2EFE9_48%,#FBFAF7_100%)",
    cardBorder: "rgba(30,27,22,0.12)",
    cardStrongBorder: "rgba(212,196,160,0.20)",
    cardShadow: "0_8px_36px_-12px_rgba(30,27,22,0.12),0_0_0_1px_rgba(255,255,255,0.88)_inset",
    cardHoverShadow: "0_3px_14px_rgba(30,27,22,0.08)",
    cardText: "#1E1B16",
    cardMuted: "rgba(30,27,22,0.52)",
    divider: "rgba(212,196,160,0.14)",
    icon: "#5C5348",
    iconMuted: "rgba(30,27,22,0.42)",
    iconHover: "#3A342C",
    rowArrow: "rgba(30,27,22,0.38)",
  },
  hero: {
    heroBg: "#FBFAF7",
    heroBgVia: "#F5F3EF",
    heroBgTo: "#F2EFE9",
    heroBorder: "rgba(212,196,160,0.18)",
    heroText: "#1E1B16",
    heroMuted: "rgba(30,27,22,0.55)",
    heroAccent: "#9A8B6E",
    heroAccentSoft: "rgba(212,196,160,0.18)",
    heroAccentRail: "rgba(212,196,160,0.38)",
    primaryActionBg: "#1A1D22",
    primaryActionBgVia: "#161920",
    primaryActionBgTo: "#13161C",
    primaryActionBorder: "#B8A882",
    primaryActionRing: "rgba(212,196,160,0.16)",
    primaryActionText: "#E8E0D0",
    primaryActionSubtext: "rgba(232,224,208,0.65)",
    primaryActionMetric: "#E8E0D0",
    primaryActionTitle: "text-lg font-semibold leading-snug text-white sm:text-xl",
    insightBorder: "#B8A882",
    insightBg: "rgba(251,250,247,0.88)",
    insightRing: "rgba(30,27,22,0.06)",
    secondaryBg: "rgba(251,250,247,0.92)",
    secondaryBorder: "rgba(30,27,22,0.10)",
    secondaryHoverBorder: "rgba(212,196,160,0.24)",
    secondaryIndexBg: "#F2EFE9",
    secondaryIndexText: "#9A8B6E",
    signalChipBorder: "rgba(30,27,22,0.08)",
    signalChipBg: "rgba(251,250,247,0.92)",
    signalLabel: "rgba(30,27,22,0.52)",
    opsScoreBorder: "rgba(212,196,160,0.18)",
    opsScoreBg: "rgba(251,250,247,0.92)",
    opsScoreTrack: "#F2EFE9",
    opsScoreFillFrom: "#B8A882",
    opsScoreFillTo: "#9A8B6E",
    opsScoreDivider: "rgba(212,196,160,0.24)",
    footerWash: "#F2EFE9",
    accentLine: "rgba(212,196,160,0.30)",
    shiftMuted: "rgba(30,27,22,0.55)",
    secondaryLabel: "text-sm font-medium text-[#3A342C] group-hover:text-[#1E1B16]",
    secondaryMetric: "hidden text-xs tabular-nums text-[rgba(30,27,22,0.55)] sm:inline",
    secondaryChevron: "h-3.5 w-3.5 text-[rgba(30,27,22,0.40)] transition-transform group-hover:translate-x-0.5 group-hover:text-[#9A8B6E]",
    secondaryChevronHover: "",
    insightHeadline: "text-sm font-medium leading-snug text-[#1E1B16]",
    signalNeutral: "text-[#1E1B16]",
    signalAttention: "text-amber-800",
    signalPositive: "text-emerald-800",
    signalRisk: "text-red-800",
    liveDot: "bg-emerald-600",
  },
  brand: {
    brandAccent: "#D4C4A0",
    brandAccentHover: "#E0D2B0",
    brandAccentSoft: "rgba(212,196,160,0.18)",
    brandAccentBorder: "rgba(212,196,160,0.26)",
    brandAccentText: "#FBFAF7",
    brandAccentMuted: "#9A8B6E",
    brandCtaBg: "#9A8B6E",
    brandCtaBgHover: "#B8A882",
    brandCtaText: "#FBFAF7",
    brandCtaShadow: "0_2px_8px_rgba(154,139,110,0.22)",
    brandBadgeBg:
      "inline-flex items-center rounded-md bg-[rgba(212,196,160,0.18)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B5F4A] ring-1 ring-[rgba(212,196,160,0.28)]",
    brandBadgeText: "",
    brandBadgeRing: "",
    brandLink: "#8B7D62",
    brandLinkHover: "#6B5F4A",
    brandMomentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8A882]",
    brandMoneyLeadBorder: "#B8A882",
    brandConnectionArrow: "h-3 w-3 text-[#9A8B6E]",
    brandRowHoverBorder: "rgba(212,196,160,0.22)",
    brandCanvasGlow:
      "pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_60%_70%_at_30%_0%,rgba(212,196,160,0.05),transparent_72%)]",
    brandCanvasGlowSecondary:
      "pointer-events-none absolute right-0 top-0 h-24 w-36 bg-[radial-gradient(circle_at_100%_0%,rgba(30,27,22,0.03),transparent_70%)]",
    brandBoardAccent:
      "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,196,160,0.30)] to-transparent",
    brandFooterAccent:
      "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,196,160,0.24)] to-transparent",
    brandColumnRail:
      "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[rgba(212,196,160,0.22)] to-transparent lg:block",
    brandHealthTrack: "rgba(212,196,160,0.20)",
    brandIntelligence: "text-[#9A8B6E]",
    brandConceptBg:
      "inline-flex items-center rounded-full bg-[rgba(212,196,160,0.24)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B5F4A] ring-1 ring-[rgba(212,196,160,0.30)]",
    brandConceptText: "",
    brandConceptRing: "",
    brandConceptLabel: "text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(30,27,22,0.48)]",
  },
  semantic: {
    success: "#059669",
    successSoft: "bg-emerald-50/80",
    successText: "text-emerald-800",
    successTextDark: "text-emerald-800",
    successBadge:
      "inline-flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-medium text-emerald-800",
    successDot: "bg-emerald-600",
    successRing: "ring-emerald-200/80",
    successGradientFrom: "#10b981",
    successGradientTo: "#059669",
    warning: "#d97706",
    warningSoft: "bg-amber-50",
    warningText: "text-amber-800",
    warningTextDark: "text-amber-800",
    warningDot: "bg-amber-500",
    warningGradientFrom: "#f59e0b",
    warningGradientTo: "#d97706",
    danger: "#dc2626",
    dangerSoft: "bg-red-50",
    dangerText: "text-red-700",
    dangerTextDark: "text-red-800",
    dangerDot: "bg-red-500",
    dangerIcon: "text-red-600",
    info: "#9A8B6E",
    infoSoft: "rgba(212,196,160,0.14)",
    infoText: "text-[#8B7D62]",
    infoTextDark: "text-[#6B5F4A]",
    infoBadge:
      "inline-flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-medium text-emerald-800",
    neutral: "#78716c",
    neutralSoft: "ring-[rgba(30,27,22,0.10)]",
    neutralText: "text-[#5C5348]",
    neutralDot: "bg-[#78716c]",
    neutralGradientFrom: "#a8a29e",
    neutralGradientTo: "#78716c",
    notificationDot: "bg-amber-500",
    liveBadgeShell:
      "hidden items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-600/20 sm:inline-flex",
    healthGradientStart: "#059669",
    healthGradientEnd: "#047857",
    healthValue: "text-[11px] font-bold tabular-nums text-emerald-800",
    systemStatus: "inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700",
    systemNotification: "inline-flex items-center gap-1 text-[11px] text-[rgba(30,27,22,0.55)]",
  },
};

export const missionControlRefined = buildPaletteTokens(
  "mission-control-refined",
  "Mission Control Original Refined",
  "Dark graphite shell, navy hero, cyan live signals — energy without cyberpunk glow.",
  "dark",
  missionControlRoles,
);

export const graphiteBrass = buildPaletteTokens(
  "graphite-brass",
  "Graphite Brass",
  "Dark shell and hero with crisp warm workspace — gold as premium command accent, not beige.",
  "dark",
  graphiteBrassRoles,
);

export const luxuryHybrid = buildPaletteTokens(
  "luxury-hybrid",
  "Luxury Hybrid",
  "Dark shell, brass command + muted cyan field ops on a warm workspace — realistic production blend.",
  "dark",
  luxuryHybridRoles,
);

export const warmExecutive = buildPaletteTokens(
  "warm-executive",
  "Warm Executive",
  "Graphite shell, calm warm workspace, champagne accents — office-friendly with quiet confidence.",
  "light",
  warmExecutiveRoles,
);

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
