"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { BusinessSummaryAiResult } from "@/shared/types/reports-page";

type AiBusinessSummaryCardProps = {
  aiFeaturesEnabled: boolean;
  summary: BusinessSummaryAiResult | null;
  error: string | null;
  isPending: boolean;
  onGenerate: (refresh?: boolean) => void;
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
  aiFeaturesEnabled,
  summary,
  error,
  isPending,
  onGenerate,
}: AiBusinessSummaryCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" aria-hidden="true" />
          <h3 className="admin-heading-section text-[13px] sm:text-sm">
            AI Business Summary
          </h3>
        </div>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">
          Plain-English review of how your business performed this period.
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {!aiFeaturesEnabled ? (
          <p className="text-xs text-slate-500 sm:text-sm">
            AI summaries are disabled. Enable AI features in your environment to
            generate owner-friendly insights.
          </p>
        ) : null}

        {!summary ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center sm:py-7">
            <p className="mx-auto max-w-xl text-xs leading-relaxed text-slate-500 sm:text-sm">
              Generate a plain-English review of revenue trends, collections,
              sales performance, and operational risks.
            </p>
            <button
              type="button"
              onClick={() => onGenerate(false)}
              disabled={!aiFeaturesEnabled || isPending}
              className="admin-btn-primary mt-4 inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              Generate Summary
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.fromCache ? (
              <p className="text-[11px] font-medium text-slate-400">
                Generated earlier for this period
              </p>
            ) : null}

            <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/30 px-4 py-4">
              <ul className="space-y-2.5 text-sm leading-relaxed text-slate-700">
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
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/70">
                Recommended next action
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">
                {summary.recommendedAction}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
              <p className="text-[11px] text-slate-400">
                Generated {formatGeneratedAt(summary.generatedAt)}
              </p>
              <button
                type="button"
                onClick={() => onGenerate(true)}
                disabled={!aiFeaturesEnabled || isPending}
                className="admin-btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Refreshing…" : "Refresh Summary"}
              </button>
            </div>
          </div>
        )}

        {error ? (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
