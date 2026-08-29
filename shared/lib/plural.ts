/**
 * Count/label helpers.
 *
 * Prefer these over hand-rolling `${n} item${n === 1 ? "" : "s"}` inline —
 * that idiom is what produced "1 estimates" and "1 item need attention" in
 * the UI, and it pluralizes the noun while leaving the verb alone.
 *
 * NOTE: ~17 private `pluralize` copies with this exact signature still exist
 * across `shared/lib/dashboard-*.ts`, `office-priority-engine.ts`,
 * `operational-signals.ts`, and friends. They are all identical to the
 * implementation below and should be collapsed onto it — a mechanical but
 * separate change, deliberately not bundled into the copy pass.
 */

/** Returns the singular or plural noun for a count. Does not include the number. */
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

/**
 * Number + correctly pluralized noun: `countLabel(1, "estimate")` → "1 estimate",
 * `countLabel(12, "estimate")` → "12 estimates". Counts are localized, so
 * large values render as "1,204 invoices".
 */
export function countLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count.toLocaleString()} ${pluralize(count, singular, plural)}`;
}
