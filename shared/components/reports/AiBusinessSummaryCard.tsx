"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { BusinessSummaryAiResult } from "@/shared/types/reports-page";
import {
  altairReportCardClass,
  altairReportCardPadTier1Class,
  altairReportSecondaryActionClass,
} from "@/shared/design-system/components";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type AiBusinessSummaryCardProps = {
  summary: BusinessSummaryAiResult | null;
  error: string | null;
  isPending: boolean;
  onRefresh: () => void;
  aiFeaturesEnabled: boolean;
  variant?: ReportSurfaceVariant;
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
  variant = "legacy",
}: AiBusinessSummaryCardProps) {
  const northStar = isNorthStarReportSurface(variant);

  if (northStar) {
    return (
      <section
        className={`${altairReportCardClass} ${altairReportCardPadTier1Class} overflow-hidden border-altair-brass/25`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-altair-brass/20 text-altair-brass"
            aria-hidden="true"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-brass">
            AI-generated
          </p>
        </div>

        <div className="mt-3 space-y-3">
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-altair-ink-on-graphite-secondary">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Generating summary…
            </div>
          ) : summary ? (
            <>
              {summary.fromCache ? (
                <p className="text-[11px] font-medium text-altair-ink-on-graphite-muted">
                  Cached for this period · generated{" "}
                  {formatGeneratedAt(summary.generatedAt)}
                </p>
              ) : null}

              <ul className="space-y-2 text-sm leading-relaxed text-altair-paper">
                {summary.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2.5">
                    <span
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-altair-brass"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-lg border border-altair-brass/30 bg-altair-brass/10 px-3.5 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-altair-brass">
                  Period takeaway
                </p>
                <p className="mt-1 text-sm leading-relaxed text-altair-paper">
                  {summary.recommendedAction}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-altair-border pt-3">
                {!summary.fromCache ? (
                  <p className="text-[11px] text-altair-ink-on-graphite-muted">
                    Generated {formatGeneratedAt(summary.generatedAt)}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={!aiFeaturesEnabled || isPending}
                  className={`${altairReportSecondaryActionClass} h-9 px-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  Refresh Summary
                </button>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="altair-surface-card overflow-hidden">
      <div className="border-b border-slate-100/80 bg-[var(--surface-tile)] px-4 py-3 sm:px-5">
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
                Cached for this period · generated{" "}
                {formatGeneratedAt(summary.generatedAt)}
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
