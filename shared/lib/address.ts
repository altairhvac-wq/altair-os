/**
 * Address display helpers.
 *
 * Customer and job addresses are optional field-by-field, so any template
 * that hardcodes its own separators (`{city}, {state} {zip}`) renders orphan
 * punctuation the moment a part is blank — ", TX", "Denver, ", or a bare
 * comma. That reads as broken data rather than absent data, and it reaches
 * printed customer documents. Compose the line here instead, so empty parts
 * simply drop out.
 */

/** Joins city/state/ZIP, omitting blanks: "Denver, CO 80202", "Denver", "CO 80202", or "". */
export function formatCityStateZip(
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const cityPart = city?.trim() ?? "";
  const statePart = state?.trim() ?? "";
  const zipPart = zip?.trim() ?? "";

  // State and ZIP read as one unit ("CO 80202"); the comma belongs only
  // between the city and that unit, and only when both sides exist.
  const regionPart = [statePart, zipPart].filter(Boolean).join(" ");

  return [cityPart, regionPart].filter(Boolean).join(", ");
}

/** Full single-line address: "1200 Gate Ave, Denver, CO 80202". Blank parts drop out. */
export function formatAddressLine(
  street?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null,
): string {
  const streetPart = street?.trim() ?? "";
  const locality = formatCityStateZip(city, state, zip);

  return [streetPart, locality].filter(Boolean).join(", ");
}
