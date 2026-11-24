/**
 * Class strings shared by the public directory pages, so the search page,
 * the business page and the forms cannot drift apart. The light look of the
 * Resource Center: stone neutrals, black primary buttons, brass accents.
 */

export const dirInput =
  "min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30 aria-[invalid=true]:border-[#b4532a]";

export const dirLabel = "block text-sm font-medium text-stone-800";

export const dirHint = "mt-1 text-xs leading-relaxed text-stone-500";

export const dirError = "mt-1 text-xs font-medium text-[#9a3412]";

export const dirPrimaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0A0A0A] px-5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/60 focus-visible:ring-offset-2 disabled:opacity-60";

export const dirSecondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40";

export const dirLink =
  "rounded-sm font-medium text-[#77591B] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40";

export const dirCard = "rounded-2xl border border-stone-200/80 bg-white shadow-sm";

export const dirBadge =
  "inline-flex items-center rounded-full border border-[#C2A05A]/40 bg-[#FBF6EA] px-2.5 py-0.5 text-xs font-medium text-[#5c4614]";

export const dirEyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]";

/** The focus ring of the in-page tools (shared/components/resources/tools). */
export const dirFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/60 focus-visible:ring-offset-2";

/** The brass action button of the in-page tools: the one strong action on a screen. */
export const dirBrassButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#A4823A] px-5 text-sm font-semibold text-[#080907] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] transition-colors hover:bg-[#C2A05A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

/** A quiet button on the dark band. */
export const dirDarkButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-[#f3ebdd] transition-colors hover:border-white/30 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f0c]";

/** The light panel: a section of a page. */
export const dirPanel = "rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]";

/** Rows after the first few in a ShowMoreList: on a phone they show only after "Show more". */
export const dirShowMoreRest = "max-sm:group-data-[open=false]/list:hidden";

/** How many results a phone shows before "Show more". */
export const DIR_PHONE_FIRST = 8;
