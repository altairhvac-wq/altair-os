"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import {
  createMarketingPostAction,
  markMarketingPostPostedAction,
  updateMarketingPostAction,
} from "@/app/actions/marketing-posts";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { MarketingChannel, MarketingPost } from "@/shared/types/marketing-post";
import {
  formatMarketingChannel,
  formatMarketingPostStatus,
} from "@/shared/types/marketing-post";

type MarketingPostDraftFormProps = {
  mode?: "create" | "edit";
  post?: MarketingPost;
  onSuccess: () => void;
  onCancel: () => void;
};

type DraftFormData = {
  title: string;
  channelTarget: MarketingChannel;
  postText: string;
  suggestedHashtags: string;
  callToAction: string;
};

const DEFAULT_FORM_DATA: DraftFormData = {
  title: "",
  channelTarget: "general",
  postText: "",
  suggestedHashtags: "",
  callToAction: "",
};

const CHANNEL_OPTIONS: { value: MarketingChannel; label: string }[] = [
  { value: "general", label: "General" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google_business", label: "Google Business" },
  { value: "website", label: "Website" },
];

const inputClassName =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";

function normalizeSuggestedHashtagsInput(value: string): string[] {
  const normalized = value
    .split(/[\s,]+/)
    .map((item) => item.trim().replace(/^#+/, ""))
    .filter((item) => item.length > 0);

  return [...new Set(normalized)];
}

function formatSuggestedHashtagsForInput(hashtags: string[]): string {
  return hashtags.map((tag) => `#${tag}`).join(" ");
}

function postToFormData(post: MarketingPost): DraftFormData {
  return {
    title: post.title,
    channelTarget: post.channelTarget,
    postText: post.postText,
    suggestedHashtags: formatSuggestedHashtagsForInput(post.suggestedHashtags),
    callToAction: post.callToAction ?? "",
  };
}

function buildMarketingPostCopyText(data: DraftFormData): string {
  const parts: string[] = [];

  const postText = data.postText.trim();
  if (postText) {
    parts.push(postText);
  }

  const callToAction = data.callToAction.trim();
  if (callToAction) {
    parts.push(callToAction);
  }

  const hashtags = normalizeSuggestedHashtagsInput(data.suggestedHashtags);
  if (hashtags.length > 0) {
    parts.push(formatSuggestedHashtagsForInput(hashtags));
  }

  return parts.join("\n\n");
}

function validateDraftFormData(data: DraftFormData): string | null {
  if (!data.title.trim()) {
    return "Add a post title.";
  }

  if (!data.postText.trim()) {
    return "Add post text.";
  }

  if (!data.channelTarget) {
    return "Choose a marketing channel.";
  }

  return null;
}

export function MarketingPostDraftForm({
  mode = "create",
  post,
  onSuccess,
  onCancel,
}: MarketingPostDraftFormProps) {
  const timeZone = useCompanyTimezone();
  const isEditMode = mode === "edit" && post != null;
  const [formData, setFormData] = useState<DraftFormData>(() =>
    isEditMode ? postToFormData(post) : DEFAULT_FORM_DATA,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isMarkPostedPending, startMarkPostedTransition] = useTransition();
  const canMarkPosted =
    isEditMode && post.status !== "posted" && post.status !== "archived";

  function updateField<K extends keyof DraftFormData>(
    field: K,
    value: DraftFormData[K],
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setError(null);

    const validationError = validateDraftFormData(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const payload = {
        title: formData.title.trim(),
        channelTarget: formData.channelTarget,
        postText: formData.postText.trim(),
        suggestedHashtags: normalizeSuggestedHashtagsInput(
          formData.suggestedHashtags,
        ),
        callToAction: formData.callToAction.trim() || null,
      };

      const result = isEditMode
        ? await updateMarketingPostAction(post.id, payload)
        : await createMarketingPostAction({
            ...payload,
            status: "draft",
            sourceType: "manual",
          });

      if (result.error || !result.post) {
        setError(
          formatActionError(
            result.error,
            isEditMode
              ? "We couldn't save marketing post changes. Try again."
              : "We couldn't create this marketing post. Try again.",
          ),
        );
        return;
      }

      onSuccess();
    });
  }

  async function handleCopyPost() {
    if (isPending || isMarkPostedPending) {
      return;
    }

    const copyText = buildMarketingPostCopyText(formData);
    if (!copyText) {
      setError("Add post text before copying.");
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setError(null);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Could not copy to clipboard. Select the text and copy manually.",
      );
    }
  }

  function handleMarkPosted() {
    if (!isEditMode || isPending || isMarkPostedPending) {
      return;
    }

    startMarkPostedTransition(async () => {
      setError(null);

      const result = await markMarketingPostPostedAction(post.id);
      if (result.error || !result.post) {
        setError(
          formatActionError(
            result.error,
            "We couldn't mark this post as posted. Try again.",
          ),
        );
        return;
      }

      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          {isEditMode ? "Edit post draft" : "New post draft"}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {isEditMode
            ? "Update the draft before posting."
            : "Create a draft you can refine before posting."}
        </p>
      </div>

      {isEditMode ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            Status:{" "}
            <span className="font-medium text-slate-700">
              {formatMarketingPostStatus(post.status)}
            </span>
          </span>
          <span>
            Channel:{" "}
            <span className="font-medium text-slate-700">
              {formatMarketingChannel(post.channelTarget)}
            </span>
          </span>
          <span>
            Updated{" "}
            {formatDateTimeInTimeZone(post.updatedAt, timeZone, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title</span>
        <input
          value={formData.title}
          onChange={(event) => updateField("title", event.target.value)}
          autoComplete="off"
          className={inputClassName}
          placeholder="Spring tune-up reminder"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Channel</span>
        <select
          value={formData.channelTarget}
          onChange={(event) =>
            updateField("channelTarget", event.target.value as MarketingChannel)
          }
          className={inputClassName}
        >
          {CHANNEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Post text</span>
        <textarea
          value={formData.postText}
          onChange={(event) => updateField("postText", event.target.value)}
          rows={6}
          className={inputClassName}
          placeholder="Write the post copy your team can publish."
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">
          Suggested hashtags{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <input
          value={formData.suggestedHashtags}
          onChange={(event) =>
            updateField("suggestedHashtags", event.target.value)
          }
          autoComplete="off"
          className={inputClassName}
          placeholder="#hvac, localbusiness springready"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">
          Call to action{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <input
          value={formData.callToAction}
          onChange={(event) => updateField("callToAction", event.target.value)}
          autoComplete="off"
          className={inputClassName}
          placeholder="Book your tune-up today"
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || isMarkPostedPending}
          className="admin-btn-primary"
        >
          {isPending ? "Saving..." : isEditMode ? "Save changes" : "Save draft"}
        </button>
        {isEditMode ? (
          <>
            <button
              type="button"
              disabled={isPending || isMarkPostedPending}
              onClick={handleCopyPost}
              aria-label={copied ? "Post copied" : "Copy post"}
              className="admin-btn-secondary inline-flex items-center gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy post"}
            </button>
            {canMarkPosted ? (
              <button
                type="button"
                disabled={isPending || isMarkPostedPending}
                onClick={handleMarkPosted}
                className="admin-btn-secondary"
              >
                {isMarkPostedPending ? "Marking posted..." : "Mark posted"}
              </button>
            ) : null}
          </>
        ) : null}
        <button
          type="button"
          disabled={isPending || isMarkPostedPending}
          onClick={onCancel}
          className="admin-btn-secondary"
        >
          {isEditMode ? "Close" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
