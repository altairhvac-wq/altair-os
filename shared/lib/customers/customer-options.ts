/**
 * The customer picker's rules, in one place that both the server query and
 * the browser can import (customers-page.ts is server-only).
 */

/** How many customers a picker is handed to start with: the newest N. */
export const CUSTOMER_OPTION_LIMIT = 25;

/** Shorter terms are not searched; normalizeSearchTerm drops them as too broad. */
export const CUSTOMER_SEARCH_MIN_LENGTH = 2;

/**
 * Makes sure a chosen record is among a picker's options.
 *
 * A picker starts from a bounded slice, and a form is often opened FOR one
 * record: "New job" on a customer's page, or editing a job that already has a
 * customer. That record has no reason to be in the slice. A native select
 * whose value matches no option does not stay empty — the browser shows
 * another option, and the form is saved for whoever that happens to be.
 */
export function withSelectedOption<T extends { id: string }>(
  options: T[],
  selected: T | null | undefined,
): T[] {
  if (!selected || options.some((option) => option.id === selected.id)) {
    return options;
  }
  return [selected, ...options];
}
