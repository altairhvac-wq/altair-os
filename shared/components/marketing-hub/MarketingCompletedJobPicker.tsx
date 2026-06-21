"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Briefcase } from "lucide-react";
import { listCompletedJobsForMarketingAction } from "@/app/actions/marketing-posts";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateInTimeZone } from "@/shared/lib/datetime";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { MarketingCompletedJobPickerItem } from "@/shared/types/marketing-completed-job";

type MarketingCompletedJobPickerProps = {
  northStar: boolean;
  onSelect: (job: MarketingCompletedJobPickerItem) => void;
  onCancel: () => void;
};

function formatCompletedJobLocation(
  city: string | null,
  state: string | null,
): string {
  if (city && state) {
    return `${city}, ${state}`;
  }

  if (city) {
    return city;
  }

  if (state) {
    return state;
  }

  return "Location unavailable";
}

function formatCompletedDate(
  completedAt: string | null,
  timeZone: string,
): string {
  if (!completedAt) {
    return "Date unavailable";
  }

  return formatDateInTimeZone(completedAt, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MarketingCompletedJobPicker({
  northStar,
  onSelect,
  onCancel,
}: MarketingCompletedJobPickerProps) {
  const timeZone = useCompanyTimezone();
  const [jobs, setJobs] = useState<MarketingCompletedJobPickerItem[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setError(null);

      const result = await listCompletedJobsForMarketingAction();
      if (result.error) {
        setJobs([]);
        setError(
          formatActionError(
            result.error,
            "We couldn't load completed jobs. Try again.",
          ),
        );
        return;
      }

      setJobs(result.jobs ?? []);
    });
  }, []);

  const isLoading = jobs === null;
  const isEmpty = jobs !== null && jobs.length === 0;

  const cardClassName = northStar
    ? "overflow-hidden rounded-[1.25rem] border border-[rgba(148,163,184,0.22)] bg-[#FFFBF5] shadow-[0_8px_30px_rgba(138,99,36,0.08)] ring-1 ring-[rgba(100,116,139,0.12)]"
    : "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-card)]";

  return (
    <div className="w-full max-w-2xl">
      <div className={cardClassName}>
        <header
          className={`border-b px-5 py-5 sm:px-7 sm:py-6 ${
            northStar
              ? "border-[rgba(148,163,184,0.18)] bg-[#FAF6EE]/50"
              : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <h2
            className={`text-lg font-bold tracking-tight sm:text-xl ${
              northStar ? "text-[#17130E]" : "text-slate-900"
            }`}
          >
            Create from completed job
          </h2>
          <p
            className={`mt-1.5 max-w-2xl text-sm leading-relaxed ${
              northStar ? "text-[#6B6255]" : "text-slate-500"
            }`}
          >
            Pick a completed job to start a safe draft. You review and edit
            everything before saving.
          </p>
          <p
            className={`mt-3 text-xs leading-relaxed ${
              northStar ? "text-[#8A7F72]" : "text-slate-500"
            }`}
          >
            Only job type, city, state, and completed date are shown here.
            Customer details and job notes stay private.
          </p>
        </header>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {isLoading ? (
            <p
              className={`py-8 text-center text-sm ${
                northStar ? "text-[#6B6255]" : "text-slate-500"
              }`}
            >
              Loading completed jobs...
            </p>
          ) : error ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </p>
              <button
                type="button"
                onClick={onCancel}
                className="admin-btn-secondary"
              >
                Back
              </button>
            </div>
          ) : isEmpty ? (
            <div className="space-y-4 py-4 text-center">
              <div
                className={
                  northStar
                    ? "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]"
                    : "admin-empty-icon mx-auto"
                }
              >
                <Briefcase
                  className={
                    northStar
                      ? "h-6 w-6 text-[#8A6324]"
                      : "h-7 w-7 text-slate-400"
                  }
                />
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    northStar ? "text-[#17130E]" : "text-slate-900"
                  }`}
                >
                  No completed jobs available yet.
                </p>
                <p
                  className={`mt-1 text-sm ${
                    northStar ? "text-[#6B6255]" : "text-slate-500"
                  }`}
                >
                  Completed jobs will appear here when your team finishes work.
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="admin-btn-secondary"
              >
                Back
              </button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100/90">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(job)}
                      className={`flex w-full flex-col gap-2 px-1 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                        northStar
                          ? "hover:bg-[#FAF6EE]/80"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <p
                          className={`truncate text-sm font-medium ${
                            northStar ? "text-[#17130E]" : "text-slate-900"
                          }`}
                        >
                          {job.jobType}
                        </p>
                        <p
                          className={`truncate text-xs ${
                            northStar ? "text-[#6B6255]" : "text-slate-500"
                          }`}
                        >
                          {formatCompletedJobLocation(job.city, job.state)}
                        </p>
                        <p
                          className={`text-xs ${
                            northStar ? "text-[#8A7F72]" : "text-slate-400"
                          }`}
                        >
                          Completed{" "}
                          {formatCompletedDate(job.completedAt, timeZone)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          northStar
                            ? "bg-[#EFE4CB] text-[#6B4E1A] ring-1 ring-[rgba(138,99,36,0.12)]"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Completed
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div
                className={`mt-5 border-t pt-5 ${
                  northStar
                    ? "border-[rgba(148,163,184,0.18)]"
                    : "border-slate-100"
                }`}
              >
                <button
                  type="button"
                  onClick={onCancel}
                  className="admin-btn-secondary inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
