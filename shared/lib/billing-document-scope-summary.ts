type ScopeSummaryItem = {
  name: string;
};

/** Short customer-facing description of proposed services from line items. */
export function getBillingScopeSummary(
  items: ScopeSummaryItem[],
): string | null {
  const names = items
    .map((item) => item.name.trim())
    .filter((name) => name.length > 0);

  if (names.length === 0) {
    return null;
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names[0]} and ${names.length - 1} more services`;
}
