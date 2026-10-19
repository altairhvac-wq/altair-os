import type { AnalyticsRangeKey, FunnelStep, MetricValue } from "@/shared/lib/analytics/platform-metrics";

/**
 * Platform analytics page model (platform admins only).
 *
 * Every figure says where it comes from (`basis`) and an unmeasurable figure
 * is `unavailable` with a reason rather than 0 — see platform-metrics.ts.
 */

export type DailyPoint = { day: string; value: number };

export type NamedCount = { label: string; value: number; secondary?: number };

export type PlatformAnalyticsTracking = {
  /** Migration 202 applied and readable. */
  available: boolean;
  reason: string | null;
  trackingSince: string | null;
  lastEventAt: string | null;
  /**
   * True when tracking existed for the whole selected range. False when it
   * began part-way through (earlier visits were never recorded) or has no
   * events yet — tracked figures are then partial, and the page says so.
   */
  coversRange: boolean;
};

export type PlatformAnalyticsTraffic = {
  windows: { today: MetricValue; last7Days: MetricValue; last30Days: MetricValue };
  visitors: MetricValue;
  pageviews: MetricValue;
  sessions: MetricValue;
  daily: { day: string; visitors: number; pageviews: number }[];
  topPages: NamedCount[];
  referrers: NamedCount[];
  channels: NamedCount[];
  devices: NamedCount[];
  returning: { newVisitors: number; returningVisitors: number; unknownVisitors: number } | null;
};

export type CampaignRow = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  /** Tracked visitors (null before tracking). */
  visitors: number | null;
  signups: number;
  activated: number;
  paid: number;
};

export type ChannelRow = {
  channel: string;
  visitors: number | null;
  signups: number;
  activated: number;
  paid: number;
};

export type PlatformAnalyticsAcquisition = {
  funnel: FunnelStep[];
  bottleneck: FunnelStep | null;
  signupsDaily: DailyPoint[];
  campaigns: CampaignRow[];
};

export type InactiveTrialRow = {
  companyId: string;
  companyName: string;
  trialEndsAt: string | null;
  daysLeft: number | null;
  lastActivityAt: string | null;
};

export type PlatformAnalyticsProduct = {
  dau: MetricValue;
  wau: MetricValue;
  mau: MetricValue;
  /** "tracking" = app pageviews; "sign_in" = last sign-in time (undercounts long sessions). */
  activeUserBasis: "tracking" | "sign_in";
  dailyActiveUsers: DailyPoint[] | null;
  activeCompanies: number;
  activeCompaniesPrevious: number;
  returningCompanies: number;
  created: {
    jobs: { current: number; previous: number };
    estimates: { current: number; previous: number };
    invoices: { current: number; previous: number };
    customers: { current: number; previous: number };
  };
  createdDaily: { day: string; jobs: number; estimates: number; invoices: number }[];
  features: NamedCount[] | null;
  modules: NamedCount[];
  onboarding: { label: string; companies: number; share: number | null }[];
  trials: {
    active: number;
    engaged: number;
    inactive: InactiveTrialRow[];
  };
};

export type ExpiringTrialRow = {
  companyId: string;
  companyName: string;
  trialEndsAt: string;
  daysLeft: number;
  hasCard: boolean;
};

export type PlatformAnalyticsRevenue = {
  payingCompanies: number;
  activeTrials: number;
  trialsWithCard: number;
  expiringTrials: ExpiringTrialRow[];
  trialToPaid: { converted: number; eligible: number; rate: number | null };
  mrrCents: MetricValue;
  /** True when some MRR came from the catalog list price, not a Stripe price on record. */
  mrrEstimated: boolean;
  arrCents: MetricValue;
  cancellations: number;
  failedPayments: number;
  churnRate: number | null;
  collectedCents: MetricValue;
  collectedMonthly: DailyPoint[];
  /** Customer invoice payments processed through Altair (not Altair's revenue). */
  customerPaymentsProcessed: number;
};

export type PlatformAnalyticsMarketing = {
  channels: ChannelRow[];
  campaigns: CampaignRow[];
  attributedSignups: number;
  totalSignups: number;
};

export type HealthIndicator = {
  label: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  detail: string;
};

export type PlatformAnalyticsOverview = {
  newCompanies: { current: number; previous: number };
  activeCompanies: number;
  payingCompanies: number;
  activeTrials: number;
  mrrCents: MetricValue;
  trialEngagement: number | null;
  retention: number | null;
  signups: { current: number; previous: number };
  bottleneck: { label: string; fromPrevious: number | null } | null;
  insights: string[];
  health: HealthIndicator[];
  newCompaniesDaily: DailyPoint[];
};

export type PlatformAnalytics = {
  generatedAt: string;
  range: { key: AnalyticsRangeKey; label: string; fromIso: string; toIso: string };
  tracking: PlatformAnalyticsTracking;
  excludedInternalCompanies: number;
  diagnostics: string[];
  overview: PlatformAnalyticsOverview;
  traffic: PlatformAnalyticsTraffic | null;
  acquisition: PlatformAnalyticsAcquisition;
  product: PlatformAnalyticsProduct;
  revenue: PlatformAnalyticsRevenue;
  marketing: PlatformAnalyticsMarketing;
};
