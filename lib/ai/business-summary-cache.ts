import "server-only";

import type { BusinessSummaryAiResult } from "@/shared/types/reports-page";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";

type CacheEntry = {
  summary: BusinessSummaryAiResult;
  cachedAt: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const summaryCache = new Map<string, CacheEntry>();

function cacheKey(companyId: string, dateRange: ReportsPageDateRange): string {
  return `${companyId}:${dateRange}`;
}

export function getCachedBusinessSummary(
  companyId: string,
  dateRange: ReportsPageDateRange,
): BusinessSummaryAiResult | null {
  const entry = summaryCache.get(cacheKey(companyId, dateRange));
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    summaryCache.delete(cacheKey(companyId, dateRange));
    return null;
  }

  return { ...entry.summary, fromCache: true };
}

export function setCachedBusinessSummary(
  companyId: string,
  dateRange: ReportsPageDateRange,
  summary: BusinessSummaryAiResult,
): void {
  summaryCache.set(cacheKey(companyId, dateRange), {
    summary: { ...summary, fromCache: false },
    cachedAt: Date.now(),
  });
}
