import Link from "next/link";
import { BarChart3 } from "lucide-react";
import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { pt } from "@/shared/components/platform-admin/north-star-m13/platform-north-star-styles";
import { ANALYTICS_RANGES } from "@/shared/lib/analytics/platform-metrics";
import type { PlatformAnalytics, TrafficSession } from "@/shared/types/platform-analytics";
import {
  AnalyticsPanel,
  BarList,
  DataTable,
  EmptyState,
  Funnel,
  HealthDot,
  Kpi,
  KpiGrid,
  Notice,
  TrendChart,
  metricReason,
} from "./AnalyticsPrimitives";
import {
  DASH,
  channelLabel,
  deltaText,
  deviceLabel,
  formatCents,
  formatCount,
  formatDate,
  formatMonth,
  formatPercent,
  metricText,
} from "./analytics-format";

export const ANALYTICS_TABS = [
  { key: "overview", label: "Overview" },
  { key: "traffic", label: "Website traffic" },
  { key: "acquisition", label: "Acquisition" },
  { key: "product", label: "Product usage" },
  { key: "revenue", label: "Revenue" },
  { key: "marketing", label: "Marketing" },
] as const;

export type AnalyticsTabKey = (typeof ANALYTICS_TABS)[number]["key"];

export function resolveAnalyticsTab(value: string | null | undefined): AnalyticsTabKey {
  return (ANALYTICS_TABS.find((tab) => tab.key === value)?.key ?? "overview") as AnalyticsTabKey;
}

const SERIES = {
  primary: "#A4823A",
  secondary: "#3F6B5C",
  tertiary: "#7C5A99",
};

function href(tab: string, range: string): string {
  return `/platform/analytics?tab=${tab}&range=${range}`;
}

