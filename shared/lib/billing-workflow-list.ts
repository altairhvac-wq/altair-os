export type BillingWorkflowListSection<T> = {
  id: string;
  label: string;
  items: T[];
};

export function formatBillingWorkflowSectionLabel(
  label: string,
  count: number,
): string {
  return `${label} (${count})`;
}
