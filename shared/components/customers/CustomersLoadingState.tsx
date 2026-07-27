import { MasterListPageLoadingState } from "@/shared/design-system/shell";

/**
 * Customers list loading — Mission Briefing compact scaffold.
 * Mirrors search-first filter region + quiet ledger rows.
 */
export function CustomersLoadingState() {
  return (
    <MasterListPageLoadingState
      title="Customers"
      subtitle="Find who you need. See what needs attention."
      showViewTabs
      showSecondaryAction
      filterControlCount={0}
      tableRowVariant="customer"
    />
  );
}
