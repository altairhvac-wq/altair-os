"use client";

import Link from "next/link";
import { Clock3, ExternalLink } from "lucide-react";
import type { JobBusinessAction } from "@/shared/lib/job-next-business-action";

type JobBusinessActionPresentation = "full" | "status" | "cta";

type JobBusinessActionGuideProps = {
  action: JobBusinessAction | null;
  layout?: "compact" | "default";
  presentation?: JobBusinessActionPresentation;
  disabled?: boolean;
  onFieldEstimateClick?: () => void;
  onFieldApproveClick?: () => void;
};

function matchesPresentation(
  action: JobBusinessAction,
  presentation: JobBusinessActionPresentation,
): boolean {
  if (presentation === "full") {
    return true;
  }

  if (presentation === "status") {
    return action.kind === "status" || action.kind === "workflow_align";
  }

  return action.kind === "cta";
}

function statusBannerClassName(action: JobBusinessAction): string {
  if (action.id === "awaiting_payment") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-indigo-200 bg-indigo-50 text-indigo-900";
}

function ctaClassName(compact: boolean, emphasize: boolean): string {
  if (compact && emphasize) {
    return "inline-flex min-h-10 w-full touch-manipulation items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60";
  }

  if (emphasize) {
    return "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
  }

  return "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
}

function secondaryLinkClassName(compact: boolean): string {
  return compact
    ? "inline-flex min-h-10 w-full touch-manipulation items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
}

export function JobBusinessActionGuide({
  action,
  layout = "default",
  presentation = "full",
  disabled = false,
  onFieldEstimateClick,
  onFieldApproveClick,
}: JobBusinessActionGuideProps) {
  if (!action || !matchesPresentation(action, presentation)) {
    return null;
  }

  const compact = layout === "compact";
  const useFieldEstimateHandler =
    onFieldEstimateClick &&
    (action.id === "create_estimate" || action.id === "finish_send_estimate");
  const useFieldApproveHandler =
    onFieldApproveClick && action.id === "approve_estimate_on_site";

  if (action.kind === "status") {
    return (
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${statusBannerClassName(action)}`}
        >
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{action.label}</span>
        </div>
        {action.hint ? (
          <p className="text-xs leading-relaxed text-slate-500">{action.hint}</p>
        ) : null}
        {action.secondary ? (
          <Link
            href={action.secondary.href}
            className={secondaryLinkClassName(compact)}
            aria-disabled={disabled}
          >
            {action.secondary.label}
          </Link>
        ) : null}
      </div>
    );
  }

  if (action.kind === "workflow_align") {
    return action.hint ? (
      <p className="text-xs leading-relaxed text-slate-500">{action.hint}</p>
    ) : null;
  }

  const ctaLabel = action.label;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {useFieldApproveHandler ? (
        <button
          type="button"
          onClick={onFieldApproveClick}
          disabled={disabled}
          className={ctaClassName(compact, action.emphasize)}
        >
          {ctaLabel}
        </button>
      ) : useFieldEstimateHandler ? (
        <button
          type="button"
          onClick={onFieldEstimateClick}
          disabled={disabled}
          className={ctaClassName(compact, action.emphasize)}
        >
          {ctaLabel}
        </button>
      ) : action.href ? (
        <Link
          href={action.href}
          className={ctaClassName(compact, action.emphasize)}
          aria-disabled={disabled}
        >
          <span className="inline-flex items-center gap-1.5">
            {ctaLabel}
            {!compact ? <ExternalLink className="h-3.5 w-3.5" aria-hidden /> : null}
          </span>
        </Link>
      ) : null}
      {action.hint ? (
        <p className="text-xs leading-relaxed text-slate-500">{action.hint}</p>
      ) : null}
      {action.secondary ? (
        <Link
          href={action.secondary.href}
          className={secondaryLinkClassName(compact)}
          aria-disabled={disabled}
        >
          {action.secondary.label}
        </Link>
      ) : null}
    </div>
  );
}
