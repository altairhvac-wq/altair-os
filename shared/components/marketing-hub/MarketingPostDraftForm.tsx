"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import {
  archiveMarketingPostAction,
  createMarketingPostAction,
  markMarketingPostPostedAction,
  updateMarketingPostAction,
} from "@/app/actions/marketing-posts";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  MarketingCompletedJobDraftStarter,
  MarketingPostDraftStarter,
} from "@/shared/components/marketing-hub/marketing-post-templates";
import { MarketingPostAiAssistant } from "@/shared/components/marketing-hub/MarketingPostAiAssistant";
import type {
  MarketingChannel,
  MarketingPost,
  MarketingPostSource,
} from "@/shared/types/marketing-post";
import {
  formatMarketingChannel,
  formatMarketingPostStatus,
} from "@/shared/types/marketing-post";

type MarketingPostDraftFormProps = {
  mode?: "create" | "edit";
  post?: MarketingPost;
  draftStarter?: MarketingPostDraftStarter | MarketingCompletedJobDraftStarter;
  aiFeaturesEnabled?: boolean;
  aiDraftingConfigured?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

type DraftFormData = {
  title: string;
  channelTarget: MarketingChannel;
  postText: string;
  suggestedHashtags: string;
  callToAction: string;
  scheduledAtLocal: string;
};

const DEFAULT_FORM_DATA: DraftFormData = {
  title: "",
  channelTarget: "general",
  postText: "",
  suggestedHashtags: "",
  callToAction: "",
  scheduledAtLocal: "",
};

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function scheduledAtLocalToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

const CHANNEL_OPTIONS: { value: MarketingChannel; label: string }[] = [
  { value: "general", label: "General" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google_business", label: "Google Business" },
  { value: "website", label: "Website" },
];

const PREVIEW_GUIDANCE = [
  "Write like a local business.",
  "Avoid customer names or exact addresses.",
  "Keep it short enough to copy and paste into Facebook, Instagram, or Google.",
];

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
    scheduledAtLocal: post.scheduledAt ? toDatetimeLocal(post.scheduledAt) : "",
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

function getCreateSourceFromDraftStarter(
  draftStarter?: MarketingPostDraftStarter | MarketingCompletedJobDraftStarter,
): { sourceType: MarketingPostSource; sourceId?: string } {
  if (
    draftStarter &&
    "sourceType" in draftStarter &&
    draftStarter.sourceType === "completed_job" &&
    draftStarter.sourceId
  ) {
    return {
      sourceType: "completed_job",
      sourceId: draftStarter.sourceId,
    };
  }

  return { sourceType: "manual" };
}

function draftStarterToFormData(
  draftStarter: MarketingPostDraftStarter | MarketingCompletedJobDraftStarter,
): DraftFormData {
  return {
    title: draftStarter.title,
    channelTarget: draftStarter.channelTarget,
    postText: draftStarter.postText,
    suggestedHashtags: draftStarter.suggestedHashtags,
    callToAction: draftStarter.callToAction,
    scheduledAtLocal: "",
  };
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

type PostPreviewPanelProps = {
  formData: DraftFormData;
  northStar: boolean;
};

function PostPreviewPanel({ formData, northStar }: PostPreviewPanelProps) {
  const previewText = buildMarketingPostCopyText(formData);
  const hasPreview = previewText.length > 0;

  return (
    <aside
      className={`flex flex-col gap-4 rounded-xl border p-4 sm:p-5 ${
        northStar
          ? "border-[rgba(148,163,184,0.22)] bg-[#FAF6EE]/80"
          : "border-slate-200/90 bg-slate-50/70"
      }`}
    >
      <div>
        <h3
          className={`text-sm font-semibold ${
            northStar ? "text-[#17130E]" : "text-slate-900"
          }`}
        >
          Post preview
        </h3>
        <p
          className={`mt-1 text-xs leading-relaxed ${
            northStar ? "text-[#6B6255]" : "text-slate-500"
          }`}
        >
          {formatMarketingChannel(formData.channelTarget)}
        </p>
      </div>

      <div
        className={`min-h-[10rem] flex-1 rounded-lg border px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          northStar
            ? "border-[rgba(148,163,184,0.18)] bg-white text-[#17130E]"
            : "border-slate-200/80 bg-white text-slate-800"
        }`}
      >
        {hasPreview ? (
          previewText
        ) : (
          <p
            className={`text-sm italic ${
              northStar ? "text-[#8A7F72]" : "text-slate-400"
            }`}
          >
            Your final post preview will appear here as you write.
          </p>
        )}
      </div>

      <ul
        className={`space-y-2 border-t pt-4 text-xs leading-relaxed ${
          northStar
            ? "border-[rgba(148,163,184,0.18)] text-[#6B6255]"
            : "border-slate-200/80 text-slate-500"
        }`}
      >
        {PREVIEW_GUIDANCE.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden="true" className="shrink-0 text-[#B88A2E]">
              •
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function MarketingPostDraftForm({
  mode = "create",
  post,
  draftStarter,
  aiFeaturesEnabled = false,
  aiDraftingConfigured = false,
  onSuccess,
  onCancel,
}: MarketingPostDraftFormProps) {
  const northStar = isNorthStarShellEnabled();
  const timeZone = useCompanyTimezone();
  const isEditMode = mode === "edit" && post != null;
  const [createSource] = useState(() =>
    getCreateSourceFromDraftStarter(draftStarter),
  );
  const [formData, setFormData] = useState<DraftFormData>(() => {
    if (isEditMode) {
      return postToFormData(post);
    }

    if (draftStarter) {
      return draftStarterToFormData(draftStarter);
    }

    return DEFAULT_FORM_DATA;
  });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isMarkPostedPending, startMarkPostedTransition] = useTransition();
  const [isArchivePending, startArchiveTransition] = useTransition();
  const isActionPending = isPending || isMarkPostedPending || isArchivePending;
  const isReadOnly =
    isEditMode && (post.status === "posted" || post.status === "archived");
  const canMarkPosted =
    isEditMode && post.status !== "posted" && post.status !== "archived";
  const canArchive = isEditMode && post.status !== "archived";
  const rewriteSourceType = isEditMode
    ? post.sourceType
    : createSource.sourceType;
  const rewriteSourceId = isEditMode
    ? post.sourceId ?? null
    : createSource.sourceId ?? null;

  const inputClassName = northStar
    ? "mt-1.5 w-full rounded-lg border border-[rgba(148,163,184,0.24)] bg-white px-3.5 py-2.5 text-sm text-[#101827] shadow-sm transition-colors placeholder:text-[#6B7280] focus:border-[#B88A2E] focus:outline-none focus:ring-2 focus:ring-[rgba(201,164,77,0.22)]"
    : "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/80";

  const cardClassName = northStar
    ? "overflow-hidden rounded-[1.25rem] border border-[rgba(148,163,184,0.22)] bg-[#FFFBF5] shadow-[0_8px_30px_rgba(138,99,36,0.08)] ring-1 ring-[rgba(100,116,139,0.12)]"
    : "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-card)]";

  function updateField<K extends keyof DraftFormData>(
    field: K,
    value: DraftFormData[K],
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isActionPending || isReadOnly) {
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
        scheduledAt: scheduledAtLocalToIso(formData.scheduledAtLocal),
      };

      const result = isEditMode
        ? await updateMarketingPostAction(post.id, payload)
        : await createMarketingPostAction({
            ...payload,
            status: "draft",
            sourceType: createSource.sourceType,
            sourceId: createSource.sourceId ?? null,
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
    if (isActionPending) {
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
    if (!isEditMode || isActionPending) {
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

  function handleArchive() {
    if (!isEditMode || isActionPending) {
      return;
    }

    const confirmed = window.confirm(`Archive "${post.title}"?`);
    if (!confirmed) {
      return;
    }

    startArchiveTransition(async () => {
      setError(null);

      const result = await archiveMarketingPostAction(post.id);
      if (result.error || !result.post) {
        setError(
          formatActionError(
            result.error,
            "We couldn't archive this post. Try again.",
          ),
        );
        return;
      }

      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[1040px]">
      <div className={cardClassName}>
        <header
          className={`border-b px-5 py-5 sm:px-7 sm:py-6 ${
            northStar
              ? "border-[rgba(148,163,184,0.18)] bg-[#FAF6EE]/50"
              : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <h2
            className={`text-lg font-bold tracking-tight sm:text-xl ${
              northStar ? "text-[#17130E]" : "text-slate-900"
            }`}
          >
            {isEditMode ? "Edit post draft" : "New post draft"}
          </h2>
          <p
            className={`mt-1.5 max-w-2xl text-sm leading-relaxed ${
              northStar ? "text-[#6B6255]" : "text-slate-500"
            }`}
          >
            {isEditMode
              ? isReadOnly
                ? post.status === "archived"
                  ? "This post is archived and can't be edited. Copy the text if you still need it."
                  : "This post is posted and can't be edited here. Copy the text if you still need it."
                : "Update the draft, preview how it reads, then copy or mark it posted manually when ready."
              : draftStarter
                ? "This draft starter prefills the form. Edit anything you need, then save when ready."
                : "Write the post copy your team can copy and post manually."}
          </p>

          {isEditMode ? (
            <div
              className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${
                northStar ? "text-[#6B6255]" : "text-slate-500"
              }`}
            >
              <span>
                Status:{" "}
                <span
                  className={`font-medium ${
                    northStar ? "text-[#17130E]" : "text-slate-700"
                  }`}
                >
                  {formatMarketingPostStatus(post.status)}
                </span>
              </span>
              <span>
                Channel:{" "}
                <span
                  className={`font-medium ${
                    northStar ? "text-[#17130E]" : "text-slate-700"
                  }`}
                >
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
        </header>

        <div className="grid gap-8 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
          <div className="space-y-5">
            <label className="block text-sm">
              <span
                className={`font-medium ${
                  northStar ? "text-[#17130E]" : "text-slate-700"
                }`}
              >
                Title
              </span>
              <input
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
                autoComplete="off"
                disabled={isReadOnly}
                className={inputClassName}
                placeholder="Spring tune-up reminder"
              />
            </label>

            <label className="block text-sm">
              <span
                className={`font-medium ${
                  northStar ? "text-[#17130E]" : "text-slate-700"
                }`}
              >
                Channel
              </span>
              <select
                value={formData.channelTarget}
                onChange={(event) =>
                  updateField(
                    "channelTarget",
                    event.target.value as MarketingChannel,
                  )
                }
                disabled={isReadOnly}
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
              <span
                className={`font-medium ${
                  northStar ? "text-[#17130E]" : "text-slate-700"
                }`}
              >
                Post text
              </span>
              <textarea
                value={formData.postText}
                onChange={(event) => updateField("postText", event.target.value)}
                rows={10}
                disabled={isReadOnly}
                className={`${inputClassName} min-h-[12rem] resize-y`}
                placeholder="Write the post copy your team can copy and post manually."
              />
              {!isReadOnly ? (
                <MarketingPostAiAssistant
                  title={formData.title}
                  postText={formData.postText}
                  channelTarget={formData.channelTarget}
                  callToAction={formData.callToAction}
                  suggestedHashtags={normalizeSuggestedHashtagsInput(
                    formData.suggestedHashtags,
                  )}
                  sourceType={rewriteSourceType}
                  sourceId={rewriteSourceId}
                  aiFeaturesEnabled={aiFeaturesEnabled}
                  aiDraftingConfigured={aiDraftingConfigured}
                  disabled={isActionPending}
                  onApplyDraftText={(text) => updateField("postText", text)}
                />
              ) : null}
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm">
                <span
                  className={`font-medium ${
                    northStar ? "text-[#17130E]" : "text-slate-700"
                  }`}
                >
                  Suggested hashtags{" "}
                  <span
                    className={`font-normal ${
                      northStar ? "text-[#8A7F72]" : "text-slate-400"
                    }`}
                  >
                    (optional)
                  </span>
                </span>
                <input
                  value={formData.suggestedHashtags}
                  onChange={(event) =>
                    updateField("suggestedHashtags", event.target.value)
                  }
                  autoComplete="off"
                  disabled={isReadOnly}
                  className={inputClassName}
                  placeholder="#hvac, localbusiness springready"
                />
              </label>

              <label className="block text-sm">
                <span
                  className={`font-medium ${
                    northStar ? "text-[#17130E]" : "text-slate-700"
                  }`}
                >
                  Call to action{" "}
                  <span
                    className={`font-normal ${
                      northStar ? "text-[#8A7F72]" : "text-slate-400"
                    }`}
                  >
                    (optional)
                  </span>
                </span>
                <input
                  value={formData.callToAction}
                  onChange={(event) =>
                    updateField("callToAction", event.target.value)
                  }
                  autoComplete="off"
                  disabled={isReadOnly}
                  className={inputClassName}
                  placeholder="Book your tune-up today"
                />
              </label>
            </div>

            {!isReadOnly ? (
              <label className="block text-sm">
                <span
                  className={`font-medium ${
                    northStar ? "text-[#17130E]" : "text-slate-700"
                  }`}
                >
                  Planned post date/time{" "}
                  <span
                    className={`font-normal ${
                      northStar ? "text-[#8A7F72]" : "text-slate-400"
                    }`}
                  >
                    (optional)
                  </span>
                </span>
                <input
                  type="datetime-local"
                  value={formData.scheduledAtLocal}
                  onChange={(event) =>
                    updateField("scheduledAtLocal", event.target.value)
                  }
                  disabled={isReadOnly}
                  className={inputClassName}
                />
                <p
                  className={`mt-1.5 text-xs leading-relaxed ${
                    northStar ? "text-[#6B6255]" : "text-slate-500"
                  }`}
                >
                  Altair does not post automatically. Use this to plan when
                  your team should copy and post manually.
                </p>
              </label>
            ) : isEditMode && post.scheduledAt ? (
              <div className="block text-sm">
                <span
                  className={`font-medium ${
                    northStar ? "text-[#17130E]" : "text-slate-700"
                  }`}
                >
                  Planned post date/time
                </span>
                <p
                  className={`mt-1.5 text-sm ${
                    northStar ? "text-[#17130E]" : "text-slate-800"
                  }`}
                >
                  {formatDateTimeInTimeZone(post.scheduledAt, timeZone, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <div
              className={`flex flex-col gap-3 border-t pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${
                northStar ? "border-[rgba(148,163,184,0.18)]" : "border-slate-100"
              }`}
            >
              <div className="flex flex-wrap gap-2">
                {!isReadOnly ? (
                  <button
                    type="submit"
                    disabled={isActionPending}
                    className="admin-btn-primary"
                  >
                    {isPending
                      ? "Saving..."
                      : isEditMode
                        ? "Save changes"
                        : "Save draft"}
                  </button>
                ) : null}
                {isEditMode ? (
                  <>
                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={handleCopyPost}
                      aria-label={copied ? "Post copied" : "Copy post"}
                      className="admin-btn-secondary inline-flex items-center gap-1.5"
                    >
                      {copied ? (
                        <Check
                          className="h-3.5 w-3.5 text-emerald-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {copied ? "Copied" : "Copy post"}
                    </button>
                    {canMarkPosted ? (
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={handleMarkPosted}
                        className="admin-btn-secondary"
                      >
                        {isMarkPostedPending
                          ? "Marking posted..."
                          : "Mark posted manually"}
                      </button>
                    ) : null}
                    {canArchive ? (
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={handleArchive}
                        className="admin-btn-secondary border-rose-200 text-rose-800 hover:border-rose-300 hover:bg-rose-50"
                      >
                        {isArchivePending ? "Archiving..." : "Archive"}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isActionPending}
                onClick={onCancel}
                className="admin-btn-secondary sm:shrink-0"
              >
                {isEditMode ? "Close" : "Cancel"}
              </button>
            </div>
          </div>

          <PostPreviewPanel formData={formData} northStar={northStar} />
        </div>
      </div>
    </form>
  );
}
