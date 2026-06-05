"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { BusinessSummaryAiResult } from "@/shared/types/reports-page";

type AiBusinessSummaryCardProps = {
  summary: BusinessSummaryAiResult | null;
  error: string | null;
  isPending: boolean;
  onRefresh: () => void;
  aiFeaturesEnabled: boolean;
};

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AiBusinessSummaryCard({
  summary,
  error,
  isPending,
  onRefresh,
  aiFeaturesEnabled,
}: AiBusinessSummaryCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" aria-hidden="true" />
          <h3 className="admin-heading-section text-[13px] sm:text-sm">
            AI Business Review
          </h3>
        </div>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">
          Plain-English summary for this reporting period.
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {isPending ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Generating summary…
          </div>
        ) : summary ? (
          <>
            {summary.fromCache ? (
              <p className="text-[11px] font-medium text-slate-400">
                Cached for this period · generated {formatGeneratedAt(summary.generatedAt)}
              </p>
            ) : null}

            <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
              {summary.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2.5">
                  <span
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400"
                    aria-hidden="true"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-3.5 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/70">
                Period takeaway
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">
                {summary.recommendedAction}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
              {!summary.fromCache ? (
                <p className="text-[11px] text-slate-400">
                  Generated {formatGeneratedAt(summary.generatedAt)}
                </p>
              ) : null}
              <button
                type="button"
                onClick={onRefresh}
                disabled={!aiFeaturesEnabled || isPending}
                className="admin-btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh Summary
              </button>
            </div>
          </>
        ) : null}

        {error ? (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
