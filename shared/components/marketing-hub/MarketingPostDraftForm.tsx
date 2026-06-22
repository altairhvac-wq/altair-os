"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Check, Copy } from "lucide-react";
import {
  archiveMarketingPostAction,
  createMarketingPostAction,
  createRecurringMarketingPostsAction,
  deleteMarketingPostAction,
  duplicateMarketingPostAction,
  markMarketingPostPostedAction,
  updateMarketingPostAction,
} from "@/app/actions/marketing-posts";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  MarketingCompletedJobDraftStarter,
  MarketingFounderDraftStarter,
  MarketingPostDraftStarter,
} from "@/shared/components/marketing-hub/marketing-post-templates";
import { MarketingCompletedJobDraftAiGenerator } from "@/shared/components/marketing-hub/MarketingCompletedJobDraftAiGenerator";
import { MarketingFounderDraftAiGenerator } from "@/shared/components/marketing-hub/MarketingFounderDraftAiGenerator";
import { MarketingPostAiAssistant } from "@/shared/components/marketing-hub/MarketingPostAiAssistant";
import {
  FOUNDER_MARKETING_SCREENSHOT_OPTIONS,
  isPreviewableScreenshotReference,
} from "@/shared/components/marketing-hub/founder-marketing-screenshots";
import type {
  MarketingChannel,
  MarketingPost,
  MarketingPostSource,
  MarketingRecurringFrequency,
  MarketingRecurringOccurrences,
} from "@/shared/types/marketing-post";
import {
  formatMarketingChannel,
  formatMarketingPostStatus,
  MARKETING_RECURRING_FREQUENCY_LABEL_OPTIONS,
  MARKETING_RECURRING_OCCURRENCE_OPTIONS,
} from "@/shared/types/marketing-post";

type MarketingPostDraftFormProps = {
  mode?: "create" | "edit";
  post?: MarketingPost;
  draftStarter?:
    | MarketingPostDraftStarter
    | MarketingCompletedJobDraftStarter
    | MarketingFounderDraftStarter;
  aiFeaturesEnabled?: boolean;
  aiDraftingConfigured?: boolean;
  showFounderMarketing?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  onRecurringCreated?: () => void;
};

type RecurringFormData = {
  startAtLocal: string;
  frequency: MarketingRecurringFrequency;
  occurrences: MarketingRecurringOccurrences;
};

const DEFAULT_RECURRING_FORM: RecurringFormData = {
  startAtLocal: "",
  frequency: "weekly",
  occurrences: 4,
};

type DraftFormData = {
  title: string;
  channelTarget: MarketingChannel;
  postText: string;
  suggestedHashtags: string;
  callToAction: string;
  scheduledAtLocal: string;
  founderScreenshotReference: string;
};

const DEFAULT_FORM_DATA: DraftFormData = {
  title: "",
  channelTarget: "general",
  postText: "",
  suggestedHashtags: "",
  callToAction: "",
  scheduledAtLocal: "",
  founderScreenshotReference: "",
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
    founderScreenshotReference: post.founderScreenshotReference ?? "",
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
  draftStarter?:
    | MarketingPostDraftStarter
    | MarketingCompletedJobDraftStarter
    | MarketingFounderDraftStarter,
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

  if (
    draftStarter &&
    "sourceType" in draftStarter &&
    (draftStarter.sourceType === "founder_milestone" ||
      draftStarter.sourceType === "product_update")
  ) {
    return {
      sourceType: draftStarter.sourceType,
    };
  }

  return { sourceType: "manual" };
}

function draftStarterToFormData(
  draftStarter:
    | MarketingPostDraftStarter
    | MarketingCompletedJobDraftStarter
    | MarketingFounderDraftStarter,
): DraftFormData {
  return {
    title: draftStarter.title,
    channelTarget: draftStarter.channelTarget,
    postText: draftStarter.postText,
    suggestedHashtags: draftStarter.suggestedHashtags,
    callToAction: draftStarter.callToAction,
    scheduledAtLocal: "",
    founderScreenshotReference: "",
  };
}

function isFounderMarketingSourceType(
  sourceType: MarketingPostSource,
): boolean {
  return (
    sourceType === "founder_milestone" || sourceType === "product_update"
  );
}

