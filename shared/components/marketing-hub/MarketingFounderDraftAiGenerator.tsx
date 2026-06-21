"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { generateMarketingFounderDraftAction } from "@/app/actions/marketing-ai";
import type { MarketingFounderSourceType } from "@/shared/components/marketing-hub/marketing-post-templates";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  MarketingFounderDraftFields,
  MarketingFounderMilestoneType,
} from "@/shared/types/marketing-ai";
import { MARKETING_FOUNDER_MILESTONE_TYPE_OPTIONS } from "@/shared/types/marketing-ai";
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

type FounderAiInput = {
  milestoneTitle: string;
  milestoneType: MarketingFounderMilestoneType;
  whatChanged: string;
  whyItMatters: string;
  targetAudience: string;
  callToAction: string;
  tone: string;
  channelTarget: MarketingChannel;
};

type MarketingFounderDraftAiGeneratorProps = {
  sourceType: MarketingFounderSourceType;
  initialMilestoneType: MarketingFounderMilestoneType;
  initialMilestoneTitle: string;
  initialChannelTarget: MarketingChannel;
  currentFormSnapshot: DraftFormSnapshot;
  aiFeaturesEnabled: boolean;
  aiDraftingConfigured: boolean;
  disabled?: boolean;
  onApplyDraft: (draft: DraftFormSnapshot) => void;
};

const DEFAULT_TARGET_AUDIENCE = "small HVAC and trades business owners";
const DEFAULT_CALL_TO_ACTION =
  "looking for a few founding companies / beta testers";
const DEFAULT_TONE = "honest founder update, practical, not hypey";

const CHANNEL_OPTIONS: { value: MarketingChannel; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google_business", label: "Google Business" },
  { value: "website", label: "Website" },
  { value: "general", label: "General" },
];

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
  draft: MarketingFounderDraftFields,
): DraftFormSnapshot {
  return {
    title: draft.title,
    channelTarget: draft.channelTarget,
    postText: draft.postText,
    suggestedHashtags: formatHashtagsForInput(draft.suggestedHashtags),
    callToAction: draft.callToAction,
  };
}

function buildInitialFounderInput(
  props: MarketingFounderDraftAiGeneratorProps,
): FounderAiInput {
  return {
    milestoneTitle: props.initialMilestoneTitle,
    milestoneType: props.initialMilestoneType,
    whatChanged: "",
    whyItMatters: "",
    targetAudience: DEFAULT_TARGET_AUDIENCE,
    callToAction: DEFAULT_CALL_TO_ACTION,
    tone: DEFAULT_TONE,
    channelTarget: props.initialChannelTarget,
  };
}

