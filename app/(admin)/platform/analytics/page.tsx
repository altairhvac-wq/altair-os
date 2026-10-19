import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/database/platform-admin";
import { getPlatformAnalytics } from "@/lib/database/services/platform-analytics";
import {
  PlatformAnalyticsView,
  resolveAnalyticsTab,
} from "@/shared/components/platform-admin/analytics/PlatformAnalyticsView";

export const metadata: Metadata = {
  title: "Platform analytics",
};

type PlatformAnalyticsPageProps = {
  searchParams: Promise<{ tab?: string; range?: string }>;
};

/**
 * Owner analytics: traffic, acquisition funnel, product usage, revenue and
 * marketing attribution across every tenant. Platform admins only — the
 * layout already gates this, and the page checks again because the data
 * below crosses tenants with the service role.
 */
export default async function PlatformAnalyticsPage({ searchParams }: PlatformAnalyticsPageProps) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const data = await getPlatformAnalytics(params.range ?? null);
  return <PlatformAnalyticsView data={data} tab={resolveAnalyticsTab(params.tab)} />;
}
