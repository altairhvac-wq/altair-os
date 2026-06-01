"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { generateEstimateDescriptionDraftAction } from "@/app/actions/estimate-ai";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { EstimateDescriptionAiContext } from "@/shared/types/estimate-ai";

type EstimateDescriptionAiAssistantProps = {
  aiFeaturesEnabled: boolean;
  canDraft?: boolean;
  context: EstimateDescriptionAiContext;
  onApply: (draftText: string) => void;
  disabled?: boolean;
};

function getHideReason(
  aiFeaturesEnabled: boolean,
  canDraft: boolean,
): string | null {
  if (!aiFeaturesEnabled) {
    return "AI disabled (set AI_FEATURES_ENABLED=true and restart the dev server)";
  }

  if (!canDraft) {
    return "Permission denied (manageBilling required)";
  }

  return null;
}

const secondaryButtonClass =
  "min-h-9 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClass =
  "min-h-9 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60";

export function EstimateDescriptionAiAssistant({
  aiFeaturesEnabled,
  canDraft = true,
  context,
  onApply,
  disabled = false,
}: EstimateDescriptionAiAssistantProps) {
  const [draftText, setDraftText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isVisible = aiFeaturesEnabled && canDraft;
  const hideReason = getHideReason(aiFeaturesEnabled, canDraft);

  if (process.env.NODE_ENV === "development" && hideReason) {
    console.debug(`[EstimateDescriptionAiAssistant] hidden: ${hideReason}`);
  }

  if (!isVisible) {
    if (process.env.NODE_ENV === "development" && hideReason) {
      return (
        <p className="mt-1.5 text-[10px] text-amber-700" aria-hidden="true">
          Dev: AI draft hidden — {hideReason}
        </p>
      );
    }

    return null;
  }

  function handleGenerate() {
    if (disabled || isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await generateEstimateDescriptionDraftAction({
        notes: context.notes,
        customerName: context.customerName,
        jobType: context.jobType,
        jobTitle: context.jobTitle,
        jobNumber: context.jobNumber,
        tradeContext: context.tradeContext,
        lineItems: context.lineItems,
        jobId: context.jobId,
      });

      if (result.error || !result.draftText?.trim()) {
        setDraftText(null);
        setError(
          formatActionError(
            result.error,
            "No description was generated. Try again or adjust your notes.",
          ),
        );
        return;
      }

      setDraftText(result.draftText.trim());
    });
  }

  function handleApply() {
    if (!draftText) {
      return;
    }

    onApply(draftText);
    setDraftText(null);
    setError(null);
  }

  function handleCancel() {
    setDraftText(null);
    setError(null);
  }

  const controlsDisabled = disabled || isPending;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] text-slate-500">
        Turn rough notes and line items into a customer-facing description.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={controlsDisabled}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {isPending ? "Rewriting…" : "Rewrite with AI"}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      {draftText ? (
        <div className="rounded-md border border-cyan-200 bg-cyan-50/60 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900">
            Draft description — review before using
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">
            {draftText}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={controlsDisabled}
              className={primaryButtonClass}
            >
              Use description
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={controlsDisabled}
              className={secondaryButtonClass}
            >
              {isPending ? "Rewriting…" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={controlsDisabled}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
