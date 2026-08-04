const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse `?date=YYYY-MM-DD` — returns null when missing or not a real calendar day. */
export function parseDateOnlySearchParam(
  value: string | undefined,
): string | null {
  if (!value || !DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return value;
}
