/**
 * Phone-only layout classes for the public site (owner, 2026-11-23: long
 * pages on a phone "feel cheap and inefficient"; they should not scroll
 * forever). Every class here starts with `max-sm:`, so tablets and computers
 * keep their layout exactly.
 *
 * Kept as plain strings in one place so Tailwind sees them and every page
 * uses the same values.
 */

/** A card group that slides sideways on a phone instead of stacking. Put on the <ul>/<ol>. */
export const swipeRow =
  "max-sm:-mx-4 max-sm:flex max-sm:flex-row max-sm:snap-x max-sm:snap-mandatory max-sm:gap-3 max-sm:space-y-0 max-sm:overflow-x-auto max-sm:scroll-px-4 max-sm:px-4 max-sm:pb-3 max-sm:[scrollbar-width:none]";

/** The same, inside a padded panel (p-5): the row runs to the panel's edges. */
export const swipeRowInPanel =
  "max-sm:-mx-5 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:gap-3 max-sm:space-y-0 max-sm:overflow-x-auto max-sm:scroll-px-5 max-sm:px-5 max-sm:pb-2 max-sm:[scrollbar-width:none]";

/** Each card in a swipeRow: most of the screen wide, so the next card peeks in. */
export const swipeItem = "max-sm:w-[82%] max-sm:shrink-0 max-sm:snap-start";

/**
 * On the list inside a <ShowMore>: hides items after the first N on a phone
 * until "Show more" is pressed. One class per N, written out so Tailwind
 * finds them.
 */
export const showFirst = {
  3: "max-sm:group-data-[open=false]/more:[&>*:nth-child(n+4)]:hidden",
  4: "max-sm:group-data-[open=false]/more:[&>*:nth-child(n+5)]:hidden",
  6: "max-sm:group-data-[open=false]/more:[&>*:nth-child(n+7)]:hidden",
} as const;

/** Sections a jump bar points to: leave room for the site header and the bar. */
export const jumpTarget = "scroll-mt-32 sm:scroll-mt-24";
