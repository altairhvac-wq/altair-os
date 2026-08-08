"use client";

// Marketing AI HQ founder surface: approval queue, strategy, settings, runs.
// Architecture: docs/product/MARKETING_AI_HQ.md

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  PenLine,
  Send,
  Settings2,
  Share2,
  Sparkles,
  Video,
  XCircle,
} from "lucide-react";
import {
  convertMarketingItemToPostAction,
  publishMarketingItemToFacebookAction,
  reviewMarketingItemAction,
  runMarketingCopywriterBatchAction,
  runMarketingSeoBatchAction,
  runMarketingStrategistAction,
  runMarketingVideoBriefAction,
  saveMarketingBrandKitAction,
  saveMarketingHqConfigAction,
  updateMarketingItemFieldsAction,
} from "@/app/actions/marketing-ai-hq";
import {
  resolveMarketingPlatform,
} from "@/shared/types/marketing-channels";
import {
  ALTAIR_BRAND_KIT_SEED,
  ALTAIR_HQ_CONFIG_SEED,
} from "@/shared/components/marketing-hq/altair-hq-seed";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import {
  formatMarketingItemKind,
  formatMarketingItemStatus,
  formatMarketingObjective,
  type MarketingBrandKit,
  type MarketingHqConfig,
  type MarketingItem,
  type MarketingRun,
  type MarketingStrategyReportContent,
} from "@/shared/types/marketing-ai-hq";

type HqTab = "queue" | "strategy" | "distribution" | "settings" | "runs";

export type MarketingDistributionStatus = {
  encryptionConfigured: boolean;
  facebookConfigured: boolean;
  facebookPages: { id: string; name: string; hasInstagram: boolean }[];
};

type MarketingAiHqPageViewProps = {
  config: MarketingHqConfig;
  brandKit: MarketingBrandKit;
  hasConfig: boolean;
  items: MarketingItem[];
  runs: MarketingRun[];
  aiFeaturesEnabled: boolean;
  aiDraftingConfigured: boolean;
  distribution?: MarketingDistributionStatus;
};

type Flash = { tone: "success" | "error"; message: string } | null;

/** Safe fallback so a stale/partial render can never crash the page. */
const EMPTY_DISTRIBUTION: MarketingDistributionStatus = {
  encryptionConfigured: false,
  facebookConfigured: false,
  facebookPages: [],
};

const TABS: { id: HqTab; label: string }[] = [
  { id: "queue", label: "Approval queue" },
  { id: "strategy", label: "Strategy" },
  { id: "distribution", label: "Distribution" },
  { id: "settings", label: "Brand & goals" },
  { id: "runs", label: "Runs" },
];

function statusChipClass(status: MarketingItem["status"]): string {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80";
  }
  if (status === "rejected") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80";
  }
  if (status === "converted") {
    return "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/80";
  }
  return "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80";
}

function formatRunKey(runKey: string): string {
  if (runKey === "copywriter_batch") {
    return "Copywriter batch";
  }
  if (runKey === "strategist_weekly") {
    return "Weekly strategist";
  }
  if (runKey === "seo_batch") {
    return "SEO batch";
  }
  if (runKey === "video_brief") {
    return "Video brief";
  }
  return runKey;
}

function formatRunTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function listToLines(values: string[]): string {
  return values.join("\n");
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function commaToList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Export a video brief as an AltairDemoTool RawScript — the exact
 * `{ videoTitle, beats: [{ narration, directions }] }` shape the demo
 * engine's pipeline accepts as input (it compiles directions into concrete
 * capture steps itself). Run with:
 *   node dist/cli.js <file> --tts elevenlabs --capture playwright
 * Upload fields and the thumbnail idea stay here in the queue.
 */
