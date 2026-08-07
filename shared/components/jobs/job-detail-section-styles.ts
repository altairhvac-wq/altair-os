import { adminCardSectionClass } from "@/shared/lib/admin-density";
import {
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import { altairCanvasInkLinkClass } from "@/shared/design-system/foundation";

export function resolveJobDetailSectionClass(
  northStar?: boolean,
  compact?: boolean,
) {
  if (!northStar) {
    return adminCardSectionClass;
  }

  // MC v2 paper register (Jobs redesign). `compact` keeps the same shell.
  void compact;
  return `${altairMcCardClass} ${altairMcCardPadClass}`;
}

export function jobDetailSectionTitleClass(northStar?: boolean) {
  return northStar
    ? "text-sm font-bold tracking-tight text-altair-ink-on-paper"
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";
}

export function jobDetailSectionSubtitleClass(northStar?: boolean) {
  return northStar
    ? "mt-0.5 text-xs text-altair-ink-on-paper-muted"
    : "mt-1 text-sm text-slate-600";
}

export function jobDetailBodyTextClass(northStar?: boolean) {
  return northStar
    ? "text-sm leading-relaxed text-altair-ink-on-paper-secondary"
    : "text-sm leading-relaxed text-slate-600";
}

export function jobDetailEmptyStateClass(northStar?: boolean) {
  return northStar
    ? "rounded-none border border-dashed border-[var(--north-star-plate-border)] bg-[var(--surface-tile)] px-4 py-8 text-center"
    : "rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center";
}

export function jobDetailEmptyTitleClass(northStar?: boolean) {
  return northStar
    ? "text-sm font-medium text-altair-ink-on-paper"
    : "text-sm font-medium text-slate-700";
}

export function jobDetailEmptyHintClass(northStar?: boolean) {
  return northStar
    ? "mt-1 text-xs text-altair-ink-on-paper-muted"
    : "mt-1 text-xs text-slate-500";
}

export function jobDetailPrimaryTextClass(northStar?: boolean) {
  return northStar
    ? "font-semibold text-altair-ink-on-paper"
    : "font-semibold text-slate-900";
}

export function jobDetailSecondaryTextClass(northStar?: boolean) {
  return northStar
    ? "text-sm text-altair-ink-on-paper-secondary"
    : "text-sm text-slate-600";
}

export function jobDetailMutedTextClass(northStar?: boolean) {
  return northStar
    ? "text-xs text-altair-ink-on-paper-muted"
    : "text-xs text-slate-500";
}

export function jobDetailLinkClass(northStar?: boolean) {
  return northStar
    ? `text-xs font-semibold ${altairCanvasInkLinkClass}`
    : "text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700";
}

export function jobDetailSectionIconWrapClass(northStar?: boolean) {
  return northStar
    ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-stone ring-1 ring-altair-border [&_svg]:text-altair-ink-on-paper-secondary"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 ring-1 ring-cyan-600/10";
}