function Controls({ data, tab }: { data: PlatformAnalytics; tab: AnalyticsTabKey }) {
  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
      <nav aria-label="Analytics sections" className="-mx-1 overflow-x-auto px-1">
        <div className={`${pt.subNavControl} flex-nowrap sm:flex-wrap`}>
          {ANALYTICS_TABS.map((item) => {
            const active = item.key === tab;
            return (
              <Link
                key={item.key}
                href={href(item.key, data.range.key)}
                aria-current={active ? "page" : undefined}
                className={`${pt.subNavItem} whitespace-nowrap ${active ? pt.subNavItemActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <nav aria-label="Date range" className="flex flex-wrap gap-1">
        {ANALYTICS_RANGES.map((range) => {
          const active = range.key === data.range.key;
          return (
            <Link
              key={range.key}
              href={href(tab, range.key)}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-9 items-center rounded-md px-2.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[#17130E] text-[#FFF9EA]"
                  : "border border-[rgba(119,89,27,0.18)] bg-[#FFF9EA] text-[#4F4638] hover:text-[#17130E]"
              }`}
            >
              {range.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function TrackingNotice({ data }: { data: PlatformAnalytics }) {
  if (!data.tracking.available) {
    return (
      <Notice tone="warning" title="Website tracking is not switched on yet">
        {data.tracking.reason} Traffic, the top of the funnel, campaign visitors and in-app activity show “—” until
        then. Signups, trials, revenue and product records below come from the database and are complete.
      </Notice>
    );
  }
  if (!data.tracking.trackingSince) {
    return (
      <Notice title="Website tracking is ready and waiting for its first visit">
        Nothing has been recorded yet. Production visits appear within seconds; your own browsing is never counted.
      </Notice>
    );
  }
  if (!data.tracking.coversRange) {
    return (
      <Notice title={`Website tracking began ${formatDate(data.tracking.trackingSince)}`}>
        Visits before that date were never recorded, so traffic and funnel-top figures for this range are partial.
      </Notice>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ overview */

function OverviewTab({ data }: { data: PlatformAnalytics }) {
  const o = data.overview;
  return (
    <>
      <KpiGrid columns={4}>
        <Kpi
          label="New companies"
          value={formatCount(o.newCompanies.current)}
          delta={deltaText(o.newCompanies.current, o.newCompanies.previous)}
          hint="vs previous period"
        />
        <Kpi label="Active companies" value={formatCount(o.activeCompanies)} hint="created work or used the app" />
        <Kpi label="Active trials" value={formatCount(o.activeTrials)} hint={`${formatPercent(o.trialEngagement)} engaged this week`} />
        <Kpi label="Paying subscribers" value={formatCount(o.payingCompanies)} />
        <Kpi
          label="Monthly recurring revenue"
          value={metricText(o.mrrCents, formatCents)}
          unavailableReason={metricReason(o.mrrCents)}
          hint={data.revenue.mrrEstimated ? "includes list-price estimates" : "from Stripe prices"}
        />
        <Kpi
          label="Signups"
          value={formatCount(o.signups.current)}
          delta={deltaText(o.signups.current, o.signups.previous)}
          hint="new accounts"
        />
        <Kpi label="Company retention" value={formatPercent(o.retention)} hint="active last period and this one" />
        <Kpi
          label="Biggest drop-off"
          value={o.bottleneck ? formatPercent(o.bottleneck.fromPrevious) : DASH}
          hint={o.bottleneck ? `reach “${o.bottleneck.label}”` : "needs at least 3 people at a step"}
        />
      </KpiGrid>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <AnalyticsPanel eyebrow="Growth" title="New companies per day" description="Workspaces created, internal and demo companies excluded.">
          <TrendChart
            labels={o.newCompaniesDaily.map((p) => p.day)}
            series={[{ key: "companies", label: "New companies", color: SERIES.primary, values: o.newCompaniesDaily.map((p) => p.value) }]}
            emptyTitle="No new companies in this period."
          />
        </AnalyticsPanel>
        <AnalyticsPanel eyebrow="What to look at" title="Insights" description="Generated from the figures on this page.">
          {o.insights.length === 0 ? (
            <EmptyState title="Nothing needs attention right now." />
          ) : (
            <ul className="space-y-2 text-sm text-[#17130E]">
              {o.insights.map((insight) => (
                <li key={insight} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A4823A]" aria-hidden="true" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsPanel>
      </div>

      <AnalyticsPanel eyebrow="Is the data trustworthy?" title="Tracking and system health">
        <ul className="grid gap-2 sm:grid-cols-2">
          {o.health.map((item) => (
            <li key={item.label} className="flex gap-2 text-sm">
              <HealthDot status={item.status} />
              <span>
                <span className="font-semibold text-[#17130E]">{item.label}</span>
                <span className="block text-xs text-[#4F4638]">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        {data.excludedInternalCompanies > 0 ? (
          <p className="mt-3 text-xs text-[#6B6255]">
            {data.excludedInternalCompanies} internal or demo compan{data.excludedInternalCompanies === 1 ? "y is" : "ies are"} excluded
            from every figure on this page.
          </p>
        ) : null}
      </AnalyticsPanel>
    </>
  );
}

/* ------------------------------------------------------------------ traffic */

function TrafficTab({ data }: { data: PlatformAnalytics }) {
  const t = data.traffic;
  if (!t) {
    return (
      <AnalyticsPanel title="Website traffic">
        <EmptyState
          title="Traffic appears here once tracking is switched on"
          description="Apply migration 202 and redeploy; see docs/reference/platform-analytics.md."
        />
      </AnalyticsPanel>
    );
  }
  const totalReturning = t.returning ? t.returning.newVisitors + t.returning.returningVisitors : 0;
  return (
    <>
      <KpiGrid columns={5}>
        <Kpi label="Visitors today" value={metricText(t.windows.today)} hint="since midnight UTC" />
        <Kpi label="Visitors · 7 days" value={metricText(t.windows.last7Days)} />
        <Kpi label="Visitors · 30 days" value={metricText(t.windows.last30Days)} />
        <Kpi label="Unique visitors" value={metricText(t.visitors)} hint={data.range.label.toLowerCase()} />
        <Kpi label="Pageviews" value={metricText(t.pageviews)} hint={`${metricText(t.sessions)} sessions`} />
      </KpiGrid>

      <AnalyticsPanel eyebrow="Trend" title="Visitors and pageviews per day" description="Anonymous website visitors; signed-in product use is under Product usage.">
        <TrendChart
          labels={t.daily.map((p) => p.day)}
          series={[
            { key: "visitors", label: "Visitors", color: SERIES.primary, values: t.daily.map((p) => p.visitors) },
            { key: "pageviews", label: "Pageviews", color: SERIES.secondary, values: t.daily.map((p) => p.pageviews) },
          ]}
          emptyTitle="No visits recorded in this period."
        />
      </AnalyticsPanel>

      <div className="grid gap-3 lg:grid-cols-2">
        <AnalyticsPanel title="Most visited pages">
          <BarList rows={t.topPages} valueLabel="Views" secondaryLabel="Visitors" />
        </AnalyticsPanel>
        <AnalyticsPanel title="Where visitors come from" description="Each visitor counted once, by how their first visit in the period arrived.">
          <BarList rows={t.channels} valueLabel="Visitors" labelFormatter={channelLabel} />
        </AnalyticsPanel>
        <AnalyticsPanel title="Referring sites" description="Search engines, social apps and other sites that sent visitors.">
          <BarList rows={t.referrers} valueLabel="Visitors" emptyTitle="No referring sites yet." />
        </AnalyticsPanel>
        <AnalyticsPanel title="Devices and returning visitors">
          <BarList rows={t.devices} valueLabel="Visitors" labelFormatter={deviceLabel} />
          {t.returning ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Kpi label="New visitors" value={formatCount(t.returning.newVisitors)} hint={formatPercent(totalReturning ? t.returning.newVisitors / totalReturning : null)} />
              <Kpi
                label="Returning"
                value={formatCount(t.returning.returningVisitors)}
                hint={formatPercent(totalReturning ? t.returning.returningVisitors / totalReturning : null)}
              />
            </div>
          ) : null}
        </AnalyticsPanel>
      </div>

      <VisitDetail traffic={t} />
    </>
  );
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return DASH;
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

function formatHour(hour: string): string {
  const h = Number(hour);
  if (h === 0) return "12 AM";
  if (h === 12) return "Noon";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function visitSource(visit: TrafficSession): string {
  const tagged = [visit.utmSource, visit.utmMedium, visit.utmCampaign].filter(Boolean).join(" / ");
  const where = tagged || visit.referrerHost;
  return where ? `${channelLabel(visit.channel)} · ${where}` : channelLabel(visit.channel);
}

/**
 * Visit-level detail (migration 206): engagement, entry and exit pages, time
 * of day and the latest visits one by one, with the owner's own browsers
 * already left out. Hidden until 206 is applied.
 */
function VisitDetail({ traffic: t }: { traffic: NonNullable<PlatformAnalytics["traffic"]> }) {
  const e = t.engagement;
  const visitTime = new Intl.DateTimeFormat("en-US", {
    timeZone: t.timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <>
      {t.excluded ? (
        <Notice title="Your own visits are left out">
          {t.excluded.pageviews > 0
            ? `${formatCount(t.excluded.pageviews)} pageviews from ${formatCount(t.excluded.visitors)} of your own browsers were left out of this period. `
            : "None of your own browsers visited in this period. "}
          {formatCount(t.excluded.markedBrowsers)} browser{t.excluded.markedBrowsers === 1 ? " is" : "s are"} marked as yours: any browser where
          you sign in as a platform admin is marked automatically. For a phone or laptop you never sign in on, open any page once
          with <code>?altair_analytics=off</code> at the end of the address. Bots, crawlers, Google&apos;s inspection tools and
          automated browsers are never recorded.
        </Notice>
      ) : null}

      {e ? (
        <KpiGrid columns={4}>
          <Kpi label="Visits" value={formatCount(e.sessions)} hint="one per browser tab session" />
          <Kpi label="Bounce rate" value={formatPercent(e.sessions ? e.bouncedSessions / e.sessions : null)} hint="left after one page" />
          <Kpi label="Pages per visit" value={e.avgPages == null ? DASH : e.avgPages.toFixed(1)} />
          <Kpi label="Time on site" value={formatDuration(e.medianSeconds)} hint="median, visits of 2+ pages" />
        </KpiGrid>
      ) : null}

      {t.landingPages.length > 0 || t.exitPages.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <AnalyticsPanel title="Landing pages" description="The first page of each visit, and what those visits did next.">
            <DataTable
              headers={[
                { label: "Page" },
                { label: "Visits", align: "right" },
                { label: "Bounce", align: "right" },
                { label: "Started signup", align: "right" },
                { label: "Signed up", align: "right" },
              ]}
              rows={t.landingPages.map((row) => ({
                key: row.path,
                cells: [
                  row.path,
                  formatCount(row.sessions),
                  formatPercent(row.sessions ? row.bounces / row.sessions : null),
                  formatCount(row.signupStarts),
                  formatCount(row.signups),
                ],
              }))}
              emptyTitle="No visits in this period."
            />
          </AnalyticsPanel>
          <AnalyticsPanel title="Exit pages" description="The last page of visits that saw more than one page: where people stop.">
            <BarList rows={t.exitPages} valueLabel="Visits" emptyTitle="No multi-page visits yet." />
          </AnalyticsPanel>
        </div>
      ) : null}

      {t.hourly.some((h) => h.visitors > 0) ? (
        <AnalyticsPanel title="When visitors arrive" description={`Visitors by hour of day, ${t.timeZone.replace("_", " ")} time.`}>
          <TrendChart
            labels={t.hourly.map((h) => String(h.hour))}
            series={[{ key: "visitors", label: "Visitors", color: SERIES.primary, values: t.hourly.map((h) => h.visitors) }]}
            formatLabel={formatHour}
          />
        </AnalyticsPanel>
      ) : null}

      {t.recentSessions.length > 0 ? (
        <AnalyticsPanel
          eyebrow="Visits"
          title="Recent visits, one by one"
          description={`Newest first (up to 100), times in ${t.timeZone.replace("_", " ")}. Anonymous: no names, addresses or IPs are stored.`}
        >
          <DataTable
            headers={[
              { label: "When" },
              { label: "Came from" },
              { label: "Device" },
              { label: "Pages in order" },
              { label: "Time", align: "right" },
              { label: "Outcome" },
            ]}
            rows={t.recentSessions.map((visit, index) => ({
              key: `${visit.startedAt}-${index}`,
              cells: [
                visitTime.format(new Date(visit.startedAt)),
                visitSource(visit),
                `${deviceLabel(visit.device)}${visit.isReturning ? " · returning" : visit.isReturning === false ? " · new" : ""}`,
                visit.paths.join(" → ") + (visit.pages > visit.paths.length ? " → …" : ""),
                visit.pages > 1 ? formatDuration(visit.seconds) : DASH,
                visit.signupCompleted ? "Signed up" : visit.signupStarted ? "Started signup" : visit.pages <= 1 ? "Bounced" : DASH,
              ],
            }))}
            emptyTitle="No visits in this period."
          />
        </AnalyticsPanel>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ acquisition */

function AcquisitionTab({ data }: { data: PlatformAnalytics }) {
  const a = data.acquisition;
  return (
    <>
      <AnalyticsPanel
        eyebrow="Funnel"
        title="Website visit → paid subscriber"
        description="Top three steps come from website tracking; the rest from accounts, companies and subscriptions created in this period."
      >
        <Funnel steps={a.funnel} bottleneckKey={a.bottleneck?.key ?? null} />
      </AnalyticsPanel>
      <AnalyticsPanel eyebrow="Trend" title="Signups per day">
        <TrendChart
          labels={a.signupsDaily.map((p) => p.day)}
          series={[{ key: "signups", label: "Signups", color: SERIES.primary, values: a.signupsDaily.map((p) => p.value) }]}
          emptyTitle="No signups in this period."
        />
      </AnalyticsPanel>
      <CampaignTable data={data} />
    </>
  );
}

function CampaignTable({ data }: { data: PlatformAnalytics }) {
  return (
    <AnalyticsPanel
      eyebrow="Campaigns"
      title="UTM campaigns"
      description="Tag every video and post link with utm_source, utm_medium and utm_campaign to see it here."
    >
      <DataTable
        headers={[
          { label: "Source" },
          { label: "Medium" },
          { label: "Campaign" },
          { label: "Visitors", align: "right" },
          { label: "Signups", align: "right" },
          { label: "Activated", align: "right" },
          { label: "Paid", align: "right" },
        ]}
        rows={data.acquisition.campaigns.map((row) => ({
          key: `${row.source}|${row.medium}|${row.campaign}`,
          cells: [
            row.source ?? DASH,
            row.medium ?? DASH,
            row.campaign ?? DASH,
            row.visitors == null ? DASH : formatCount(row.visitors),
            formatCount(row.signups),
            formatCount(row.activated),
            formatCount(row.paid),
          ],
        }))}
        emptyTitle="No tagged campaign traffic yet"
        emptyDescription="Example link: https://www.altair-op.com/?utm_source=youtube&utm_medium=video&utm_campaign=hvac-capacitor"
      />
    </AnalyticsPanel>
  );
}

/* ------------------------------------------------------------------ product */

function ProductTab({ data }: { data: PlatformAnalytics }) {
  const p = data.product;
  const basisHint = p.activeUserBasis === "tracking" ? "used the app" : "signed in (fallback)";
  return (
    <>
      {p.activeUserBasis === "sign_in" ? (
        <Notice title="Active users are counted from sign-ins for now">
          Until in-app tracking has data, a user counts as active by their last sign-in time. People who stay signed in
          for weeks are undercounted.
        </Notice>
      ) : null}
      <KpiGrid columns={4}>
        <Kpi label="Daily active users" value={metricText(p.dau)} hint={basisHint} />
        <Kpi label="Weekly active users" value={metricText(p.wau)} hint={basisHint} />
        <Kpi label="Monthly active users" value={metricText(p.mau)} hint={basisHint} />
        <Kpi
          label="Active companies"
          value={formatCount(p.activeCompanies)}
          delta={deltaText(p.activeCompanies, p.activeCompaniesPrevious)}
          hint={`${formatCount(p.returningCompanies)} returning`}
        />
      </KpiGrid>
      <KpiGrid columns={4}>
        <Kpi label="Jobs created" value={formatCount(p.created.jobs.current)} delta={deltaText(p.created.jobs.current, p.created.jobs.previous)} />
        <Kpi label="Estimates created" value={formatCount(p.created.estimates.current)} delta={deltaText(p.created.estimates.current, p.created.estimates.previous)} />
        <Kpi label="Invoices created" value={formatCount(p.created.invoices.current)} delta={deltaText(p.created.invoices.current, p.created.invoices.previous)} />
        <Kpi label="Customers added" value={formatCount(p.created.customers.current)} delta={deltaText(p.created.customers.current, p.created.customers.previous)} />
      </KpiGrid>

      <AnalyticsPanel eyebrow="Trend" title="Work created per day">
        <TrendChart
          labels={p.createdDaily.map((d) => d.day)}
          series={[
            { key: "jobs", label: "Jobs", color: SERIES.primary, values: p.createdDaily.map((d) => d.jobs) },
            { key: "estimates", label: "Estimates", color: SERIES.secondary, values: p.createdDaily.map((d) => d.estimates) },
            { key: "invoices", label: "Invoices", color: SERIES.tertiary, values: p.createdDaily.map((d) => d.invoices) },
          ]}
          emptyTitle="No jobs, estimates or invoices created in this period."
        />
      </AnalyticsPanel>

      <div className="grid gap-3 lg:grid-cols-2">
        <AnalyticsPanel
          title="Feature usage"
          description={p.features ? "Distinct users per area of the app, most used first." : "Records created per module (in-app tracking has no data yet)."}
        >
          {p.features ? (
            <BarList rows={p.features} valueLabel="Users" secondaryLabel="Views" />
          ) : (
            <BarList rows={p.modules} valueLabel="Created" />
          )}
          {p.features && p.features.length > 3 ? (
            <p className="mt-3 text-xs text-[#6B6255]">
              Least used: {p.features.slice(-3).map((f) => f.label).join(", ")}.
            </p>
          ) : null}
        </AnalyticsPanel>
        <AnalyticsPanel title="Onboarding completion" description="Share of all companies that have ever reached each milestone.">
          <ul className="space-y-2">
            {p.onboarding.map((step) => (
              <li key={step.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-[#17130E]">{step.label}</span>
                  <span className="tabular-nums text-[#17130E]">
                    <span className="font-semibold">{formatCount(step.companies)}</span>
                    <span className="ml-2 text-xs text-[#6B6255]">{formatPercent(step.share)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgba(119,89,27,0.08)]">
                  <div className="h-full rounded-full bg-[#A4823A]" style={{ width: `${Math.round((step.share ?? 0) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </AnalyticsPanel>
      </div>

      <AnalyticsPanel
        eyebrow="Trials"
        title={`Inactive trials (${formatCount(p.trials.inactive.length)} of ${formatCount(p.trials.active)})`}
        description="Trialing companies with no new work and no app activity in the last 7 days — worth a personal nudge."
      >
        <DataTable
          headers={[{ label: "Company" }, { label: "Trial ends" }, { label: "Days left", align: "right" }, { label: "Last activity" }]}
          rows={p.trials.inactive.map((row) => ({
            key: row.companyId,
            cells: [row.companyName, formatDate(row.trialEndsAt), row.daysLeft == null ? DASH : formatCount(row.daysLeft), formatDate(row.lastActivityAt)],
          }))}
          emptyTitle="Every trialing company has been active this week."
        />
      </AnalyticsPanel>
    </>
  );
}

/* ------------------------------------------------------------------ revenue */

function RevenueTab({ data }: { data: PlatformAnalytics }) {
  const r = data.revenue;
  return (
    <>
      <KpiGrid columns={4}>
        <Kpi
          label="Monthly recurring revenue"
          value={metricText(r.mrrCents, formatCents)}
          unavailableReason={metricReason(r.mrrCents)}
          hint={r.mrrEstimated ? "some at list price (no Stripe price on record)" : "active subscriptions, monthly"}
        />
        <Kpi label="Annual run rate" value={metricText(r.arrCents, formatCents)} hint="MRR × 12" />
        <Kpi label="Paying companies" value={formatCount(r.payingCompanies)} />
        <Kpi label="Active trials" value={formatCount(r.activeTrials)} hint={`${formatCount(r.trialsWithCard)} with a card on file`} />
        <Kpi
          label="Trial → paid"
          value={formatPercent(r.trialToPaid.rate)}
          hint={`${formatCount(r.trialToPaid.converted)} of ${formatCount(r.trialToPaid.eligible)} finished trials`}
        />
        <Kpi
          label="Collected (SaaS)"
          value={metricText(r.collectedCents, formatCents)}
          unavailableReason={metricReason(r.collectedCents)}
          hint="paid Stripe invoices in period — not MRR"
        />
        <Kpi label="Cancellations" value={formatCount(r.cancellations)} hint={`churn ${formatPercent(r.churnRate, 1)}`} />
        <Kpi label="Failed payments" value={formatCount(r.failedPayments)} hint="distinct invoices in period" />
      </KpiGrid>

      <AnalyticsPanel eyebrow="Trend" title="Subscription revenue collected per month" description="Paid Altair subscription invoices from the Stripe webhook ledger.">
        <TrendChart
          labels={r.collectedMonthly.map((p) => p.day)}
          series={[{ key: "collected", label: "Collected", color: SERIES.primary, values: r.collectedMonthly.map((p) => p.value) }]}
          formatLabel={formatMonth}
          formatValue={formatCents}
          emptyTitle="No subscription payments collected yet."
        />
      </AnalyticsPanel>

      <AnalyticsPanel eyebrow="Act now" title="Trials ending within 4 days">
        <DataTable
          headers={[{ label: "Company" }, { label: "Ends" }, { label: "Days left", align: "right" }, { label: "Card on file" }]}
          rows={r.expiringTrials.map((row) => ({
            key: row.companyId,
            cells: [row.companyName, formatDate(row.trialEndsAt), formatCount(row.daysLeft), row.hasCard ? "Yes" : "No"],
          }))}
          emptyTitle="No trials end in the next 4 days."
        />
      </AnalyticsPanel>
      <p className="px-1 text-xs text-[#6B6255]">
        For reference, customers&apos; own invoice payments processed through Altair in this period:{" "}
        {formatCount(r.customerPaymentsProcessed)}. That is your customers&apos; revenue, not Altair&apos;s.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ marketing */

function MarketingTab({ data }: { data: PlatformAnalytics }) {
  const m = data.marketing;
  return (
    <>
      <KpiGrid columns={3}>
        <Kpi label="Signups in period" value={formatCount(m.totalSignups)} />
        <Kpi
          label="Signups with a known source"
          value={formatCount(m.attributedSignups)}
          hint={formatPercent(m.totalSignups ? m.attributedSignups / m.totalSignups : null)}
        />
        <Kpi
          label="Top source by signups"
          value={m.channels.find((c) => c.channel !== "unknown" && c.signups > 0) ? channelLabel(m.channels.find((c) => c.channel !== "unknown" && c.signups > 0)!.channel) : DASH}
        />
      </KpiGrid>
      <AnalyticsPanel
        eyebrow="Channels"
        title="Which sources produce customers"
        description="Visitors from tracking; signups, activated companies and paid customers from first-touch attribution saved at signup."
      >
        <DataTable
          headers={[
            { label: "Channel" },
            { label: "Visitors", align: "right" },
            { label: "Signups", align: "right" },
            { label: "Visit → signup", align: "right" },
            { label: "Activated", align: "right" },
            { label: "Paid", align: "right" },
          ]}
          rows={m.channels.map((row) => ({
            key: row.channel,
            cells: [
              channelLabel(row.channel),
              row.visitors == null ? DASH : formatCount(row.visitors),
              formatCount(row.signups),
              row.visitors ? formatPercent(row.signups / row.visitors, 1) : DASH,
              formatCount(row.activated),
              formatCount(row.paid),
            ],
          }))}
          emptyTitle="No signups or tracked visits in this period."
        />
      </AnalyticsPanel>
      <CampaignTable data={data} />
      <Notice title="How attribution works">
        YouTube, Facebook, Instagram, TikTok, Google and direct visits are recognised from the referring site; tagged links
        (utm_source / utm_medium / utm_campaign) are recognised exactly. A signup is credited to the first visit on that
        browser. Signups from before tracking, or with tracking blocked, show as Unknown.
      </Notice>
    </>
  );
}

export function PlatformAnalyticsView({ data, tab }: { data: PlatformAnalytics; tab: AnalyticsTabKey }) {
  return (
    <MasterShellPage density="compact" className={pt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Internal operations"
        title="Platform analytics"
        subtitle="Traffic, acquisition, product usage and revenue — real data only."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-platform-page-header ${pt.pageHeader}`}
        eyebrowClassName={pt.pageHeaderEyebrow}
        titleClassName={pt.pageHeaderTitle}
        subtitleClassName={pt.pageHeaderSubtitle}
      />
      <MasterContentStack density="compact" className={pt.workspaceStack}>
        <Controls data={data} tab={tab} />
        <TrackingNotice data={data} />
        {data.diagnostics.length ? (
          <div className={pt.diagnosticsShell}>
            <p className={pt.diagnosticsTitle}>Some sources could not be fully read</p>
            <ul className="mt-1 space-y-0.5">
              {data.diagnostics.map((line) => (
                <li key={line} className={pt.diagnosticsItem}>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {tab === "overview" ? <OverviewTab data={data} /> : null}
        {tab === "traffic" ? <TrafficTab data={data} /> : null}
        {tab === "acquisition" ? <AcquisitionTab data={data} /> : null}
        {tab === "product" ? <ProductTab data={data} /> : null}
        {tab === "revenue" ? <RevenueTab data={data} /> : null}
        {tab === "marketing" ? <MarketingTab data={data} /> : null}
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-[#6B6255]">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          {data.range.label} · days in UTC · generated {formatDate(data.generatedAt)}
        </p>
      </MasterContentStack>
    </MasterShellPage>
  );
}
