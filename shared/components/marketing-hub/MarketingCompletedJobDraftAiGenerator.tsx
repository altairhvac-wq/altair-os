"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { generateMarketingCompletedJobDraftAction } from "@/app/actions/marketing-ai";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { MarketingCompletedJobDraftFields } from "@/shared/types/marketing-ai";
import {
  formatMarketingChannel,
  type MarketingChannel,
} from "@/shared/types/marketing-post";

type DraftFormSnapshot = {
  title: string;
  channelTarget: MarketingChannel;
  postText: string;
  suggestedHashtags: string;
  callToAction: string;
};

type MarketingCompletedJobDraftAiGeneratorProps = {
  sourceId: string;
  channelTarget: MarketingChannel;
  currentFormSnapshot: DraftFormSnapshot;
  aiFeaturesEnabled: boolean;
  aiDraftingConfigured: boolean;
  disabled?: boolean;
  onApplyDraft: (draft: DraftFormSnapshot) => void;
};

function getUnavailableReason(
  aiFeaturesEnabled: boolean,
  aiDraftingConfigured: boolean,
): string | null {
  if (!aiFeaturesEnabled) {
    return "AI disabled (set AI_FEATURES_ENABLED=true and restart the dev server)";
  }

  if (!aiDraftingConfigured) {
    return "AI drafting is not configured yet (set OPENAI_API_KEY)";
  }

  return null;
}

function formatHashtagsForInput(hashtags: string[]): string {
  if (!hashtags.length) {
    return "";
  }

  return hashtags.map((tag) => `#${tag.replace(/^#+/, "")}`).join(" ");
}

function draftFieldsToFormSnapshot(
  draft: MarketingCompletedJobDraftFields,
): DraftFormSnapshot {
  return {
    title: draft.title,
    channelTarget: draft.channelTarget,
    postText: draft.postText,
    suggestedHashtags: formatHashtagsForInput(draft.suggestedHashtags),
    callToAction: draft.callToAction,
  };
}

export function MarketingCompletedJobDraftAiGenerator({
  sourceId,
  channelTarget,
  currentFormSnapshot,
  aiFeaturesEnabled,
  aiDraftingConfigured,
  disabled = false,
  onApplyDraft,
}: MarketingCompletedJobDraftAiGeneratorProps) {
  const [error, setError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] =
    useState<MarketingCompletedJobDraftFields | null>(null);
  const [previousFormSnapshot, setPreviousFormSnapshot] =
    useState<DraftFormSnapshot | null>(null);
  const [showAppliedStatus, setShowAppliedStatus] = useState(false);
  const [isPending, startTransition] = useTransition();

  const unavailableReason = getUnavailableReason(
    aiFeaturesEnabled,
    aiDraftingConfigured,
  );

  if (process.env.NODE_ENV === "development" && unavailableReason) {
    console.debug(
      `[MarketingCompletedJobDraftAiGenerator] unavailable: ${unavailableReason}`,
    );
  }

  if (!aiFeaturesEnabled) {
    if (process.env.NODE_ENV === "development" && unavailableReason) {
      return (
        <p className="text-[10px] text-amber-700" aria-hidden="true">
          Dev: AI generate hidden — {unavailableReason}
        </p>
      );
    }

    return null;
  }

  if (!aiDraftingConfigured) {
    return (
      <p className="text-xs text-slate-500">
        AI draft generation is not configured yet.
        {process.env.NODE_ENV === "development" && unavailableReason ? (
          <span className="mt-1 block text-[10px] text-amber-700" aria-hidden="true">
            Dev: {unavailableReason}
          </span>
        ) : null}
      </p>
    );
  }

  function runGenerate() {
    if (disabled || isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await generateMarketingCompletedJobDraftAction({
        sourceId,
        channelTarget,
      });

      if (result.error || !result.draft) {
        setError(
          formatActionError(
            result.error,
            "Could not generate the draft. Try again.",
          ),
        );
        return;
      }

      setPreviewDraft(result.draft);
    });
  }

  function handleGenerate() {
    setPreviewDraft(null);
    setShowAppliedStatus(false);
    runGenerate();
  }

  function handleTryAgain() {
    runGenerate();
  }

  function handleUseDraft() {
    if (!previewDraft || disabled || isPending) {
      return;
    }

    setPreviousFormSnapshot(currentFormSnapshot);
    onApplyDraft(draftFieldsToFormSnapshot(previewDraft));
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
    if (previousFormSnapshot === null || disabled || isPending) {
      return;
    }

    onApplyDraft(previousFormSnapshot);
    setPreviousFormSnapshot(null);
    setShowAppliedStatus(false);
    setError(null);
  }

  const controlsDisabled = disabled || isPending;
  const showPreview = previewDraft !== null;

  return (
    <div className="space-y-1.5 rounded-xl border border-cyan-100 bg-cyan-50/30 px-3.5 py-3">
      {!showPreview ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-cyan-900">
                AI draft from completed job
              </p>
              <p className="mt-0.5 text-xs text-cyan-800/70">
                A starter template is loaded below. Generate stronger copy, then
                review before saving.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={controlsDisabled}
              aria-busy={isPending}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-2 text-xs font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:px-2.5 sm:py-1.5"
            >
              {isPending ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isPending ? "Generating…" : "AI Generate"}
            </button>
          </div>

          {isPending ? (
            <p
              className="text-xs text-cyan-700"
              aria-live="polite"
              role="status"
            >
              Altair is drafting your post from the completed job…
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Uses job type, city, state, and completion date only. Nothing is
              saved until you click Save draft.
            </p>
          )}
        </>
      ) : null}

      {showPreview && previewDraft ? (
        <div className="rounded-lg border border-cyan-100 bg-white/70 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cyan-900">
              Suggested draft
            </p>
            <p className="mt-0.5 text-xs text-cyan-800/70">
              Review before applying. Nothing is saved until you save the draft.
            </p>
          </div>

          <dl className="mt-2.5 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Title</dt>
              <dd className="mt-0.5 text-slate-800">{previewDraft.title}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Channel</dt>
              <dd className="mt-0.5 text-slate-800">
                {formatMarketingChannel(previewDraft.channelTarget)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Post text</dt>
              <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-slate-700">
                {previewDraft.postText}
              </dd>
            </div>
            {previewDraft.suggestedHashtags.length > 0 ? (
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  Suggested hashtags
                </dt>
                <dd className="mt-0.5 text-slate-800">
                  {formatHashtagsForInput(previewDraft.suggestedHashtags)}
                </dd>
              </div>
            ) : null}
            {previewDraft.callToAction ? (
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  Call to action
                </dt>
                <dd className="mt-0.5 text-slate-800">
                  {previewDraft.callToAction}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUseDraft}
              disabled={disabled || isPending}
              className="inline-flex min-h-9 items-center rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use this draft
            </button>
            <button
              type="button"
              onClick={handleTryAgain}
              disabled={disabled || isPending}
              className="inline-flex min-h-9 items-center rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 transition-colors hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Generating…" : "Try again"}
            </button>
            <button
              type="button"
              onClick={handleCancelPreview}
              disabled={disabled || isPending}
              className="inline-flex min-h-9 items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showAppliedStatus ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-cyan-50/40 px-2.5 py-2">
          <p className="text-xs text-cyan-800" aria-live="polite">
            Applied to the form. Review and edit before saving.
          </p>
          {previousFormSnapshot !== null ? (
            <button
              type="button"
              onClick={handleUndo}
              disabled={disabled || isPending}
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
