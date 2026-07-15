"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Navigation,
  Plus,
  Search,
} from "lucide-react";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import {
  buildMapsDirectionsUrl,
  hasCompleteServiceAddress,
  openMapsDirectionsUrl,
} from "@/shared/lib/maps";
import { sortJobsForOwnerView } from "@/shared/lib/jobs-owner-view-sort";
import {
  formatScheduledDate,
  formatScheduledTime,
  JOB_LIFECYCLE_FILTER_OPTIONS,
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  type Job,
  type JobLifecycleState,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";
import { JobStatusBadge } from "./JobStatusBadge";
import { filterJobsByArchiveQuery } from "./jobs-north-star-mobile-owner-search";
import {
  ownerMobileArchiveInputClass,
  ownerMobileArchiveResultRowClass,
  ownerMobileCompactHeroClass,
  ownerMobileCompactHeroEyebrowClass,
  ownerMobileCompactHeroMutedClass,
  ownerMobileEmptyCardClass,
  ownerMobileFiltersButtonClass,
  ownerMobileHeroCardClass,
  ownerMobileHeroCardLiveClass,
  ownerMobileHeroPrimaryActionClass,
  ownerMobileHeroSecondaryActionClass,
  ownerMobileScrollContentClass,
  ownerMobileSectionLabelClass,
  ownerMobileUpNextRowClass,
} from "./jobs-north-star-mobile-owner-styles";

const FILTER_SHEET_TITLE_ID = "jobs-owner-mobile-filters-title";

const LIVE_JOB_STATUSES = new Set<JobStatus>([
  "dispatched",
  "arrived",
  "in_progress",
]);

type JobsNorthStarMobileOwnerViewProps = {
  todayJobs: Job[];
  archiveJobs: Job[];
  activeTodayCount: number;
  scheduledTodayCount: number;
  hasNoJobs: boolean;
  hasActiveFilters: boolean;
  companyTimeZone?: string;
  statusFilter: JobStatus | "all";
  priorityFilter: JobPriority | "all";
  lifecycleFilter: JobLifecycleState;
  showLifecycleFilter: boolean;
  onSelectJob: (job: Job) => void;
  onCreateJob?: () => void;
  onStatusFilterChange: (value: JobStatus | "all") => void;
  onPriorityFilterChange: (value: JobPriority | "all") => void;
  onLifecycleFilterChange: (value: JobLifecycleState) => void;
  onClearFilters: () => void;
};

function formatJobLocation(job: Job): string {
  const city = job.city.trim();
  const state = job.state.trim();

  if (city && state) {
    return `${city}, ${state}`;
  }

  if (city) {
    return city;
  }

  if (state) {
    return state;
  }

  if (job.serviceAddress.trim()) {
    return job.serviceAddress.trim();
  }

  return "No address on file";
}

function formatJobAddress(job: Job): string {
  const parts = [job.serviceAddress, job.city, job.state, job.zip]
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "No address on file";
}

function isLiveOwnerJob(job: Job): boolean {
  return LIVE_JOB_STATUSES.has(job.status);
}

type OwnerTodayHeroCardProps = {
  job: Job;
  sectionLabel: string;
  companyTimeZone?: string;
  onSelectJob: (job: Job) => void;
};

function OwnerTodayHeroCard({
  job,
  sectionLabel,
  companyTimeZone,
  onSelectJob,
}: OwnerTodayHeroCardProps) {
  const isLive = isLiveOwnerJob(job);
  const mapsUrl = buildMapsDirectionsUrl({
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
  });
  const hasAddress = hasCompleteServiceAddress({
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
  });

  function handleOpenMaps(event: React.MouseEvent) {
    event.stopPropagation();
    if (mapsUrl) {
      openMapsDirectionsUrl(mapsUrl);
    }
  }

  return (
    <article
      className={`${ownerMobileHeroCardClass} ${
        isLive ? ownerMobileHeroCardLiveClass : ""
      }`}
    >
      <div className="space-y-4 px-5 pb-4 pt-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className={ownerMobileSectionLabelClass}>{sectionLabel}</p>
            {isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Active
              </span>
            ) : null}
          </div>
          <p className="truncate text-[1.5rem] font-bold leading-tight tracking-tight text-slate-900">
            <DemoDisplayName>{job.customerName}</DemoDisplayName>
          </p>
          <p className="text-base font-medium text-slate-600">{job.jobType}</p>
          <p className="text-xs font-medium tabular-nums text-slate-400">
            {job.jobNumber}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.status} />
        </div>

        <div className="space-y-2 text-[15px] leading-snug text-slate-600">
          <p className="flex items-start gap-2.5">
            <Clock
              className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-slate-400"
              aria-hidden
            />
            <span className="font-medium text-slate-700">
              {formatScheduledDate(job.scheduledDate, companyTimeZone)} ·{" "}
              {formatScheduledTime(job.scheduledDate, companyTimeZone)}
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <MapPin
              className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-slate-400"
              aria-hidden
            />
            <span className="min-w-0 break-words font-medium text-slate-700">
              {formatJobAddress(job)}
            </span>
          </p>
          {job.assignedTechnician ? (
            <p className="text-sm text-slate-500">
              Assigned to {job.assignedTechnician}
            </p>
          ) : (
            <p className="text-sm text-amber-700/90">Unassigned</p>
          )}
        </div>
      </div>

      <div className="space-y-2.5 border-t border-slate-100/90 bg-slate-50/40 px-5 py-4">
        <button
          type="button"
          onClick={() => onSelectJob(job)}
          className={ownerMobileHeroPrimaryActionClass}
        >
          View job
        </button>
        {hasAddress && mapsUrl ? (
          <button
            type="button"
            onClick={handleOpenMaps}
            className={ownerMobileHeroSecondaryActionClass}
          >
            <Navigation className="h-4 w-4" aria-hidden />
            Open maps
          </button>
        ) : null}
      </div>
    </article>
  );
}

