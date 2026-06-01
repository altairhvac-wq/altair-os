"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { generateJobSummaryAction } from "@/app/actions/job-ai";
import { formatActionError } from "@/shared/lib/operational-errors";

type JobSummaryAiAssistantProps = {
  jobId: string;
  aiFeaturesEnabled: boolean;
};

function getHideReason(aiFeaturesEnabled: boolean): string | null {
  if (!aiFeaturesEnabled) {
    return "AI disabled (set AI_FEATURES_ENABLED=true and restart the dev server)";
  }

  return null;
}

export function JobSummaryAiAssistant({
  jobId,
  aiFeaturesEnabled,
}: JobSummaryAiAssistantProps) {
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isVisible = aiFeaturesEnabled;
  const hideReason = getHideReason(aiFeaturesEnabled);

  if (process.env.NODE_ENV === "development" && hideReason) {
    console.debug(`[JobSummaryAiAssistant] hidden: ${hideReason}`);
  }

  if (!isVisible) {
    if (process.env.NODE_ENV === "development" && hideReason) {
      return (
        <p className="text-[10px] text-amber-700" aria-hidden="true">
          Dev: AI summary hidden — {hideReason}
        </p>
      );
    }

    return null;
  }

  function handleSummarize() {
    if (isPending) {
      return;
    }

    setError(null);
    setIsDismissed(false);
    setIsExpanded(true);
    setCopied(false);

    startTransition(async () => {
      const result = await generateJobSummaryAction(jobId);

      if (result.error || !result.summaryText?.trim()) {
        setError(
          formatActionError(
            result.error,
            "Could not summarize this job. Try again.",
          ),
        );
        return;
      }

      setSummaryText(result.summaryText.trim());
    });
  }

  async function handleCopy() {
    if (!summaryText?.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  function handleDismiss() {
    setIsDismissed(true);
    setError(null);
  }

  const showPanel = summaryText && !isDismissed;

  return (
    <section className="admin-card px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={isPending}
          aria-busy={isPending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:w-auto sm:px-2.5 sm:py-1.5 sm:text-xs"
        >
          {isPending ? (
            <Loader2
              className="h-4 w-4 animate-spin sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
          ) : (
            <Sparkles
              className="h-4 w-4 sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
          )}
          {isPending ? "Summarizing…" : "Summarize with AI"}
        </button>

        {!isPending && !showPanel ? (
          <p className="text-[11px] text-slate-500 sm:text-right">
            Generate a concise internal summary of this job.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      {showPanel ? (
        <div className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50/50 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-900">
                AI job summary
              </p>
              <p className="mt-0.5 text-[11px] text-cyan-800/80">
                Review before acting.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 sm:min-h-8 sm:px-1.5 sm:py-1"
                aria-label={copied ? "Summary copied" : "Copy summary"}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded((current) => !current)}
                className="inline-flex min-h-9 items-center rounded-md px-2 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 sm:min-h-8 sm:px-1.5 sm:py-1"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Collapse summary" : "Expand summary"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex min-h-9 items-center rounded-md px-2 py-1.5 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 sm:min-h-8 sm:px-1.5 sm:py-1"
                aria-label="Dismiss summary"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {isExpanded ? (
            <p
              className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700"
              aria-live="polite"
            >
              {summaryText}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
