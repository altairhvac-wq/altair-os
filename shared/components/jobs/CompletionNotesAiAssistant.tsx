"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { generateCompletionNotesDraftAction } from "@/app/actions/completion-notes-ai";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  technicianFieldCloseoutAiButtonClass,
  technicianFieldCloseoutAiPreviewClass,
} from "@/shared/components/technician/technician-field-styles";

type CompletionNotesAiAssistantProps = {
  jobId: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  followUpNotes?: string;
  aiFeaturesEnabled: boolean;
  disabled?: boolean;
  variant?: "default" | "field";
};

function getHideReason(aiFeaturesEnabled: boolean): string | null {
  if (!aiFeaturesEnabled) {
    return "AI disabled (set AI_FEATURES_ENABLED=true and restart the dev server)";
  }

  return null;
}

export function CompletionNotesAiAssistant({
  jobId,
  notes,
  onNotesChange,
  followUpNotes,
  aiFeaturesEnabled,
  disabled = false,
  variant = "default",
}: CompletionNotesAiAssistantProps) {
  const [error, setError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<string | null>(null);
  const [previousNotes, setPreviousNotes] = useState<string | null>(null);
  const [showAppliedStatus, setShowAppliedStatus] = useState(false);
  const [isPending, startTransition] = useTransition();
  const lastAppliedDraftRef = useRef<string | null>(null);

  const isVisible = aiFeaturesEnabled;
  const hideReason = getHideReason(aiFeaturesEnabled);
  const isField = variant === "field";

  useEffect(() => {
    if (
      showAppliedStatus &&
      lastAppliedDraftRef.current !== null &&
      notes !== lastAppliedDraftRef.current
    ) {
      setShowAppliedStatus(false);
      setPreviousNotes(null);
      lastAppliedDraftRef.current = null;
    }
  }, [notes, showAppliedStatus]);

  if (process.env.NODE_ENV === "development" && hideReason) {
    console.debug(`[CompletionNotesAiAssistant] hidden: ${hideReason}`);
  }

  if (!isVisible) {
    if (process.env.NODE_ENV === "development" && hideReason) {
      return (
        <p className="mt-1.5 text-[10px] text-amber-700" aria-hidden="true">
          Dev: AI polish hidden — {hideReason}
        </p>
      );
    }

    return null;
  }

  function runDraft() {
    if (disabled || isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await generateCompletionNotesDraftAction({
        jobId,
        notes,
        followUpNotes: followUpNotes?.trim() || undefined,
      });

      if (result.error || !result.draftText?.trim()) {
        setError(
          formatActionError(
            result.error,
            "Could not polish the notes. Try again.",
          ),
        );
        return;
      }

      setPreviewDraft(result.draftText.trim());
    });
  }

  function handlePolish() {
    setPreviewDraft(null);
    setShowAppliedStatus(false);
    runDraft();
  }

  function handleTryAgain() {
    runDraft();
  }

  function handleUseText() {
    if (!previewDraft || disabled || isPending) {
      return;
    }

    setPreviousNotes(notes);
    lastAppliedDraftRef.current = previewDraft;
    onNotesChange(previewDraft);
    setPreviewDraft(null);
    setShowAppliedStatus(true);
    setError(null);
  }

  function handleCancelPreview() {
    if (disabled || isPending) {
      return;
    }

    setPreviewDraft(null);
    setError(null);
  }

  function handleUndo() {
    if (previousNotes === null || disabled || isPending) {
      return;
    }

    onNotesChange(previousNotes);
    setPreviousNotes(null);
    setShowAppliedStatus(false);
    lastAppliedDraftRef.current = null;
    setError(null);
  }

  const controlsDisabled = disabled || isPending;
  const showPreview = previewDraft !== null;

  const polishButtonClass = isField
    ? technicianFieldCloseoutAiButtonClass
    : "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-h-9 sm:px-2.5 sm:py-1.5 sm:text-xs";

  const previewPanelClass = isField
    ? technicianFieldCloseoutAiPreviewClass
    : "rounded-lg border border-cyan-100 bg-cyan-50/40 px-3 py-2.5";

  const actionButtonClass = isField
    ? "inline-flex min-h-11 touch-manipulation items-center rounded-xl bg-cyan-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex min-h-9 items-center rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryActionClass = isField
    ? "inline-flex min-h-11 touch-manipulation items-center rounded-xl bg-white/80 px-3.5 py-2 text-xs font-semibold text-cyan-800 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex min-h-9 items-center rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 transition-colors hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60";

  const ghostActionClass = isField
    ? "inline-flex min-h-11 touch-manipulation items-center rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex min-h-9 items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={isField ? "mt-3 space-y-2" : "mt-2 space-y-1.5"}>
      {!showPreview ? (
        <>
          <button
            type="button"
            onClick={handlePolish}
            disabled={controlsDisabled}
            aria-busy={isPending}
            className={polishButtonClass}
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
            {isPending ? "Writing…" : "Polish with AI"}
          </button>

          {isPending ? (
            <p
              className="text-xs text-cyan-700"
              aria-live="polite"
              role="status"
            >
              Altair is polishing your completion notes…
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Turn rough field shorthand into clear completion notes.
            </p>
          )}
        </>
      ) : null}

      {showPreview ? (
        <div className={previewPanelClass}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-cyan-900">
                Suggested wording
              </p>
              <p className="mt-0.5 text-xs text-cyan-800/70">
                Review before applying. Nothing is saved until you complete the
                job.
              </p>
            </div>
          </div>

          <p
            className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700"
            aria-live="polite"
          >
            {previewDraft}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUseText}
              disabled={controlsDisabled}
              className={actionButtonClass}
            >
              Use this text
            </button>
            <button
              type="button"
              onClick={handleTryAgain}
              disabled={controlsDisabled}
              className={secondaryActionClass}
            >
              {isPending ? "Writing…" : "Try again"}
            </button>
            <button
              type="button"
              onClick={handleCancelPreview}
              disabled={controlsDisabled}
              className={ghostActionClass}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showAppliedStatus ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-cyan-50/40 px-2.5 py-2">
          <p className="text-xs text-cyan-800" aria-live="polite">
            Applied to completion notes. Review before submitting.
          </p>
          {previousNotes !== null ? (
            <button
              type="button"
              onClick={handleUndo}
              disabled={controlsDisabled}
              className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
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