type OwnerLaterTodayRowProps = {
  job: Job;
  companyTimeZone?: string;
  onSelectJob: (job: Job) => void;
};

function OwnerLaterTodayRow({
  job,
  companyTimeZone,
  onSelectJob,
}: OwnerLaterTodayRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectJob(job)}
      className={ownerMobileUpNextRowClass}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            <DemoDisplayName>{job.customerName}</DemoDisplayName>
          </p>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
            {formatScheduledTime(job.scheduledDate, companyTimeZone)}
          </span>
        </div>
        <p className="truncate text-xs text-slate-500">{job.jobType}</p>
        <div className="flex items-center gap-3 pt-0.5">
          <p className="flex min-w-0 items-center gap-1 truncate text-[11px] text-slate-500">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{formatJobLocation(job)}</span>
          </p>
          <JobStatusBadge status={job.status} className="shrink-0 text-[9px]" />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
    </button>
  );
}

type OwnerArchiveResultRowProps = {
  job: Job;
  companyTimeZone?: string;
  onSelectJob: (job: Job) => void;
};

function OwnerArchiveResultRow({
  job,
  companyTimeZone,
  onSelectJob,
}: OwnerArchiveResultRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectJob(job)}
      className={ownerMobileArchiveResultRowClass}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            <DemoDisplayName>{job.customerName}</DemoDisplayName>
          </p>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
            {formatScheduledDate(job.scheduledDate, companyTimeZone)}
          </span>
        </div>
        <p className="truncate text-xs text-slate-500">
          {job.jobNumber} · {job.jobType}
        </p>
        <JobStatusBadge status={job.status} className="mt-1 text-[9px]" />
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
    </button>
  );
}

