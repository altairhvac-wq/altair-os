import { buttonClassName } from "@/shared/design-system/components/button-styles";

/** Owner-operator /jobs mobile North Star — technician-inspired, light field surfaces. */

export const ownerMobilePageCanvas =
  "max-lg:bg-gradient-to-b max-lg:from-[#fafaf8] max-lg:via-[#f5f5f4] max-lg:to-[#f6f4f2]";

export const ownerMobileCompactHeroClass =
  "shrink-0 border-b border-slate-500/25 bg-[#2B3328] px-4 py-2.5";

export const ownerMobileCompactHeroEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D9BC6E]";

/** Dark hero helper — slate tone for “scheduled today” readability (not pale cream). */
export const ownerMobileCompactHeroMutedClass = "text-xs text-slate-300";

export const ownerMobileScrollContentClass =
  "min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[max(6rem,calc(5rem+env(safe-area-inset-bottom,0px)))]";

export const ownerMobileSectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400";

export const ownerMobileHeroCardClass =
  "overflow-hidden rounded-2xl border border-slate-300/45 bg-white shadow-[0_4px_20px_-6px_rgba(15,23,42,0.08)]";

export const ownerMobileHeroCardLiveClass =
  "ring-1 ring-inset ring-[rgba(194,160,90,0.22)]";

/** Primary CTA — canonical graphite command treatment. */
export const ownerMobileHeroPrimaryActionClass =
  buttonClassName("primary", "md", "w-full touch-manipulation");

export const ownerMobileHeroSecondaryActionClass =
  buttonClassName("secondary", "md", "w-full touch-manipulation");

export const ownerMobileUpNextRowClass =
  "flex w-full touch-manipulation items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-3.5 py-3 text-left shadow-[0_1px_6px_-2px_rgba(15,23,42,0.08)] transition-colors active:bg-slate-50/80";

export const ownerMobileArchiveInputClass =
  "h-11 w-full min-h-11 rounded-xl border border-slate-200/90 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-[rgba(194,160,90,0.45)] focus:ring-2 focus:ring-[rgba(194,160,90,0.18)]";

export const ownerMobileArchiveResultRowClass =
  "flex w-full touch-manipulation items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-3.5 py-3 text-left shadow-[0_1px_6px_-2px_rgba(15,23,42,0.06)] transition-colors active:bg-slate-50/80";

/** Dark compact hero — canonical secondary action. */
export const ownerMobileFiltersButtonClass =
  buttonClassName("secondary", "sm", "shrink-0 touch-manipulation");

export const ownerMobileEmptyCardClass =
  "rounded-2xl border border-slate-200/70 bg-white px-5 py-8 text-center shadow-[0_1px_8px_-2px_rgba(15,23,42,0.06)]";
