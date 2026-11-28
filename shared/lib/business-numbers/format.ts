/**
 * How business numbers are written on screen. One place, so the settings
 * page, the guided setup and every screen that quotes a number agree.
 *
 * Pure: safe on the server and in the browser.
 */

/** "$96.15". Cents are always shown: these are prices and costs, not summaries. */
export function formatDollars(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "$121" for a whole amount, "$120.19" otherwise. For rates and fees people say out loud. */
export function formatDollarsShort(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : formatDollars(rounded);
}

/** "20.5%", "20%". One decimal, except just under 100 ("99.99%"), which must not read as 100%. */
export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded >= 100 && value < 100) return `${(Math.floor(value * 100) / 100).toFixed(2)}%`;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

/** "42", "6,667". Counts get the same thousands separators as money. */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** The text a number box starts with: no trailing zeros, blank for "no number". */
export function numberToFieldText(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}