function downloadVideoBriefJson(item: MarketingItem) {
  const content = item.content as {
    hook?: string;
    cta?: string;
    fields?: Record<string, string>;
    beats?: { narration: string; route: string; caption: string }[];
  };
  const briefBeats = Array.isArray(content.beats) ? content.beats : [];

  const videoTitle =
    (content.fields?.video_title ?? "").trim() || item.title;

  const beats: { narration: string; directions: string }[] = [];
  let previousRoute: string | null = null;

  const hook = (content.hook ?? "").trim();
  if (hook && briefBeats.length > 0) {
    beats.push({
      narration: hook,
      directions: `Navigate to ${briefBeats[0].route}.`,
    });
    previousRoute = briefBeats[0].route;
  }

  for (const beat of briefBeats) {
    beats.push({
      narration: beat.narration,
      directions:
        beat.route === previousRoute
          ? `Stay on ${beat.route}.`
          : `Navigate to ${beat.route}.`,
    });
    previousRoute = beat.route;
  }

  const cta = (content.cta ?? "").trim();
  if (cta && previousRoute) {
    beats.push({
      narration: cta,
      directions: `Stay on ${previousRoute}.`,
    });
  }

  const script = { videoTitle, beats };

  const blob = new Blob([JSON.stringify(script, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `demo-script-${item.id.slice(0, 8)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function MarketingAiHqPageView({
  config,
  brandKit,
  hasConfig,
  items,
  runs,
  aiFeaturesEnabled,
  aiDraftingConfigured,
  distribution = EMPTY_DISTRIBUTION,
}: MarketingAiHqPageViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<HqTab>(hasConfig ? "queue" : "settings");
  const [flash, setFlash] = useState<Flash>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingItems = useMemo(
    () => items.filter((item) => item.status === "draft"),
    [items],
  );
  const reviewedItems = useMemo(
    () => items.filter((item) => item.status !== "draft"),
    [items],
  );
  const latestStrategyReport = useMemo(() => {
    const reportItem = items.find((item) => item.kind === "strategy_report");
    if (!reportItem) {
      return null;
    }
    return {
      item: reportItem,
      content: reportItem.content as Partial<MarketingStrategyReportContent>,
    };
  }, [items]);

  const aiReady = aiFeaturesEnabled && aiDraftingConfigured;
  const facebookReady =
    distribution.encryptionConfigured &&
    distribution.facebookConfigured &&
    distribution.facebookPages.length > 0;

  function publishToFacebook(item: MarketingItem) {
    setFlash(null);
    setPendingItemId(item.id);
    startTransition(async () => {
      const result = await publishMarketingItemToFacebookAction(item.id);
      setPendingItemId(null);
      if (result.error) {
        setFlash({ tone: "error", message: result.error });
        return;
      }
      setFlash({
        tone: "success",
        message: result.permalinkUrl
          ? `Published to Facebook: ${result.permalinkUrl}`
          : "Published to Facebook.",
      });
      router.refresh();
    });
  }

  function runWithFlash(
    action: () => Promise<{ error?: string }>,
    successMessage: string,
    itemId?: string,
  ) {
    setFlash(null);
    if (itemId) {
      setPendingItemId(itemId);
    }
    startTransition(async () => {
      const result = await action();
      setPendingItemId(null);
      if (result.error) {
        setFlash({ tone: "error", message: result.error });
        return;
      }
      setFlash({ tone: "success", message: successMessage });
      router.refresh();
    });
  }

  return (
    <MasterListPageLayout
      title="Marketing AI HQ"
      subtitle="Founder-only command center. Everything the AI team produces waits here for your approval — nothing publishes on its own."
      density="compact"
      primaryAction={
        <a
          href="/marketing"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Marketing Hub
        </a>
      }
    >
      <MasterPageSurface variant="card" className={masterListPageSurfaceClass}>
        <div className={masterListPageScrollRegionClass}>
          <div className="shrink-0 border-b border-slate-100/90 bg-white px-3 py-2 sm:px-4">
            <div className={`${adminSegmentedControlClass} w-full sm:w-auto`}>
              {TABS.map((entry) => {
                const isActive = tab === entry.id;
                const count =
                  entry.id === "queue" ? pendingItems.length : null;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setTab(entry.id)}
                    className={`${adminSegmentedItemClass} sm:px-3 sm:py-1.5 ${
                      isActive ? adminSegmentedItemActiveClass : ""
                    }`}
                  >
                    <span>{entry.label}</span>
                    {count !== null && count > 0 ? (
                      <span className="ml-1.5 text-xs font-medium text-amber-700">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {flash ? (
            <div
              className={`mx-4 mt-3 rounded-lg px-3 py-2 text-sm ${
                flash.tone === "success"
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
                  : "bg-rose-50 text-rose-800 ring-1 ring-rose-200/80"
              }`}
              role="status"
            >
              {flash.message}
            </div>
          ) : null}

          {!aiReady ? (
            <div className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200/80">
              AI drafting is not configured (`AI_FEATURES_ENABLED` +
              `OPENAI_API_KEY`). You can set up brand and goals now; runs will
              work once AI is enabled.
            </div>
          ) : null}

          {tab === "queue" ? (
            <QueueTab
              pendingItems={pendingItems}
              reviewedItems={reviewedItems}
              hasConfig={hasConfig}
              aiReady={aiReady}
              isPending={isPending}
              pendingItemId={pendingItemId}
              onRunCopywriter={() =>
                runWithFlash(
                  runMarketingCopywriterBatchAction,
                  "Copywriter batch finished — new drafts are in the queue.",
                )
              }
              onRunSeo={() =>
                runWithFlash(
                  runMarketingSeoBatchAction,
                  "SEO batch finished — page and article drafts are in the queue.",
                )
              }
              onRunVideo={() =>
                runWithFlash(
                  runMarketingVideoBriefAction,
                  "Video brief drafted — it's in the queue for review.",
                )
              }
              facebookReady={facebookReady}
              onPublishFacebook={(item) => publishToFacebook(item)}
              onSaveFields={(item, fields) =>
                runWithFlash(
                  () => updateMarketingItemFieldsAction(item.id, fields),
                  "Edit saved.",
                  item.id,
                )
              }
              onApprove={(item) =>
                runWithFlash(
                  () => reviewMarketingItemAction(item.id, "approved"),
                  "Approved.",
                  item.id,
                )
              }
              onReject={(item) =>
                runWithFlash(
                  () => reviewMarketingItemAction(item.id, "rejected"),
                  "Rejected — the strategist sees this signal next run.",
                  item.id,
                )
              }
              onConvert={(item) =>
                runWithFlash(
                  () => convertMarketingItemToPostAction(item.id),
                  "Sent to the Marketing Hub as a draft.",
                  item.id,
                )
              }
              onGoToSettings={() => setTab("settings")}
            />
          ) : null}

          {tab === "distribution" ? (
            <DistributionTab distribution={distribution} />
          ) : null}

          {tab === "strategy" ? (
            <StrategyTab
              report={latestStrategyReport}
              hasConfig={hasConfig}
              aiReady={aiReady}
              isPending={isPending}
              onRunStrategist={() =>
                runWithFlash(
                  runMarketingStrategistAction,
                  "Strategist finished — the report is in the approval queue.",
                )
              }
            />
          ) : null}

          {tab === "settings" ? (
            <SettingsTab
              config={config}
              brandKit={brandKit}
              isPending={isPending}
              onSaveConfig={(input) =>
                runWithFlash(
                  () => saveMarketingHqConfigAction(input),
                  "HQ goals saved.",
                )
              }
              onSaveBrandKit={(input) =>
                runWithFlash(
                  () => saveMarketingBrandKitAction(input),
                  "Brand kit saved.",
                )
              }
            />
          ) : null}

          {tab === "runs" ? <RunsTab runs={runs} /> : null}
        </div>
      </MasterPageSurface>
    </MasterListPageLayout>
  );
}

type QueueTabProps = {
  pendingItems: MarketingItem[];
  reviewedItems: MarketingItem[];
  hasConfig: boolean;
  aiReady: boolean;
  isPending: boolean;
  pendingItemId: string | null;
  onRunCopywriter: () => void;
  onRunSeo: () => void;
  onRunVideo: () => void;
  facebookReady: boolean;
  onPublishFacebook: (item: MarketingItem) => void;
  onSaveFields: (item: MarketingItem, fields: Record<string, string>) => void;
  onApprove: (item: MarketingItem) => void;
  onReject: (item: MarketingItem) => void;
  onConvert: (item: MarketingItem) => void;
  onGoToSettings: () => void;
};

function QueueTab({
  pendingItems,
  reviewedItems,
  hasConfig,
  aiReady,
  isPending,
  pendingItemId,
  onRunCopywriter,
  onRunSeo,
  onRunVideo,
  facebookReady,
  onPublishFacebook,
  onSaveFields,
  onApprove,
  onReject,
  onConvert,
  onGoToSettings,
}: QueueTabProps) {
  return (
    <div className="space-y-6 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Waiting for your review
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Approve, reject, or send approved posts on to the Marketing Hub.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending || !hasConfig || !aiReady}
            onClick={onRunCopywriter}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && pendingItemId === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PenLine className="h-3.5 w-3.5" />
            )}
            Run copywriter batch
          </button>
          <button
            type="button"
            disabled={isPending || !hasConfig || !aiReady}
            onClick={onRunSeo}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" />
            Run SEO batch
          </button>
          <button
            type="button"
            disabled={isPending || !hasConfig || !aiReady}
            onClick={onRunVideo}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Video className="h-3.5 w-3.5" />
            Draft video brief
          </button>
        </div>
      </div>

      {!hasConfig ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
          <BrainCircuit className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            Set up the HQ first
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            The team needs your mission, audience, and goals before it can
            produce anything worth reviewing.
          </p>
          <button
            type="button"
            onClick={onGoToSettings}
            className="admin-btn-secondary mt-4 text-xs"
          >
            Open Brand &amp; goals
          </button>
        </div>
      ) : pendingItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
          <ClipboardList className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            Queue is clear
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Run a copywriter batch or wait for the scheduled runs to fill this
            up.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pendingItems.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              busy={isPending && pendingItemId === item.id}
              disabled={isPending}
              onSaveFields={(fields) => onSaveFields(item, fields)}
              onApprove={() => onApprove(item)}
              onReject={() => onReject(item)}
              onConvert={() => onConvert(item)}
            />
          ))}
        </ul>
      )}

      {reviewedItems.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recently reviewed
          </h3>
          <ul className="mt-2 space-y-2">
            {reviewedItems.slice(0, 15).map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatMarketingItemKind(item.kind)}
                    {item.channelHint ? ` · ${item.channelHint}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {item.status === "approved" &&
                  item.kind === "social_post" &&
                  facebookReady &&
                  resolveMarketingPlatform(item.channelHint).id ===
                    "facebook" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onPublishFacebook(item)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isPending && pendingItemId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Share2 className="h-3 w-3" />
                      )}
                      Publish to Facebook
                    </button>
                  ) : null}
                  {item.status === "approved" && item.kind === "social_post" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onConvert(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-50"
                    >
                      {isPending && pendingItemId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Send to Hub
                    </button>
                  ) : null}
                  {item.kind === "video_brief" ? (
                    <button
                      type="button"
                      onClick={() => downloadVideoBriefJson(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3 w-3" />
                      Export brief
                    </button>
                  ) : null}
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChipClass(item.status)}`}
                  >
                    {formatMarketingItemStatus(item.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type QueueItemCardProps = {
  item: MarketingItem;
  busy: boolean;
  disabled: boolean;
  onSaveFields: (fields: Record<string, string>) => void;
  onApprove: () => void;
  onReject: () => void;
  onConvert: () => void;
};

function QueueItemCard({
  item,
  busy,
  disabled,
  onSaveFields,
  onApprove,
  onReject,
}: QueueItemCardProps) {
  const [draftFields, setDraftFields] = useState<Record<string, string> | null>(
    null,
  );

  const rationale =
    typeof item.content.rationale === "string" ? item.content.rationale : "";
  const callToAction =
    typeof item.content.callToAction === "string"
      ? item.content.callToAction
      : "";
  const hashtags = Array.isArray(item.content.hashtags)
    ? (item.content.hashtags as unknown[]).filter(
        (tag): tag is string => typeof tag === "string",
      )
    : [];

  const spec = resolveMarketingPlatform(item.channelHint);
  const storedFields =
    item.content.fields &&
    typeof item.content.fields === "object" &&
    !Array.isArray(item.content.fields)
      ? (item.content.fields as Record<string, unknown>)
      : null;
  const hasFields =
    item.kind === "social_post" &&
    storedFields !== null &&
    Object.keys(storedFields).length > 0;
  const isEditing = draftFields !== null;

  function startEditing() {
    const initial: Record<string, string> = {};
    for (const fieldSpec of spec.fields) {
      const value = storedFields?.[fieldSpec.key];
      initial[fieldSpec.key] =
        typeof value === "string"
          ? value
          : fieldSpec.key === spec.primaryField
            ? item.bodyText
            : "";
    }
    setDraftFields(initial);
  }

  function saveEditing() {
    if (draftFields) {
      onSaveFields(draftFields);
      setDraftFields(null);
    }
  }

  return (
    <li className="rounded-xl border border-slate-200/90 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {formatMarketingItemKind(item.kind)}
        </span>
        {item.channelHint ? (
          <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
            {item.channelHint}
          </span>
        ) : null}
        {typeof item.content.objective === "string" &&
        item.content.objective ? (
          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-100">
            {formatMarketingObjective(item.content.objective)}
          </span>
        ) : null}
        <span className="text-xs text-slate-400">
          {formatRunTimestamp(item.createdAt)}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>

      {isEditing && draftFields ? (
        <div className="mt-2 space-y-3">
          {spec.fields.map((fieldSpec) => {
            const value = draftFields[fieldSpec.key] ?? "";
            const over = value.length > fieldSpec.maxChars;

            return (
              <label
                key={fieldSpec.key}
                className="block text-xs font-semibold text-slate-700"
              >
                {fieldSpec.label}
                <span
                  className={`ml-2 font-normal ${
                    over ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {value.length}/{fieldSpec.maxChars}
                </span>
                {fieldSpec.multiline ? (
                  <textarea
                    value={value}
                    onChange={(event) =>
                      setDraftFields({
                        ...draftFields,
                        [fieldSpec.key]: event.target.value,
                      })
                    }
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(event) =>
                      setDraftFields({
                        ...draftFields,
                        [fieldSpec.key]: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                  />
                )}
                <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                  {fieldSpec.hint}
                </span>
              </label>
            );
          })}
          {spec.mediaNote ? (
            <p className="text-[11px] text-amber-700">{spec.mediaNote}</p>
          ) : null}
        </div>
      ) : hasFields ? (
        <div className="mt-1.5 space-y-2">
          {spec.fields.map((fieldSpec) => {
            const value = storedFields?.[fieldSpec.key];
            if (typeof value !== "string" || !value) {
              return null;
            }

            return (
              <div key={fieldSpec.key}>
                {spec.fields.length > 1 ? (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {fieldSpec.label}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {value}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {item.bodyText}
        </p>
      )}

      {!isEditing && callToAction ? (
        <p className="mt-2 text-xs text-slate-600">
          <span className="font-semibold">CTA:</span> {callToAction}
        </p>
      ) : null}

      {!isEditing && hashtags.length > 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          {hashtags.map((tag) => `#${tag}`).join(" ")}
        </p>
      ) : null}

      {!isEditing && rationale ? (
        <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs italic text-slate-500">
          Why: {rationale}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isEditing ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={saveEditing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Save edits
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDraftFields(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Approve
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onReject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
            {item.kind === "social_post" ? (
              <button
                type="button"
                disabled={disabled}
                onClick={startEditing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <PenLine className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : null}
            {item.kind === "video_brief" ? (
              <button
                type="button"
                onClick={() => downloadVideoBriefJson(item)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export brief
              </button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

type DistributionTabProps = {
  distribution: MarketingDistributionStatus;
};

function DistributionTab({ distribution }: DistributionTabProps) {
  const facebookReady =
    distribution.encryptionConfigured &&
    distribution.facebookConfigured &&
    distribution.facebookPages.length > 0;
  const instagramPage = distribution.facebookPages.find(
    (page) => page.hasInstagram,
  );

  const rows: {
    platform: string;
    status: "ready" | "partial" | "manual";
    statusLabel: string;
    detail: string;
  }[] = [
    {
      platform: "Facebook",
      status: facebookReady ? "ready" : "partial",
      statusLabel: facebookReady ? "One-click publish" : "Needs setup",
      detail: facebookReady
        ? `Approved Facebook posts publish directly to "${distribution.facebookPages[0].name}" from the queue.`
        : !distribution.encryptionConfigured
          ? "Set INTEGRATIONS_ENCRYPTION_KEY in the environment, then connect a Page from the Marketing Hub."
          : !distribution.facebookConfigured
            ? "Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in the environment, then connect a Page from the Marketing Hub."
            : "Environment is configured — connect your Facebook Page from the Marketing Hub (Connected accounts card).",
    },
    {
      platform: "Instagram",
      status: instagramPage ? "partial" : "manual",
      statusLabel: instagramPage ? "Almost ready" : "Needs setup",
      detail: instagramPage
        ? `Instagram Business is linked via "${instagramPage.name}". Publishing requires an image on the post — image support is the next build step.`
        : "Publishes through the Instagram Business account linked to a connected Facebook Page. Connect Facebook first, link Instagram in Meta Business Suite.",
    },
    {
      platform: "Google Business",
      status: "manual",
      statusLabel: "Copy / paste",
      detail:
        "Drafts are packaged to Google Business limits. Direct posting adapter is planned; for now copy from the queue.",
    },
    {
      platform: "X (Twitter)",
      status: "manual",
      statusLabel: "Copy / paste",
      detail:
        "Drafts are packaged to the 280-character limit, ready to paste. API adapter planned.",
    },
    {
      platform: "LinkedIn",
      status: "manual",
      statusLabel: "Copy / paste",
      detail:
        "Drafts are packaged and ready to paste. API adapter planned.",
    },
    {
      platform: "YouTube",
      status: "manual",
      statusLabel: "Brief + render",
      detail:
        "Video briefs export as JSON for the demo-tool render pipeline; title, description, and tags come pre-packaged for upload.",
    },
    {
      platform: "TikTok",
      status: "manual",
      statusLabel: "Brief + render",
      detail:
        "Video briefs carry a TikTok-packaged caption. Render via the demo-tool pipeline, upload manually for now.",
    },
  ];

  return (
    <div className="px-4 py-4 sm:px-5">
      <h2 className="text-sm font-semibold text-slate-900">
        Where approved content can go
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Every draft is packaged per-platform at generation time, so each
        channel lights up here the moment its pipe is connected — no content
        rework needed.
      </p>

      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.platform}
            className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-white px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {row.platform}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {row.detail}
              </p>
            </div>
            <span
              className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                row.status === "ready"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                  : row.status === "partial"
                    ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {row.statusLabel}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
        Facebook Pages connect from the Marketing Hub&apos;s Connected accounts
        card. Ads platforms are intentionally absent — they arrive as
        proposal-only with code-enforced budget caps, per the architecture doc.
      </p>
    </div>
  );
}

type StrategyTabProps = {
  report: {
    item: MarketingItem;
    content: Partial<MarketingStrategyReportContent>;
  } | null;
  hasConfig: boolean;
  aiReady: boolean;
  isPending: boolean;
  onRunStrategist: () => void;
};

function StrategyTab({
  report,
  hasConfig,
  aiReady,
  isPending,
  onRunStrategist,
}: StrategyTabProps) {
  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Latest strategy report
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            The strategist runs Monday mornings and whenever you trigger it.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending || !hasConfig || !aiReady}
          onClick={onRunStrategist}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BrainCircuit className="h-3.5 w-3.5" />
          )}
          Run strategist now
        </button>
      </div>

      {!report ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
          <BrainCircuit className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            No report yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Run the strategist to get the first read on where marketing
            stands and what to do next.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/90 bg-white p-4">
          <p className="text-xs text-slate-400">
            {formatRunTimestamp(report.item.createdAt)}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">
            {report.content.headline ?? report.item.title}
          </h3>

          {report.content.summary ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {report.content.summary}
            </p>
          ) : null}

          {report.content.metricsNarrative ? (
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                The numbers
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                {report.content.metricsNarrative}
              </p>
            </div>
          ) : null}

          {report.content.recommendations &&
          report.content.recommendations.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recommendations
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {report.content.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {rec.role}
                    </span>
                    <span className="text-slate-700">{rec.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.content.nextWeekFocus &&
          report.content.nextWeekFocus.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Next week focus (feeds the copywriter)
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-slate-700">
                {report.content.nextWeekFocus.map((focus, index) => (
                  <li key={index}>{focus}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

type SettingsTabProps = {
  config: MarketingHqConfig;
  brandKit: MarketingBrandKit;
  isPending: boolean;
  onSaveConfig: (input: MarketingHqConfig) => void;
  onSaveBrandKit: (input: MarketingBrandKit) => void;
};

function SettingsTab({
  config,
  brandKit,
  isPending,
  onSaveConfig,
  onSaveBrandKit,
}: SettingsTabProps) {
  const [mission, setMission] = useState(config.mission);
  const [audience, setAudience] = useState(config.audience);
  const [positioning, setPositioning] = useState(config.positioning);
  const [goals, setGoals] = useState(config.goals);
  const [channels, setChannels] = useState(config.channels.join(", "));
  const [weeklyPostTarget, setWeeklyPostTarget] = useState(
    String(config.weeklyPostTarget),
  );

  const profile = config.industryProfile;
  const [industry, setIndustry] = useState(profile.industry);
  const [focus, setFocus] = useState(profile.focus);
  const [businessSize, setBusinessSize] = useState(profile.businessSize);
  const [location, setLocation] = useState(profile.location);
  const [services, setServices] = useState(profile.services.join(", "));
  const [idealCustomer, setIdealCustomer] = useState(profile.idealCustomer);
  const [seasonalityNotes, setSeasonalityNotes] = useState(
    profile.seasonalityNotes,
  );
  const [commonObjections, setCommonObjections] = useState(
    listToLines(profile.commonObjections),
  );
  const [typicalJobValues, setTypicalJobValues] = useState(
    profile.typicalJobValues,
  );
  const [preferredChannels, setPreferredChannels] = useState(
    profile.preferredChannels.join(", "),
  );
  const [competitorNotes, setCompetitorNotes] = useState(
    profile.competitorNotes,
  );
  const [seedLoaded, setSeedLoaded] = useState(false);

  function buildConfigInput(): MarketingHqConfig {
    return {
      mission,
      audience,
      positioning,
      goals,
      channels: commaToList(channels),
      weeklyPostTarget: Number(weeklyPostTarget) || 5,
      industryProfile: {
        industry,
        focus,
        businessSize,
        location,
        services: commaToList(services),
        idealCustomer,
        seasonalityNotes,
        commonObjections: linesToList(commonObjections),
        typicalJobValues,
        preferredChannels: commaToList(preferredChannels),
        competitorNotes,
      },
    };
  }

  const [voice, setVoice] = useState(brandKit.voice);
  const [style, setStyle] = useState(brandKit.style);
  const [bannedClaims, setBannedClaims] = useState(
    listToLines(brandKit.bannedClaims),
  );
  const [sampleHooks, setSampleHooks] = useState(
    listToLines(brandKit.sampleHooks),
  );
  const [visualNotes, setVisualNotes] = useState(brandKit.visualNotes);

  function applyAltairDefaults() {
    const seed = ALTAIR_HQ_CONFIG_SEED;
    setMission(seed.mission);
    setAudience(seed.audience);
    setPositioning(seed.positioning);
    setGoals(seed.goals);
    setChannels(seed.channels.join(", "));
    setWeeklyPostTarget(String(seed.weeklyPostTarget));

    const seedProfile = seed.industryProfile;
    setIndustry(seedProfile.industry);
    setFocus(seedProfile.focus);
    setBusinessSize(seedProfile.businessSize);
    setLocation(seedProfile.location);
    setServices(seedProfile.services.join(", "));
    setIdealCustomer(seedProfile.idealCustomer);
    setSeasonalityNotes(seedProfile.seasonalityNotes);
    setCommonObjections(listToLines(seedProfile.commonObjections));
    setTypicalJobValues(seedProfile.typicalJobValues);
    setPreferredChannels(seedProfile.preferredChannels.join(", "));
    setCompetitorNotes(seedProfile.competitorNotes);

    const seedKit = ALTAIR_BRAND_KIT_SEED;
    setVoice(seedKit.voice);
    setStyle(seedKit.style);
    setBannedClaims(listToLines(seedKit.bannedClaims));
    setSampleHooks(listToLines(seedKit.sampleHooks));
    setVisualNotes(seedKit.visualNotes);

    setSeedLoaded(true);
  }

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none";
  const labelClass = "block text-xs font-semibold text-slate-700";

  return (
    <div className="grid gap-6 px-4 py-4 sm:px-5 lg:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Skip the typing — load the Altair defaults
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Pre-fills every field below from the Marketing AI Foundation and
              brand guidelines. Review, tweak anything that reads wrong, then
              hit the save buttons — nothing is saved until you do.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={applyAltairDefaults}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {seedLoaded ? "Defaults loaded — review below" : "Load Altair defaults"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            HQ goals (the command center)
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Every role reads this before doing anything. Mission, audience, and
          goals are required.
        </p>

        <div className="mt-3 space-y-3">
          <label className={labelClass}>
            Mission — what we are marketing
            <textarea
              value={mission}
              onChange={(event) => setMission(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Altair OS — field-service software built by a working HVAC founder."
            />
          </label>
          <label className={labelClass}>
            Audience
            <textarea
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Owners of small HVAC, plumbing, and electrical businesses (1-15 techs)."
            />
          </label>
          <label className={labelClass}>
            Positioning
            <textarea
              value={positioning}
              onChange={(event) => setPositioning(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="The only field-service platform built in the field, not a boardroom."
            />
          </label>
          <label className={labelClass}>
            Current goals
            <textarea
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Find founding beta companies; grow the waitlist; build in public."
            />
          </label>
          <label className={labelClass}>
            Channel focus (comma-separated)
            <input
              value={channels}
              onChange={(event) => setChannels(event.target.value)}
              className={fieldClass}
              placeholder="facebook, instagram, x, linkedin"
            />
          </label>
          <label className={labelClass}>
            Posts per copywriter batch (1-10)
            <input
              value={weeklyPostTarget}
              onChange={(event) => setWeeklyPostTarget(event.target.value)}
              inputMode="numeric"
              className={fieldClass}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => onSaveConfig(buildConfigInput())}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save HQ goals
        </button>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-4">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Brand kit</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Voice rules every draft inherits. The honesty rules (no invented
          customers, revenue, or integrations) always apply on top.
        </p>

        <div className="mt-3 space-y-3">
          <label className={labelClass}>
            Voice &amp; tone
            <textarea
              value={voice}
              onChange={(event) => setVoice(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Honest, founder-led, practical — not hypey."
            />
          </label>
          <label className={labelClass}>
            Writing style
            <textarea
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Plain language a busy contractor reads in ten seconds."
            />
          </label>
          <label className={labelClass}>
            Additional banned claims (one per line)
            <textarea
              value={bannedClaims}
              onChange={(event) => setBannedClaims(event.target.value)}
              rows={3}
              className={fieldClass}
              placeholder={"Naming specific competitors negatively\nPricing promises"}
            />
          </label>
          <label className={labelClass}>
            Approved hooks (one per line)
            <textarea
              value={sampleHooks}
              onChange={(event) => setSampleHooks(event.target.value)}
              rows={3}
              className={fieldClass}
              placeholder={"I just shipped another piece of Altair OS…\nSmall contractors should not need five different tools…"}
            />
          </label>
          <label className={labelClass}>
            Visual notes (for future briefs)
            <textarea
              value={visualNotes}
              onChange={(event) => setVisualNotes(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Brand black + gold gradient; never purple; real product screenshots over stock art."
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            onSaveBrandKit({
              voice,
              style,
              bannedClaims: linesToList(bannedClaims),
              sampleHooks: linesToList(sampleHooks),
              visualNotes,
            })
          }
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save brand kit
        </button>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-4 lg:col-span-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Industry profile
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Loaded before every AI task so recommendations fit this specific
          business — never a generic contractor. Saved together with HQ goals.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Industry
            <input
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className={fieldClass}
              placeholder="Software for field-service trades"
            />
          </label>
          <label className={labelClass}>
            Residential / commercial focus
            <input
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              className={fieldClass}
              placeholder="Both"
            />
          </label>
          <label className={labelClass}>
            Business size
            <input
              value={businessSize}
              onChange={(event) => setBusinessSize(event.target.value)}
              className={fieldClass}
              placeholder="Solo founder"
            />
          </label>
          <label className={labelClass}>
            Location / market
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={fieldClass}
              placeholder="United States (online)"
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Services / offerings (comma-separated)
            <input
              value={services}
              onChange={(event) => setServices(event.target.value)}
              className={fieldClass}
              placeholder="CRM, scheduling, dispatch, estimates, invoicing, payments"
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Ideal customer
            <textarea
              value={idealCustomer}
              onChange={(event) => setIdealCustomer(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Owner-operators of 1-15 tech trades businesses drowning in office work."
            />
          </label>
          <label className={labelClass}>
            Seasonality notes
            <textarea
              value={seasonalityNotes}
              onChange={(event) => setSeasonalityNotes(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="HVAC buyers busiest in summer/winter rushes; software decisions in shoulder seasons."
            />
          </label>
          <label className={labelClass}>
            Common objections (one per line)
            <textarea
              value={commonObjections}
              onChange={(event) => setCommonObjections(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder={"Already using spreadsheets\nSwitching costs / data migration"}
            />
          </label>
          <label className={labelClass}>
            Typical job / deal values
            <input
              value={typicalJobValues}
              onChange={(event) => setTypicalJobValues(event.target.value)}
              className={fieldClass}
              placeholder="Monthly SaaS subscription tiers"
            />
          </label>
          <label className={labelClass}>
            Preferred channels (comma-separated)
            <input
              value={preferredChannels}
              onChange={(event) => setPreferredChannels(event.target.value)}
              className={fieldClass}
              placeholder="facebook, instagram, youtube, seo"
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Competitor landscape
            <textarea
              value={competitorNotes}
              onChange={(event) => setCompetitorNotes(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Jobber, ServiceTitan, Housecall Pro — enterprise tools or single-department point solutions."
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => onSaveConfig(buildConfigInput())}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save industry profile
        </button>
      </section>
    </div>
  );
}

type RunsTabProps = {
  runs: MarketingRun[];
};

function RunsTab({ runs }: RunsTabProps) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <h2 className="text-sm font-semibold text-slate-900">Engine runs</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Every batch and strategy run, with totals and sanitized errors.
      </p>

      {runs.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
          <ClipboardList className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            No runs yet
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {runs.map((run) => (
            <li
              key={run.id}
              className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {formatRunKey(run.runKey)}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {run.trigger === "cron" ? "scheduled" : "manual"}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatRunTimestamp(run.startedAt)}
                  {run.durationMs !== null
                    ? ` · ${(run.durationMs / 1000).toFixed(1)}s`
                    : ""}
                  {Object.entries(run.totals).length > 0
                    ? ` · ${Object.entries(run.totals)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(", ")}`
                    : ""}
                </p>
                {run.errorSummary ? (
                  <p className="mt-0.5 text-xs text-rose-600">
                    {run.errorSummary}
                  </p>
                ) : null}
              </div>
              <span
                className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  run.status === "succeeded"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                    : run.status === "failed"
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {run.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
