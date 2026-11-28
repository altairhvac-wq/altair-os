import { ChartColumn, Eye, Globe, Navigation, Phone } from "lucide-react";
import type { ListingStatsSummary } from "@/lib/directory/stats";
import { dirPanel } from "@/shared/components/directory/directory-styles";
import { DIRECTORY_STATS_LABELS, type DirectoryListingStats } from "@/shared/types/directory";

/**
 * A listing owner's own numbers on the manage page: the last 30 days, with
 * last calendar month beside them (the month the email reports), and views
 * per day. Counts only; see lib/directory/stats.ts for what is and is not
 * stored. Zero is shown as zero: a new listing honestly starts there.
 */

const ICONS: Record<keyof DirectoryListingStats, typeof Eye> = { views: Eye, calls: Phone, website: Globe, directions: Navigation };
const KEYS: (keyof DirectoryListingStats)[] = ["views", "calls", "website", "directions"];

function DailyViews({ daily }: { readonly daily: ListingStatsSummary["daily"] }) {
  const max = Math.max(1, ...daily.map((point) => point.views));
  const width = 600;
  const height = 96;
  const slot = width / daily.length;
  const bar = Math.max(2, slot - 2); // a 2px surface gap between bars
  const total = daily.reduce((sum, point) => sum + point.views, 0);
  const first = daily[0]?.day;
  const last = daily[daily.length - 1]?.day;
  const short = (day?: string) => (day ? new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "");
  return (
    <figure className="mt-5">
      <figcaption className="text-[13px] font-semibold text-stone-800">Page views per day, last 30 days</figcaption>
      <p className="sr-only">
        {total} page views from {short(first)} to {short(last)}. The busiest day had {max === 1 && total === 0 ? 0 : max}.
      </p>
      <svg viewBox={`0 0 ${width} ${height + 2}`} preserveAspectRatio="none" role="img" aria-hidden="true" className="mt-2 h-24 w-full">
        <line x1="0" x2={width} y1={height + 1} y2={height + 1} stroke="#e7e5e4" strokeWidth="1" />
        {daily.map((point, index) => {
          const h = point.views === 0 ? 0 : Math.max(3, (point.views / max) * (height - 4));
          return (
            <g key={point.day}>
              {/* A wider invisible target, so the tooltip is easy to reach. */}
              <rect x={index * slot} y={0} width={slot} height={height} fill="transparent">
                <title>{`${short(point.day)}: ${point.views} ${point.views === 1 ? "view" : "views"}, ${point.taps} ${point.taps === 1 ? "tap" : "taps"}`}</title>
              </rect>
              {h > 0 ? <rect x={index * slot + 1} y={height + 1 - h} width={bar} height={h} rx="2" fill="#A4823A" pointerEvents="none" /> : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-stone-500">
        <span>{short(first)}</span>
        <span>{short(last)}</span>
      </div>
    </figure>
  );
}

export function ListingStatsPanel({ stats, live }: { readonly stats: ListingStatsSummary | null; readonly live: boolean }) {
  return (
    <section aria-labelledby="manage-stats-heading" className={`px-5 py-6 sm:px-7 ${dirPanel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="manage-stats-heading" className="flex items-center gap-2 text-base font-semibold text-[#0A0A0A]">
          <ChartColumn aria-hidden="true" className="h-4 w-4 text-[#A4823A]" /> Your numbers
        </h2>
        {stats ? <p className="text-xs text-stone-500">Last 30 days</p> : null}
      </div>
      {!live ? (
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Once your listing is live, this shows how many people viewed it and tapped call, website or map. We email you
          the numbers once a month.
        </p>
      ) : !stats ? (
        <p className="mt-2 text-sm leading-relaxed text-stone-600">Your numbers could not be loaded just now. Please try again later.</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {KEYS.map((key) => {
              const Icon = ICONS[key];
              return (
                <div key={key} className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                  <dt className="flex items-center gap-1.5 text-[12px] font-medium text-stone-600">
                    <Icon aria-hidden="true" className="h-3.5 w-3.5 text-stone-400" />
                    {DIRECTORY_STATS_LABELS[key]}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{stats.last30[key]}</dd>
                  <dd className="text-[11px] tabular-nums text-stone-500">
                    {stats.lastMonthLabel.split(" ")[0]}: {stats.lastMonth[key]}
                  </dd>
                </div>
              );
            })}
          </dl>
          <DailyViews daily={stats.daily} />
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            Counted from the day this feature started, not before. Our own visits and search-engine robots are not
            counted. We never record who looked.
          </p>
        </>
      )}
    </section>
  );
}
