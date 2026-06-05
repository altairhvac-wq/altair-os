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
    <section className="flex flex-col overflow-hidden admin-card">
      <div className="admin-panel-header px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="admin-heading-section sm:text-base">AI Business Summary</h3>
        <p className="admin-text-helper mt-0.5">
          Generate a plain-English summary of this reporting period.
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {!aiFeaturesEnabled ? (
          <p className="text-sm text-slate-500">
            AI summaries are disabled. Enable AI features in your environment to
            generate owner-friendly insights.
          </p>
        ) : null}

        {!summary ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
            <p className="mx-auto max-w-2xl text-sm text-slate-500">
              Generate a summary to highlight revenue trends, cash flow changes,
              sales performance, and operational risks.
            </p>
            <button
              type="button"
              onClick={() => onGenerate(false)}
              disabled={!aiFeaturesEnabled || isPending}
              className="admin-btn-primary mt-4 inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
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
              <p className="text-xs font-medium text-slate-500">
                Generated earlier for this period
              </p>
            ) : null}

            <ul className="space-y-2 text-sm text-slate-700">
              {summary.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-slate-400" aria-hidden="true">
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Recommended next action
              </p>
              <p className="mt-1 text-sm text-slate-800">
                {summary.recommendedAction}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-400">
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