export function JobsNorthStarMobileOwnerView({
  todayJobs,
  archiveJobs,
  activeTodayCount,
  scheduledTodayCount,
  hasNoJobs,
  hasActiveFilters,
  companyTimeZone,
  statusFilter,
  priorityFilter,
  lifecycleFilter,
  showLifecycleFilter,
  onSelectJob,
  onCreateJob,
  onStatusFilterChange,
  onPriorityFilterChange,
  onLifecycleFilterChange,
  onClearFilters,
}: JobsNorthStarMobileOwnerViewProps) {
  const [archiveSearch, setArchiveSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isArchiveSearching = archiveSearch.trim().length >= 2;

  const archiveResults = useMemo(
    () =>
      sortJobsForOwnerView(
        filterJobsByArchiveQuery(archiveJobs, archiveSearch),
      ),
    [archiveJobs, archiveSearch],
  );

  const primaryJob = todayJobs[0] ?? null;
  const laterTodayJobs = todayJobs.slice(1);

  const filterSelectClass =
    "h-11 w-full min-h-11 appearance-none rounded-xl border border-slate-200/90 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[rgba(198,167,87,0.45)] focus:ring-2 focus:ring-[rgba(198,167,87,0.18)]";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={ownerMobileCompactHeroClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={ownerMobileCompactHeroEyebrowClass}>Today&apos;s Work</p>
            <p className={`mt-0.5 ${ownerMobileCompactHeroMutedClass}`}>
              {hasActiveFilters
                ? `${todayJobs.length} of ${activeTodayCount} scheduled today`
                : `${activeTodayCount} scheduled today`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={ownerMobileFiltersButtonClass}
            aria-label="Open filters"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filters
            {hasActiveFilters ? (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[#C6A757]" />
            ) : null}
          </button>
        </div>
      </div>

      <div className={ownerMobileScrollContentClass}>
        {isArchiveSearching ? (
          <section className="space-y-3" aria-label="Job history search results">
            <div>
              <h2 className={ownerMobileSectionLabelClass}>Search results</h2>
              <p className="mt-1 text-sm text-slate-500">
                {archiveResults.length === 0
                  ? "No matching jobs found."
                  : `${archiveResults.length} matching ${
                      archiveResults.length === 1 ? "job" : "jobs"
                    }`}
              </p>
            </div>

            {archiveResults.length > 0 ? (
              <div className="space-y-2">
                {archiveResults.map((job) => (
                  <OwnerArchiveResultRow
                    key={job.id}
                    job={job}
                    companyTimeZone={companyTimeZone}
                    onSelectJob={onSelectJob}
                  />
                ))}
              </div>
            ) : (
              <div className={ownerMobileEmptyCardClass}>
                <p className="text-sm font-medium text-slate-700">No matches</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try a customer name, job number, or address.
                </p>
              </div>
            )}
          </section>
        ) : hasNoJobs ? (
          <div className={ownerMobileEmptyCardClass}>
            <p className="text-base font-semibold text-slate-900">No jobs yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Create your first job to schedule work and track status.
            </p>
            {onCreateJob ? (
              <button
                type="button"
                onClick={onCreateJob}
                className={`${ownerMobileHeroPrimaryActionClass} mt-5 inline-flex max-w-xs gap-2`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Create job
              </button>
            ) : null}
          </div>
        ) : todayJobs.length === 0 ? (
          <div className={ownerMobileEmptyCardClass}>
            <p className="text-base font-semibold text-slate-900">
              {scheduledTodayCount > 0
                ? "No jobs match your filters"
                : "No jobs scheduled today"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {scheduledTodayCount > 0
                ? "Try clearing filters or search job history below."
                : "Nothing is on today's board. Search job history below or create a new job."}
            </p>
            {onCreateJob ? (
              <button
                type="button"
                onClick={onCreateJob}
                className={`${ownerMobileHeroPrimaryActionClass} mt-5 inline-flex max-w-xs gap-2`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Create job
              </button>
            ) : null}
          </div>
        ) : (
          <section className="space-y-5" aria-label="Today's work">
            {primaryJob ? (
              <OwnerTodayHeroCard
                job={primaryJob}
                sectionLabel="Today's job"
                companyTimeZone={companyTimeZone}
                onSelectJob={onSelectJob}
              />
            ) : null}

            {laterTodayJobs.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h2 className={ownerMobileSectionLabelClass}>Later today</h2>
                  <span className="text-[10px] font-medium tabular-nums text-slate-400">
                    {laterTodayJobs.length} more
                  </span>
                </div>
                <div className="space-y-2">
                  {laterTodayJobs.map((job) => (
                    <OwnerLaterTodayRow
                      key={job.id}
                      job={job}
                      companyTimeZone={companyTimeZone}
                      onSelectJob={onSelectJob}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        <section className="mt-8 space-y-2" aria-label="Find past jobs">
          <label htmlFor="jobs-owner-archive-search" className="block">
            <span className={ownerMobileSectionLabelClass}>Find past jobs</span>
            <span className="mt-1 block text-sm text-slate-600">
              Search job history by customer, number, or address.
            </span>
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              id="jobs-owner-archive-search"
              type="search"
              value={archiveSearch}
              onChange={(event) => setArchiveSearch(event.target.value)}
              placeholder="Search job history…"
              className={ownerMobileArchiveInputClass}
              autoComplete="off"
            />
          </div>
        </section>
      </div>

      {filtersOpen ? (
        <MobileSheet
          onClose={() => setFiltersOpen(false)}
          ariaLabelledBy={FILTER_SHEET_TITLE_ID}
          rootClassName="lg:hidden"
        >
          <MobileSheetPanel>
            <MobileSheetHeader
              titleId={FILTER_SHEET_TITLE_ID}
              title="Filters"
              onClose={() => setFiltersOpen(false)}
              icon={
                <MobileSheetHeaderIcon className="bg-slate-100 ring-1 ring-slate-200/80">
                  <Filter className="h-5 w-5 text-slate-600" />
                </MobileSheetHeaderIcon>
              }
            />
            <MobileSheetBody className="space-y-4">
              {showLifecycleFilter ? (
                <div className="relative">
                  <Filter
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <select
                    value={lifecycleFilter}
                    onChange={(event) =>
                      onLifecycleFilterChange(
                        event.target.value as JobLifecycleState,
                      )
                    }
                    className={filterSelectClass}
                    aria-label="Filter by lifecycle"
                  >
                    {JOB_LIFECYCLE_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Filter
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      onStatusFilterChange(
                        event.target.value as JobStatus | "all",
                      )
                    }
                    className={filterSelectClass}
                    aria-label="Filter by status"
                  >
                    {JOB_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Filter
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <select
                    value={priorityFilter}
                    onChange={(event) =>
                      onPriorityFilterChange(
                        event.target.value as JobPriority | "all",
                      )
                    }
                    className={filterSelectClass}
                    aria-label="Filter by priority"
                  >
                    {JOB_PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </MobileSheetBody>
            <MobileSheetFooter>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClearFilters();
                      setFiltersOpen(false);
                    }}
                    className="text-sm font-semibold text-slate-600"
                  >
                    Clear filters
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className={ownerMobileHeroPrimaryActionClass}
                >
                  Done
                </button>
              </div>
            </MobileSheetFooter>
          </MobileSheetPanel>
        </MobileSheet>
      ) : null}
    </div>
  );
}
