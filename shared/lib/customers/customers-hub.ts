/**
 * Customers hub tabs — Customers + Lead Pipeline + Archived.
 * `/leads` redirects here with tab=pipeline.
 */

export const CUSTOMERS_HUB_TAB_IDS = [
  "customers",
  "pipeline",
  "archived",
] as const;

export type CustomersHubTabId = (typeof CUSTOMERS_HUB_TAB_IDS)[number];

export const CUSTOMERS_HUB_TAB_LABELS: Record<CustomersHubTabId, string> = {
  customers: "Customers",
  pipeline: "Lead Pipeline",
  archived: "Archived",
};

export function isCustomersHubTabId(value: string): value is CustomersHubTabId {
  return (CUSTOMERS_HUB_TAB_IDS as readonly string[]).includes(value);
}

export function resolveCustomersHubTab(
  value: string | undefined | null,
): CustomersHubTabId {
  if (value && isCustomersHubTabId(value)) {
    return value;
  }

  return "customers";
}

/** Canonical Lead Pipeline deep-link on the Customers hub. */
export function buildLeadPipelineHref(
  params?: Record<string, string | undefined | null>,
): string {
  const search = new URLSearchParams();
  search.set("tab", "pipeline");

  if (params) {
    for (const [key, raw] of Object.entries(params)) {
      if (key === "tab" || raw == null || raw === "") {
        continue;
      }

      search.set(key, raw);
    }
  }

  return `/customers?${search.toString()}`;
}

/** Map legacy `/leads` query params onto the Customers hub pipeline tab. */
export function buildCustomersHubHrefFromLeadsParams(params: {
  selected?: string;
  create?: string;
  status?: string;
  filter?: string;
  queue?: string;
}): string {
  return buildLeadPipelineHref({
    selected: params.selected,
    create: params.create,
    status: params.status,
    filter: params.filter,
    queue: params.queue,
  });
}