export function MarketingFounderDraftAiGenerator({
  sourceType,
  initialMilestoneType,
  initialMilestoneTitle,
  initialChannelTarget,
  currentFormSnapshot,
  aiFeaturesEnabled,
  aiDraftingConfigured,
  disabled = false,
  onApplyDraft,
}: MarketingFounderDraftAiGeneratorProps) {
  const [founderInput, setFounderInput] = useState<FounderAiInput>(() =>
    buildInitialFounderInput({
      sourceType,
      initialMilestoneType,
      initialMilestoneTitle,
      initialChannelTarget,
      currentFormSnapshot,
      aiFeaturesEnabled,
      aiDraftingConfigured,
      onApplyDraft,
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] =
    useState<MarketingFounderDraftFields | null>(null);
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
      `[MarketingFounderDraftAiGenerator] unavailable: ${unavailableReason}`,
    );
  }

  if (!aiFeaturesEnabled) {
    if (process.env.NODE_ENV === "development" && unavailableReason) {
      return (
        <p className="text-[10px] text-amber-700" aria-hidden="true">
          Dev: Founder AI generate hidden — {unavailableReason}
        </p>
      );
    }

    return null;
  }

  if (!aiDraftingConfigured) {
    return (
      <p className="text-xs text-slate-500">
        AI founder draft generation is not configured yet.
        {process.env.NODE_ENV === "development" && unavailableReason ? (
          <span className="mt-1 block text-[10px] text-amber-700" aria-hidden="true">
            Dev: {unavailableReason}
          </span>
        ) : null}
      </p>
    );
  }

  function updateFounderField<K extends keyof FounderAiInput>(
    field: K,
    value: FounderAiInput[K],
  ) {
    setFounderInput((current) => ({ ...current, [field]: value }));
  }

  function runGenerate() {
    if (disabled || isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await generateMarketingFounderDraftAction({
        sourceType,
        milestoneTitle: founderInput.milestoneTitle,
        milestoneType: founderInput.milestoneType,
        whatChanged: founderInput.whatChanged,
        whyItMatters: founderInput.whyItMatters,
        targetAudience: founderInput.targetAudience,
        callToAction: founderInput.callToAction,
        tone: founderInput.tone,
        channelTarget: founderInput.channelTarget,
      });

      if (result.error || !result.draft) {
        setError(
          formatActionError(
            result.error,
            "Could not generate the founder draft. Try again.",
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
  const inputClassName =
    "mt-1 w-full rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 px-3.5 py-3">
      {!showPreview ? (
        <>
          <div>
            <p className="text-xs font-semibold text-amber-950">
              AI founder draft
            </p>
            <p className="mt-0.5 text-xs text-amber-900/70">
              A starter template is loaded below. Add milestone details, generate
              stronger copy, then review before saving.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs sm:col-span-2">
              <span className="font-medium text-slate-700">Milestone title</span>
              <input
                value={founderInput.milestoneTitle}
                onChange={(event) =>
                  updateFounderField("milestoneTitle", event.target.value)
                }
                disabled={controlsDisabled}
                className={inputClassName}
                placeholder="Marketing Hub AI drafts"
              />
            </label>

            <label className="block text-xs">
              <span className="font-medium text-slate-700">Milestone type</span>
              <select
                value={founderInput.milestoneType}
                onChange={(event) =>
                  updateFounderField(
                    "milestoneType",
                    event.target.value as MarketingFounderMilestoneType,
                  )
                }
                disabled={controlsDisabled}
                className={inputClassName}
              >
                {MARKETING_FOUNDER_MILESTONE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs">
              <span className="font-medium text-slate-700">Channel target</span>
              <select
                value={founderInput.channelTarget}
                onChange={(event) =>
                  updateFounderField(
                    "channelTarget",
                    event.target.value as MarketingChannel,
                  )
                }
                disabled={controlsDisabled}
                className={inputClassName}
              >
                {CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs sm:col-span-2">
              <span className="font-medium text-slate-700">What changed</span>
              <textarea
                value={founderInput.whatChanged}
                onChange={(event) =>
                  updateFounderField("whatChanged", event.target.value)
                }
                rows={3}
                disabled={controlsDisabled}
                className={`${inputClassName} min-h-[4.5rem] resize-y`}
                placeholder="What shipped, improved, or moved forward this week?"
              />
            </label>

            <label className="block text-xs sm:col-span-2">
              <span className="font-medium text-slate-700">Why it matters</span>
              <textarea
                value={founderInput.whyItMatters}
                onChange={(event) =>
                  updateFounderField("whyItMatters", event.target.value)
                }
                rows={3}
                disabled={controlsDisabled}
                className={`${inputClassName} min-h-[4.5rem] resize-y`}
                placeholder="Why should a contractor care about this update?"
              />
            </label>

            <label className="block text-xs sm:col-span-2">
              <span className="font-medium text-slate-700">Target audience</span>
              <input
                value={founderInput.targetAudience}
                onChange={(event) =>
                  updateFounderField("targetAudience", event.target.value)
                }
                disabled={controlsDisabled}
                className={inputClassName}
              />
            </label>

            <label className="block text-xs sm:col-span-2">
              <span className="font-medium text-slate-700">Call to action</span>
              <input
                value={founderInput.callToAction}
                onChange={(event) =>
                  updateFounderField("callToAction", event.target.value)
                }
                disabled={controlsDisabled}
                className={inputClassName}
              />
            </label>

            <label className="block text-xs sm:col-span-2">
              <span className="font-medium text-slate-700">Tone</span>
              <input
                value={founderInput.tone}
                onChange={(event) =>
                  updateFounderField("tone", event.target.value)
                }
                disabled={controlsDisabled}
                className={inputClassName}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {isPending ? (
              <p
                className="text-xs text-amber-800"
                aria-live="polite"
                role="status"
              >
                Altair is drafting your founder post…
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Nothing is saved until you click Save draft.
              </p>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={controlsDisabled}
              aria-busy={isPending}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-2 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:px-2.5 sm:py-1.5"
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
        </>
      ) : null}

      {showPreview && previewDraft ? (
        <div className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-950">
              Suggested draft
            </p>
            <p className="mt-0.5 text-xs text-amber-900/70">
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
              className="inline-flex min-h-9 items-center rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use this draft
            </button>
            <button
              type="button"
              onClick={handleTryAgain}
              disabled={disabled || isPending}
              className="inline-flex min-h-9 items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-amber-50/60 px-2.5 py-2">
          <p className="text-xs text-amber-900" aria-live="polite">
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
