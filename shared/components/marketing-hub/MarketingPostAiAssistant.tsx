"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { generateMarketingPostRewriteAction } from "@/app/actions/marketing-ai";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  MarketingChannel,
  MarketingPostSource,
} from "@/shared/types/marketing-post";

const MIN_POST_TEXT_CHARS = 10;

type MarketingPostAiAssistantProps = {
  title: string;
  postText: string;
  channelTarget: MarketingChannel;
  callToAction?: string;
  suggestedHashtags?: string[];
  sourceType?: MarketingPostSource;
  sourceId?: string | null;
  aiFeaturesEnabled: boolean;
  disabled?: boolean;
  onApplyDraftText: (text: string) => void;
};

function getHideReason(aiFeaturesEnabled: boolean): string | null {
  if (!aiFeaturesEnabled) {
    return "AI disabled (set AI_FEATURES_ENABLED=true and restart the dev server)";
  }

  return null;
}

function normalizeHashtagsForAction(hashtags: string[] | undefined): string[] {
  if (!hashtags?.length) {
    return [];
  }

  return hashtags
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter((tag) => tag.length > 0);
}

export function MarketingPostAiAssistant({
  title,
  postText,
  channelTarget,
  callToAction,
  suggestedHashtags,
  sourceType,
  sourceId,
  aiFeaturesEnabled,
  disabled = false,
  onApplyDraftText,
}: MarketingPostAiAssistantProps) {
  const [error, setError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<string | null>(null);
  const [previousPostText, setPreviousPostText] = useState<string | null>(null);
  const [showAppliedStatus, setShowAppliedStatus] = useState(false);
  const [isPending, startTransition] = useTransition();
  const lastAppliedDraftRef = useRef<string | null>(null);

  const isVisible = aiFeaturesEnabled;
  const hideReason = getHideReason(aiFeaturesEnabled);
  const trimmedPostText = postText.trim();
  const isPostTextTooShort = trimmedPostText.length < MIN_POST_TEXT_CHARS;

  useEffect(() => {
    if (
      showAppliedStatus &&
      lastAppliedDraftRef.current !== null &&
      postText !== lastAppliedDraftRef.current
    ) {
      setShowAppliedStatus(false);
      setPreviousPostText(null);
      lastAppliedDraftRef.current = null;
    }
  }, [postText, showAppliedStatus]);

  if (process.env.NODE_ENV === "development" && hideReason) {
    console.debug(`[MarketingPostAiAssistant] hidden: ${hideReason}`);
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

  function runRewrite() {
    if (disabled || isPending || isPostTextTooShort) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await generateMarketingPostRewriteAction({
        title: title.trim() || undefined,
        postText,
        channelTarget,
        callToAction: callToAction?.trim() || undefined,
        suggestedHashtags: normalizeHashtagsForAction(suggestedHashtags),
        sourceType,
        sourceId: sourceId ?? null,
      });

      if (result.error || !result.draftText?.trim()) {
        setError(
          formatActionError(
            result.error,
            "Could not rewrite the post. Try again.",
          ),
        );
        return;
      }

      setPreviewDraft(result.draftText.trim());
    });
  }

  function handleRewrite() {
    setPreviewDraft(null);
    setShowAppliedStatus(false);
    runRewrite();
  }

  function handleTryAgain() {
    runRewrite();
  }

  function handleUseText() {
    if (!previewDraft || disabled || isPending) {
      return;
    }

    setPreviousPostText(postText);
    lastAppliedDraftRef.current = previewDraft;
    onApplyDraftText(previewDraft);
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
    if (previousPostText === null || disabled || isPending) {
      return;
    }

    onApplyDraftText(previousPostText);
    setPreviousPostText(null);
    setShowAppliedStatus(false);
    lastAppliedDraftRef.current = null;
    setError(null);
  }

  const controlsDisabled = disabled || isPending || isPostTextTooShort;
  const showPreview = previewDraft !== null;

  return (
    <div className="mt-2 space-y-1.5">
      {!showPreview ? (
        <>
          <button
            type="button"
            onClick={handleRewrite}
            disabled={controlsDisabled}
            aria-busy={isPending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-h-9 sm:px-2.5 sm:py-1.5 sm:text-xs"
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
            {isPending ? "Rewriting…" : "Rewrite draft"}
          </button>

          {isPending ? (
            <p
              className="text-xs text-cyan-700"
              aria-live="polite"
              role="status"
            >
              Altair is rewriting your post…
            </p>
          ) : isPostTextTooShort ? (
            <p className="text-xs text-slate-500">
              Add at least {MIN_POST_TEXT_CHARS} characters of post text to
              rewrite.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Polish the post body. Review before saving.
            </p>
          )}
        </>
      ) : null}

      {showPreview ? (
        <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-cyan-900">
                Suggested wording
              </p>
              <p className="mt-0.5 text-xs text-cyan-800/70">
                Review before applying. Nothing is saved until you save the
                draft.
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
              disabled={disabled || isPending}
              className="inline-flex min-h-9 items-center rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use this text
            </button>
            <button
              type="button"
              onClick={handleTryAgain}
              disabled={disabled || isPending}
              className="inline-flex min-h-9 items-center rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800 transition-colors hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Rewriting…" : "Try again"}
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
            Applied to post text. Review before saving.
          </p>
          {previousPostText !== null ? (
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
