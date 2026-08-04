/**
 * Sales hub tabs — Estimates, Invoices, Payments, Estimate Pipeline.
 * Legacy `/estimates`, `/invoices`, and `/payments` list routes redirect here.
 * Detail routes (`/estimates/[id]`, `/invoices/[id]`) stay standalone.
 */

export const SALES_HUB_TAB_IDS = [
  "estimates",
  "invoices",
  "payments",
  "estimate-pipeline",
] as const;

export type SalesHubTabId = (typeof SALES_HUB_TAB_IDS)[number];

export const SALES_HUB_TAB_LABELS: Record<SalesHubTabId, string> = {
  estimates: "Estimates",
  invoices: "Invoices",
  payments: "Payments",
  "estimate-pipeline": "Estimate Pipeline",
};

export const SALES_HUB_DEFAULT_TAB: SalesHubTabId = "estimates";

export function isSalesHubTabId(value: string): value is SalesHubTabId {
  return (SALES_HUB_TAB_IDS as readonly string[]).includes(value);
}

export function resolveSalesHubTab(
  value: string | undefined | null,
): SalesHubTabId {
  if (value && isSalesHubTabId(value)) {
    return value;
  }

  return SALES_HUB_DEFAULT_TAB;
}

/**
 * In-app Sales hub href. Default tab (Estimates) omits `tab` unless
 * `forceTab` is set (legacy redirects always force the tab for clarity).
 */
export function buildSalesHubHref(
  tab: SalesHubTabId = SALES_HUB_DEFAULT_TAB,
  params?: Record<string, string | undefined | null>,
  options?: { forceTab?: boolean },
): string {
  const search = new URLSearchParams();

  if (tab !== SALES_HUB_DEFAULT_TAB || options?.forceTab) {
    search.set("tab", tab);
  }

  if (params) {
    for (const [key, raw] of Object.entries(params)) {
      if (key === "tab" || raw == null || raw === "") {
        continue;
      }

      search.set(key, raw);
    }
  }

  const query = search.toString();
  return query ? `/sales?${query}` : "/sales";
}

/** Legacy `/estimates` → Sales hub Estimates tab (preserves query params). */
export function buildSalesHubHrefFromEstimatesParams(params: {
  [key: string]: string | undefined;
}): string {
  const rest = { ...params };
  delete rest.tab;
  return buildSalesHubHref("estimates", rest, { forceTab: true });
}

/** Legacy `/invoices` → Sales hub Invoices tab (preserves query params). */
export function buildSalesHubHrefFromInvoicesParams(params: {
  [key: string]: string | undefined;
}): string {
  const rest = { ...params };
  delete rest.tab;
  return buildSalesHubHref("invoices", rest);
}

/** Legacy `/payments` → Sales hub Payments tab (preserves query params). */
export function buildSalesHubHrefFromPaymentsParams(params: {
  [key: string]: string | undefined;
}): string {
  const rest = { ...params };
  delete rest.tab;
  return buildSalesHubHref("payments", rest);
}

export function flattenSearchParamRecord(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }

  return out;
}