function isFounderDraftStarter(
  draftStarter:
    | MarketingPostDraftStarter
    | MarketingCompletedJobDraftStarter
    | MarketingFounderDraftStarter
    | undefined,
): draftStarter is MarketingFounderDraftStarter {
  return (
    draftStarter != null &&
    "sourceType" in draftStarter &&
    (draftStarter.sourceType === "founder_milestone" ||
      draftStarter.sourceType === "product_update") &&
    "milestoneType" in draftStarter
  );
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
  showFounderScreenshot?: boolean;
};

const FOUNDER_SCREENSHOT_MISSING_MESSAGE =
  "Screenshot file not found. Add the image to public/marketing/screenshots or choose a different reference.";

function buildFounderScreenshotAbsoluteUrl(reference: string): string {
  const trimmed = reference.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (typeof window === "undefined") {
    return trimmed;
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${window.location.origin}${path}`;
}

function getFounderScreenshotDownloadFilename(reference: string): string {
  const trimmed = reference.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const segment = url.pathname.split("/").filter(Boolean).pop();
      return segment || "founder-screenshot.png";
    } catch {
      return "founder-screenshot.png";
    }
  }

  const segment = trimmed.split("/").filter(Boolean).pop();
  return segment || "founder-screenshot.png";
}

function FounderScreenshotPreview({
  reference,
  northStar,
}: {
  reference: string;
  northStar: boolean;
}) {
  const trimmed = reference.trim();
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageUrlCopied, setImageUrlCopied] = useState(false);
  const [absoluteRawImageUrl, setAbsoluteRawImageUrl] = useState(() =>
    buildFounderScreenshotAbsoluteUrl(trimmed),
  );

  useEffect(() => {
    setImageLoadFailed(false);
    setImageUrlCopied(false);
    setAbsoluteRawImageUrl(buildFounderScreenshotAbsoluteUrl(trimmed));
  }, [trimmed]);

  if (!trimmed) {
    return null;
  }

  const previewable = isPreviewableScreenshotReference(trimmed);
  const showImagePreview = previewable && !imageLoadFailed;
  const downloadFilename = getFounderScreenshotDownloadFilename(trimmed);

  async function handleCopyImageUrl() {
    try {
      await navigator.clipboard.writeText(absoluteRawImageUrl);
      setImageUrlCopied(true);
      window.setTimeout(() => setImageUrlCopied(false), 2000);
    } catch {
      // Clipboard access can fail in restrictive browsers.
    }
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        northStar
          ? "border-[rgba(148,163,184,0.18)] bg-white"
          : "border-slate-200/80 bg-white"
      }`}
    >
      <p
        className={`text-xs font-medium ${
          northStar ? "text-[#6B6255]" : "text-slate-500"
        }`}
      >
        Founder screenshot
      </p>
      {showImagePreview ? (
        <div className="relative mt-2 aspect-square w-full overflow-hidden rounded-md border border-black/10 bg-[#0a1018]">
          <Image
            src={trimmed}
            alt="Founder marketing screenshot preview"
            fill
            className="object-contain"
            sizes="320px"
            unoptimized={trimmed.startsWith("http")}
            onError={() => setImageLoadFailed(true)}
          />
        </div>
      ) : null}
      {previewable && imageLoadFailed ? (
        <p
          className={`mt-2 text-xs leading-relaxed ${
            northStar ? "text-amber-800" : "text-amber-700"
          }`}
        >
          {FOUNDER_SCREENSHOT_MISSING_MESSAGE}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={absoluteRawImageUrl}
          target="_blank"
          rel="noreferrer"
          className="admin-btn-secondary inline-flex items-center text-xs"
        >
          Open full image
        </a>
        <a
          href={absoluteRawImageUrl}
          download={downloadFilename}
          className="admin-btn-secondary inline-flex items-center text-xs"
        >
          Download full image
        </a>
        <button
          type="button"
          onClick={handleCopyImageUrl}
          className="admin-btn-secondary inline-flex items-center gap-1.5 text-xs"
        >
          {imageUrlCopied ? (
            <Check
              className="h-3.5 w-3.5 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {imageUrlCopied ? "Copied URL" : "Copy image URL"}
        </button>
      </div>
      <p
        className={`mt-3 text-xs leading-relaxed ${
          northStar ? "text-[#6B6255]" : "text-slate-500"
        }`}
      >
        Selected original:{" "}
        <span
          className={`break-all font-mono ${
            northStar ? "text-[#17130E]" : "text-slate-700"
          }`}
        >
          {trimmed}
        </span>
      </p>
      <p
        className={`mt-2 text-xs leading-relaxed ${
          northStar ? "text-[#6B6255]" : "text-slate-500"
        }`}
      >
        Full image URL:{" "}
        <span
          className={`break-all font-mono ${
            northStar ? "text-[#17130E]" : "text-slate-700"
          }`}
        >
          {absoluteRawImageUrl}
        </span>
      </p>
      <p
        className={`mt-2 text-xs leading-relaxed ${
          northStar ? "text-[#6B6255]" : "text-slate-500"
        }`}
      >
        For Facebook, use Open full image or Download full image. Do not save
        the small in-app preview.
      </p>
    </div>
  );
}

function PostPreviewPanel({
  formData,
  northStar,
  showFounderScreenshot = false,
}: PostPreviewPanelProps) {
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

      {showFounderScreenshot &&
      formData.founderScreenshotReference.trim().length > 0 ? (
        <FounderScreenshotPreview
          reference={formData.founderScreenshotReference}
          northStar={northStar}
        />
      ) : null}

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
  showFounderMarketing = false,
  onSuccess,
  onCancel,
  onRecurringCreated,
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
  const [isReusePending, startReuseTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isRecurringPending, startRecurringTransition] = useTransition();
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringFormData, setRecurringFormData] =
    useState<RecurringFormData>(DEFAULT_RECURRING_FORM);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const isActionPending =
    isPending ||
    isMarkPostedPending ||
    isArchivePending ||
    isReusePending ||
    isDeletePending ||
    isRecurringPending;
  const isReadOnly =
    isEditMode && (post.status === "posted" || post.status === "archived");
  const canMarkPosted =
    isEditMode && post.status !== "posted" && post.status !== "archived";
  const canArchive = isEditMode && post.status !== "archived";
  const canReuse = isReadOnly;
  const canScheduleRecurring =
    isEditMode &&
    isReadOnly &&
    (post.deletedAt === null || post.deletedAt === undefined);
  const canDelete =
    isEditMode &&
    post.status === "archived" &&
    (post.deletedAt === null || post.deletedAt === undefined);
  const rewriteSourceType = isEditMode
    ? post.sourceType
    : createSource.sourceType;
  const rewriteSourceId = isEditMode
    ? post.sourceId ?? null
    : createSource.sourceId ?? null;
  const isCompletedJobCreate =
    !isEditMode &&
    draftStarter != null &&
    "sourceType" in draftStarter &&
    draftStarter.sourceType === "completed_job" &&
    Boolean(createSource.sourceId);
  const isFounderCreate =
    !isEditMode && showFounderMarketing && isFounderDraftStarter(draftStarter);
  const showFounderScreenshot =
    showFounderMarketing &&
    isFounderMarketingSourceType(rewriteSourceType);
  const selectedFounderScreenshotOption = FOUNDER_MARKETING_SCREENSHOT_OPTIONS.find(
    (option) => option.path === formData.founderScreenshotReference.trim(),
  );
  const founderScreenshotPath = formData.founderScreenshotReference.trim();
  const hasStaleFounderScreenshotPath =
    showFounderScreenshot &&
    founderScreenshotPath.length > 0 &&
    !selectedFounderScreenshotOption;

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

  function applyGeneratedDraft(draft: {
    title: string;
    channelTarget: MarketingChannel;
    postText: string;
    suggestedHashtags: string;
    callToAction: string;
  }) {
    setFormData((current) => ({
      title: draft.title,
      channelTarget: draft.channelTarget,
      postText: draft.postText,
      suggestedHashtags: draft.suggestedHashtags,
      callToAction: draft.callToAction,
      scheduledAtLocal: current.scheduledAtLocal,
      founderScreenshotReference: current.founderScreenshotReference,
    }));
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
        ...(showFounderScreenshot
          ? {
              founderScreenshotReference:
                formData.founderScreenshotReference.trim() || null,
            }
          : {}),
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

    const confirmMessage =
      post.status === "posted"
        ? "Move this post to archive? It will leave Posted and appear under Archived. The original record is kept."
        : "Move this post to archive?";
    const confirmed = window.confirm(confirmMessage);
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

  function handleReusePost() {
    if (!isEditMode || !canReuse || isActionPending) {
      return;
    }

    startReuseTransition(async () => {
      setError(null);

      const result = await duplicateMarketingPostAction(post.id);
      if (result.error || !result.post) {
        setError(
          formatActionError(
            result.error,
            "We couldn't create a copy of this post. Try again.",
          ),
        );
        return;
      }

      onSuccess();
    });
  }

  function handleOpenRecurringForm() {
    if (!canScheduleRecurring || isActionPending) {
      return;
    }

    setRecurringError(null);
    setRecurringFormData(DEFAULT_RECURRING_FORM);
    setShowRecurringForm(true);
  }

  function handleCloseRecurringForm() {
    if (isRecurringPending) {
      return;
    }

    setShowRecurringForm(false);
    setRecurringError(null);
    setRecurringFormData(DEFAULT_RECURRING_FORM);
  }

  function handleCreateRecurringCopies() {
    if (!isEditMode || !canScheduleRecurring || isActionPending) {
      return;
    }

    const startAt = scheduledAtLocalToIso(recurringFormData.startAtLocal);
    if (!startAt) {
      setRecurringError("Choose a start date and time.");
      return;
    }

    startRecurringTransition(async () => {
      setRecurringError(null);

      const result = await createRecurringMarketingPostsAction(post.id, {
        startAt,
        frequency: recurringFormData.frequency,
        occurrences: recurringFormData.occurrences,
      });

      if (result.error || !result.posts) {
        setRecurringError(
          formatActionError(
            result.error,
            "We couldn't schedule recurring copies of this post. Try again.",
          ),
        );
        return;
      }

      setShowRecurringForm(false);
      setRecurringFormData(DEFAULT_RECURRING_FORM);
      setRecurringError(null);

      if (onRecurringCreated) {
        onRecurringCreated();
      } else {
        onSuccess();
      }
    });
  }

  function handleDeletePost() {
    if (!isEditMode || !canDelete || isActionPending) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this marketing post? This removes it from Marketing Hub. This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    startDeleteTransition(async () => {
      setError(null);

      const result = await deleteMarketingPostAction(post.id);
      if (result.error || !result.post) {
        setError(
          formatActionError(
            result.error,
            "We couldn't delete this post. Try again.",
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
            {isEditMode
              ? isReadOnly
                ? "View post"
                : "Edit post draft"
              : "New post draft"}
          </h2>
          <p
            className={`mt-1.5 max-w-2xl text-sm leading-relaxed ${
              northStar ? "text-[#6B6255]" : "text-slate-500"
            }`}
          >
            {isEditMode
              ? isReadOnly
                ? post.status === "archived"
                  ? "This post is archived and can't be edited. Reuse it to create a new draft, or copy the text if you still need it."
                  : "This post is posted and can't be edited here. Reuse it to create a new draft, or copy the text if you still need it."
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
              {post.postedAt ? (
                <span>
                  Posted manually:{" "}
                  {formatDateTimeInTimeZone(post.postedAt, timeZone, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
              {post.archivedAt ? (
                <span>
                  Archived:{" "}
                  {formatDateTimeInTimeZone(post.archivedAt, timeZone, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="grid gap-8 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
          <div className="space-y-5">
            {isCompletedJobCreate && createSource.sourceId ? (
              <MarketingCompletedJobDraftAiGenerator
                sourceId={createSource.sourceId}
                channelTarget={formData.channelTarget}
                currentFormSnapshot={{
                  title: formData.title,
                  channelTarget: formData.channelTarget,
                  postText: formData.postText,
                  suggestedHashtags: formData.suggestedHashtags,
                  callToAction: formData.callToAction,
                }}
                aiFeaturesEnabled={aiFeaturesEnabled}
                aiDraftingConfigured={aiDraftingConfigured}
                disabled={isActionPending}
                onApplyDraft={applyGeneratedDraft}
              />
            ) : null}

            {isFounderCreate ? (
              <MarketingFounderDraftAiGenerator
                sourceType={draftStarter.sourceType}
                initialMilestoneType={draftStarter.milestoneType}
                initialMilestoneTitle={formData.title}
                initialChannelTarget={formData.channelTarget}
                currentFormSnapshot={{
                  title: formData.title,
                  channelTarget: formData.channelTarget,
                  postText: formData.postText,
                  suggestedHashtags: formData.suggestedHashtags,
                  callToAction: formData.callToAction,
                }}
                aiFeaturesEnabled={aiFeaturesEnabled}
                aiDraftingConfigured={aiDraftingConfigured}
                disabled={isActionPending}
                onApplyDraft={applyGeneratedDraft}
              />
            ) : null}

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

            {showFounderScreenshot ? (
              <div
                className={`rounded-xl border p-4 sm:p-5 ${
                  northStar
                    ? "border-[rgba(184,138,46,0.28)] bg-[#FAF6EE]/50"
                    : "border-amber-200/70 bg-amber-50/30"
                }`}
              >
                <label className="block text-sm">
                  <span
                    className={`font-medium ${
                      northStar ? "text-[#17130E]" : "text-slate-700"
                    }`}
                  >
                    Founder screenshot{" "}
                    <span
                      className={`font-normal ${
                        northStar ? "text-[#8A7F72]" : "text-slate-400"
                      }`}
                    >
                      (optional)
                    </span>
                  </span>
                  <select
                    value={
                      selectedFounderScreenshotOption?.path ??
                      formData.founderScreenshotReference.trim()
                    }
                    onChange={(event) => {
                      updateField(
                        "founderScreenshotReference",
                        event.target.value,
                      );
                    }}
                    disabled={isReadOnly}
                    className={inputClassName}
                  >
                    <option value="">
                      Choose a product screenshot (optional)
                    </option>
                    {FOUNDER_MARKETING_SCREENSHOT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.path}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={formData.founderScreenshotReference}
                    onChange={(event) =>
                      updateField(
                        "founderScreenshotReference",
                        event.target.value,
                      )
                    }
                    autoComplete="off"
                    disabled={isReadOnly}
                    className={`${inputClassName} mt-3`}
                    placeholder="/marketing/screenshots/marketing-dispatch.png"
                  />
                  <p
                    className={`mt-1.5 text-xs leading-relaxed ${
                      northStar ? "text-[#6B6255]" : "text-slate-500"
                    }`}
                  >
                    Add a product screenshot reference for the post. You can
                    copy this with the final post when sharing manually. Use a
                    social-ready screenshot where the app fills the image.
                    Full-page screenshots may look tiny on Facebook.
                  </p>
                  {founderScreenshotPath.length > 0 ? (
                    <p
                      className={`mt-2 break-all font-mono text-xs leading-relaxed ${
                        northStar ? "text-[#17130E]" : "text-slate-700"
                      }`}
                    >
                      Selected image: {founderScreenshotPath}
                    </p>
                  ) : null}
                  {hasStaleFounderScreenshotPath ? (
                    <p
                      className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
                        northStar
                          ? "border-amber-300/70 bg-amber-50 text-amber-900"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      This draft uses an older screenshot path. Reselect Reports
                      workspace or Leads workspace from the picker to use the
                      current Facebook-ready card.
                    </p>
                  ) : null}
                </label>
              </div>
            ) : null}

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

            {showRecurringForm && canScheduleRecurring ? (
              <div
                className={`rounded-xl border p-4 sm:p-5 ${
                  northStar
                    ? "border-[rgba(184,138,46,0.35)] bg-[#FAF6EE]/60"
                    : "border-amber-200/80 bg-amber-50/40"
                }`}
              >
                <h3
                  className={`text-sm font-semibold ${
                    northStar ? "text-[#17130E]" : "text-slate-900"
                  }`}
                >
                  Schedule recurring
                </h3>
                <p
                  className={`mt-1 text-xs leading-relaxed ${
                    northStar ? "text-[#6B6255]" : "text-slate-500"
                  }`}
                >
                  Altair will create scheduled copies for you to copy and post
                  manually. Nothing is posted automatically.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span
                      className={`font-medium ${
                        northStar ? "text-[#17130E]" : "text-slate-700"
                      }`}
                    >
                      Start date/time
                    </span>
                    <input
                      type="datetime-local"
                      required
                      value={recurringFormData.startAtLocal}
                      onChange={(event) =>
                        setRecurringFormData((current) => ({
                          ...current,
                          startAtLocal: event.target.value,
                        }))
                      }
                      disabled={isRecurringPending}
                      className={inputClassName}
                    />
                  </label>

                  <label className="block text-sm">
                    <span
                      className={`font-medium ${
                        northStar ? "text-[#17130E]" : "text-slate-700"
                      }`}
                    >
                      Frequency
                    </span>
                    <select
                      value={recurringFormData.frequency}
                      onChange={(event) =>
                        setRecurringFormData((current) => ({
                          ...current,
                          frequency: event.target
                            .value as MarketingRecurringFrequency,
                        }))
                      }
                      disabled={isRecurringPending}
                      className={inputClassName}
                    >
                      {MARKETING_RECURRING_FREQUENCY_LABEL_OPTIONS.map(
                        (option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span
                      className={`font-medium ${
                        northStar ? "text-[#17130E]" : "text-slate-700"
                      }`}
                    >
                      Number of posts
                    </span>
                    <select
                      value={recurringFormData.occurrences}
                      onChange={(event) =>
                        setRecurringFormData((current) => ({
                          ...current,
                          occurrences: Number(
                            event.target.value,
                          ) as MarketingRecurringOccurrences,
                        }))
                      }
                      disabled={isRecurringPending}
                      className={inputClassName}
                    >
                      {MARKETING_RECURRING_OCCURRENCE_OPTIONS.map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {recurringFormData.frequency === "monthly" ? (
                  <p
                    className={`mt-3 text-xs leading-relaxed ${
                      northStar ? "text-[#6B6255]" : "text-slate-500"
                    }`}
                  >
                    Monthly dates may adjust to the last day of shorter months.
                  </p>
                ) : null}

                {recurringError ? (
                  <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                    {recurringError}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isRecurringPending}
                    onClick={handleCreateRecurringCopies}
                    className="admin-btn-primary"
                  >
                    {isRecurringPending
                      ? "Creating scheduled copies..."
                      : "Create scheduled copies"}
                  </button>
                  <button
                    type="button"
                    disabled={isRecurringPending}
                    onClick={handleCloseRecurringForm}
                    className="admin-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
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
                    {showFounderScreenshot &&
                    formData.founderScreenshotReference.trim().length > 0 ? (
                      <p
                        className={`w-full text-xs leading-relaxed ${
                          northStar ? "text-[#6B6255]" : "text-slate-500"
                        }`}
                      >
                        Screenshot reference (copy separately):{" "}
                        <span
                          className={`break-all font-mono ${
                            northStar ? "text-[#17130E]" : "text-slate-700"
                          }`}
                        >
                          {formData.founderScreenshotReference.trim()}
                        </span>
                      </p>
                    ) : null}
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
                    {canReuse ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={isActionPending}
                          onClick={handleReusePost}
                          className="admin-btn-secondary"
                        >
                          {isReusePending ? "Creating copy..." : "Reuse post"}
                        </button>
                        <p
                          className={`text-xs leading-relaxed ${
                            northStar ? "text-[#6B6255]" : "text-slate-500"
                          }`}
                        >
                          Reuse creates a new editable copy. The original stays
                          unchanged.
                        </p>
                      </div>
                    ) : null}
                    {canScheduleRecurring ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={isActionPending || showRecurringForm}
                          onClick={handleOpenRecurringForm}
                          className="admin-btn-secondary border-[#B88A2E]/40 text-[#6B4E1A] hover:border-[#B88A2E]/60 hover:bg-[#FAF6EE]"
                        >
                          Schedule recurring
                        </button>
                        <p
                          className={`text-xs leading-relaxed ${
                            northStar ? "text-[#6B6255]" : "text-slate-500"
                          }`}
                        >
                          Create multiple scheduled copies for your manual
                          posting queue.
                        </p>
                      </div>
                    ) : null}
                    {canArchive ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={isActionPending}
                          onClick={handleArchive}
                          className="admin-btn-secondary border-rose-200 text-rose-800 hover:border-rose-300 hover:bg-rose-50"
                        >
                          {isArchivePending
                            ? "Moving to archive..."
                            : "Move to archive"}
                        </button>
                        <p
                          className={`text-xs leading-relaxed ${
                            northStar ? "text-[#6B6255]" : "text-slate-500"
                          }`}
                        >
                          Archive moves this post out of the main list but keeps
                          it for your records.
                        </p>
                      </div>
                    ) : null}
                    {canDelete ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={isActionPending}
                          onClick={handleDeletePost}
                          className="admin-btn-secondary border-rose-200 text-rose-800 hover:border-rose-300 hover:bg-rose-50"
                        >
                          {isDeletePending ? "Deleting..." : "Delete post"}
                        </button>
                        <p
                          className={`text-xs leading-relaxed ${
                            northStar ? "text-[#6B6255]" : "text-slate-500"
                          }`}
                        >
                          Delete is only available after a post has been
                          archived. This only removes the record from Altair. It
                          does not remove posts from external platforms.
                        </p>
                      </div>
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

          <PostPreviewPanel
            formData={formData}
            northStar={northStar}
            showFounderScreenshot={showFounderScreenshot}
          />
        </div>
      </div>
    </form>
  );
}
