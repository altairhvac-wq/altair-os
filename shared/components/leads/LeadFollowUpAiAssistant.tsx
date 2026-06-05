"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { generateLeadFollowUpAction } from "@/app/actions/lead-ai";
import { formatActionError } from "@/shared/lib/operational-errors";

type LeadFollowUpAiAssistantProps = {
  leadId: string;
  aiFeaturesEnabled: boolean;
};

function getHideReason(aiFeaturesEnabled: boolean): string | null {
  if (!aiFeaturesEnabled) {
    return "AI disabled (set AI_FEATURES_ENABLED=true and restart the dev server)";
  }

  return null;
}

export function LeadFollowUpAiAssistant({
  leadId,
  aiFeaturesEnabled,
}: LeadFollowUpAiAssistantProps) {
  const [followUpText, setFollowUpText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hideReason = getHideReason(aiFeaturesEnabled);

  useEffect(() => {
    setFollowUpText(null);
    setError(null);
    setCopied(false);
  }, [leadId]);

  if (process.env.NODE_ENV === "development" && hideReason) {
    console.debug(`[LeadFollowUpAiAssistant] hidden: ${hideReason}`);
  }

  if (!aiFeaturesEnabled) {
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">AI Follow-Up</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Draft a message for this lead based on recent activity.
        </p>
        <p className="mt-2 text-xs text-slate-600">AI follow-up is unavailable.</p>
        {process.env.NODE_ENV === "development" && hideReason ? (
          <p className="mt-1 text-[10px] text-amber-700" aria-hidden="true">
            Dev: {hideReason}
          </p>
        ) : null}
      </section>
    );
  }

  function handleGenerate() {
    if (isPending) {
      return;
    }

    setError(null);
    setCopied(false);

    startTransition(async () => {
      const result = await generateLeadFollowUpAction(leadId);

      if (result.error || !result.followUpText?.trim()) {
        setError(
          formatActionError(
            result.error,
            "Could not generate a follow-up right now. Try again in a moment.",
          ),
        );
        return;
      }

      setFollowUpText(result.followUpText.trim());
    });
  }

  async function handleCopy() {
    if (!followUpText?.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(followUpText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <section className="rounded-xl border border-cyan-100 bg-cyan-50/30 px-3 py-3 sm:px-4 sm:py-3.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-600" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-900">AI Follow-Up</h3>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Draft a message for this lead based on recent activity.
      </p>

      {!followUpText && !isPending ? (
        <p className="mt-2 text-xs text-slate-500">
          Generate a professional follow-up message for this lead.
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        aria-busy={isPending}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:w-auto sm:px-2.5 sm:py-1.5 sm:text-xs"
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
        {isPending ? "Drafting follow-up…" : "Generate Follow-Up"}
      </button>

      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      {followUpText ? (
        <div className="mt-3 rounded-lg border border-cyan-100 bg-white px-3 py-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900">
              Follow-up draft
            </p>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:min-h-8 sm:px-1.5 sm:py-1"
                aria-label={copied ? "Message copied" : "Copy message"}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                className="inline-flex min-h-9 items-center rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-8 sm:px-1.5 sm:py-1"
              >
                {isPending ? "Drafting follow-up…" : "Regenerate"}
              </button>
            </div>
          </div>

          <p
            className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700"
            aria-live="polite"
          >
            {followUpText}
          </p>
        </div>
      ) : null}
    </section>
  );
}
