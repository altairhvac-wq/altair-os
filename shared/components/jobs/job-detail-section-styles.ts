import { adminCardSectionClass } from "@/shared/lib/admin-density";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

export function resolveJobDetailSectionClass(
  northStar?: boolean,
  compact?: boolean,
) {
  if (!northStar) {
    return adminCardSectionClass;
  }

  return compact ? dt.compactSectionSurface : dt.sectionSurface;
}

export function jobDetailSectionTitleClass(northStar?: boolean) {
  return northStar
    ? dt.sectionTitle
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";
}

export function jobDetailSectionSubtitleClass(northStar?: boolean) {
  return northStar ? dt.sectionSubtitle : "mt-1 text-sm text-slate-600";
}

export function jobDetailBodyTextClass(northStar?: boolean) {
  return northStar
    ? "text-sm font-medium leading-relaxed text-[#4F4638]"
    : "text-sm leading-relaxed text-slate-600";
}

export function jobDetailEmptyStateClass(northStar?: boolean) {
  return northStar
    ? dt.emptyState
    : "rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center";
}

export function jobDetailEmptyTitleClass(northStar?: boolean) {
  return northStar
    ? "text-sm font-medium text-[#4F4638]"
    : "text-sm font-medium text-slate-700";
}

export function jobDetailEmptyHintClass(northStar?: boolean) {
  return northStar ? "mt-1 text-xs text-[#64748B]" : "mt-1 text-xs text-slate-500";
}

export function jobDetailPrimaryTextClass(northStar?: boolean) {
  return northStar ? "font-semibold text-[#17130E]" : "font-semibold text-slate-900";
}

export function jobDetailSecondaryTextClass(northStar?: boolean) {
  return northStar ? "text-sm text-[#4F4638]" : "text-sm text-slate-600";
}

export function jobDetailMutedTextClass(northStar?: boolean) {
  return northStar ? "text-xs text-[#64748B]" : "text-xs text-slate-500";
}

export function jobDetailLinkClass(northStar?: boolean) {
  return northStar
    ? dt.link
    : "text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700";
}

export function jobDetailSectionIconWrapClass(northStar?: boolean) {
  return northStar
    ? dt.sectionIconWrap
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 ring-1 ring-cyan-600/10";
}
