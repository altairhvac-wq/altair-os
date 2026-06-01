"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, Undo2 } from "lucide-react";
import { generateEstimateDescriptionDraftAction } from "@/app/actions/estimate-ai";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { EstimateLineItemFormData } from "@/shared/types/estimate";

type EstimateDescriptionAiAssistantProps = {
  notes: string;
  onNotesChange: (notes: string) => void;
  lineItems: EstimateLineItemFormData[];
  customerName?: string;
  jobType?: string;
  jobTitle?: string;
  jobNumber?: string;
  tradeContext?: string;
  jobId?: string;
  aiFeaturesEnabled: boolean;
  canDraft?: boolean;
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

export function EstimateDescriptionAiAssistant({
  notes,
  onNotesChange,
  lineItems,
  customerName,
  jobType,
  jobTitle,
  jobNumber,
  tradeContext,
  jobId,
  aiFeaturesEnabled,
  canDraft = true,
  disabled = false,
}: EstimateDescriptionAiAssistantProps) {
  const [error, setError] = useState<string | null>(null);
  const [showRewrittenStatus, setShowRewrittenStatus] = useState(false);
  const [previousNotes, setPreviousNotes] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastAppliedDraftRef = useRef<string | null>(null);

  const isVisible = aiFeaturesEnabled && canDraft;
  const hideReason = getHideReason(aiFeaturesEnabled, canDraft);

  useEffect(() => {
    if (
      showRewrittenStatus &&
      lastAppliedDraftRef.current !== null &&
      notes !== lastAppliedDraftRef.current
    ) {
      setShowRewrittenStatus(false);
      setPreviousNotes(null);
      lastAppliedDraftRef.current = null;
    }
  }, [notes, showRewrittenStatus]);

  if (process.env.NODE_ENV === "development" && hideReason) {
    console.debug(`[EstimateDescriptionAiAssistant] hidden: ${hideReason}`);
  }

  if (!isVisible) {
    if (process.env.NODE_ENV === "development" && hideReason) {
      return (
        <p className="mt-1.5 text-[10px] text-amber-700" aria-hidden="true">
          Dev: AI rewrite hidden — {hideReason}
        </p>
      );
    }

    return null;
  }

  function handleRewrite() {
    if (disabled || isPending) {
      return;
    }

    setError(null);
    setShowRewrittenStatus(false);
    setPreviousNotes(null);
    lastAppliedDraftRef.current = null;

    const notesBeforeRewrite = notes;

    startTransition(async () => {
      const result = await generateEstimateDescriptionDraftAction({
        notes,
        customerName,
        jobType,
        jobTitle,
        jobNumber,
        tradeContext,
        lineItems,
        jobId,
      });

      if (result.error || !result.draftText?.trim()) {
        setError(
          formatActionError(
            result.error,
            "No description was generated. Try again or adjust your notes.",
          ),
        );
        return;
      }

      const draftText = result.draftText.trim();
      setPreviousNotes(notesBeforeRewrite);
      lastAppliedDraftRef.current = draftText;
      onNotesChange(draftText);
      setShowRewrittenStatus(true);
    });
  }

  function handleUndo() {
    if (previousNotes === null || disabled || isPending) {
      return;
    }

    onNotesChange(previousNotes);
    setPreviousNotes(null);
    setShowRewrittenStatus(false);
    lastAppliedDraftRef.current = null;
    setError(null);
  }

  const controlsDisabled = disabled || isPending;

  return (
    <div className="mt-2 space-y-1.5">
      <button
        type="button"
        onClick={handleRewrite}
        disabled={controlsDisabled}
        className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-h-9 sm:px-2.5 sm:py-1.5 sm:text-xs"
      >
        <Sparkles className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
        {isPending ? "Rewriting…" : "Rewrite with AI"}
      </button>

      <p className="text-[11px] text-slate-500">
        Turn rough notes into a customer-facing estimate description.
      </p>

      {showRewrittenStatus ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[11px] text-cyan-800" aria-live="polite">
            Rewritten by AI. Review before saving.
          </p>
          {previousNotes !== null ? (
            <button
              type="button"
              onClick={handleUndo}
              disabled={controlsDisabled}
              className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Undo2 className="h-3 w-3" aria-hidden="true" />
              Undo
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
