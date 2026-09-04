"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus } from "lucide-react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  MasterPageSurface,
  masterListPagePrimaryActionClass,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import { FounderScreenshotCaptureControl } from "@/shared/components/marketing-hub/FounderScreenshotCaptureControl";
import { MarketingCompletedJobPicker } from "@/shared/components/marketing-hub/MarketingCompletedJobPicker";
import { MarketingPostDraftForm } from "@/shared/components/marketing-hub/MarketingPostDraftForm";
import { WebsitePublishingPanel } from "@/shared/components/marketing-hub/WebsitePublishingPanel";
import type { SitePublishingDetails } from "@/shared/types/site-publishing-details";
import {
  FOUNDER_MARKETING_TEMPLATES,
  MARKETING_POST_TEMPLATES,
  buildCompletedJobDraftStarter,
  marketingFounderTemplateToDraftStarter,
  marketingPostTemplateToDraftStarter,
  type MarketingCompletedJobDraftStarter,
  type MarketingFounderDraftStarter,
  type MarketingFounderTemplate,
  type MarketingPostDraftStarter,
  type MarketingPostTemplate,
} from "@/shared/components/marketing-hub/marketing-post-templates";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingCompletedJobPickerItem } from "@/shared/types/marketing-completed-job";
import type { ReelVideoOption } from "@/shared/types/marketing-reel";
import {
  countMarketingPostsByTab,
  filterMarketingPostsByTab,
  formatMarketingChannel,
  formatMarketingPostStatus,
  type MarketingPost,
  type MarketingPostListTab,
} from "@/shared/types/marketing-post";

type ViewMode = "list" | "create" | "edit" | "pick-completed-job";

type MarketingHubPageViewProps = {
  initialPosts: MarketingPost[];
  /** Per website post id. Non-website posts are absent by construction. */
  sitePublishingDetails?: Record<string, SitePublishingDetails>;
  connectedAccounts: MarketingConnectedAccount[];
  /** Stored renders for this company. Identities and shapes, never URLs. */
  videoOptions?: ReelVideoOption[];
  companyName: string;
  showFounderMarketing?: boolean;
  showFounderScreenshotCapture?: boolean;
  aiFeaturesEnabled?: boolean;
  aiDraftingConfigured?: boolean;
};

const LIST_TABS: { id: MarketingPostListTab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "posted", label: "Posted" },
  { id: "archived", label: "Archived" },
];

const EMPTY_STATE_COPY: Record<
  MarketingPostListTab,
  { title: string; description: string }
> = {
  active: {
    title: "No active marketing posts yet.",
    description:
      "Create copy-ready drafts your team can copy and post manually.",
  },
  scheduled: {
    title: "Nothing scheduled yet.",
    description:
      "Add a planned post time to a draft to build your manual posting queue.",
  },
  posted: {
    title: "No posted marketing posts yet.",
    description: "Posts you mark posted manually will appear here.",
  },
  archived: {
    title: "No archived marketing posts.",
    description: "Archived posts will appear here.",
  },
};

function isScheduledPostOverdue(post: MarketingPost): boolean {
  if (post.status !== "scheduled" || !post.scheduledAt) {
    return false;
  }

  return new Date(post.scheduledAt).getTime() < Date.now();
}

type MarketingPostTemplateIdeasProps = {
  northStar: boolean;
  disabled: boolean;
  showFounderMarketing?: boolean;
  showFounderScreenshotCapture?: boolean;
  onUseTemplate: (template: MarketingPostTemplate) => void;
  onUseFounderTemplate: (template: MarketingFounderTemplate) => void;
  onCreateFromCompletedJob: () => void;
  compact?: boolean;
};

function MarketingPostTemplateIdeas({
  northStar,
  disabled,
  showFounderMarketing = false,
  showFounderScreenshotCapture = false,
  onUseTemplate,
  onUseFounderTemplate,
  onCreateFromCompletedJob,
  compact = false,
}: MarketingPostTemplateIdeasProps) {
  return (
    <section
      className={`${
        compact
          ? "border-b px-4 py-4 sm:px-5"
          : "mx-auto mt-6 w-full max-w-2xl px-4 text-left sm:px-0"
      } ${
        northStar
          ? compact
            ? "border-[rgba(176,168,143,0.18)] bg-[#FAF6EE]/40"
            : ""
          : compact
            ? "border-slate-100/90 bg-slate-50/50"
            : ""
      }`}
    >
      <div className={compact ? "" : "text-center sm:text-left"}>
        <h3
          className={`text-sm font-semibold ${
            northStar ? "text-[#17130E]" : "text-slate-900"
          }`}
        >
          Start from an idea
        </h3>
        <p
          className={`mt-1 text-xs leading-relaxed ${
            northStar ? "text-[#6B6255]" : "text-slate-500"
          }`}
        >
          Pick a copy-ready starter template, edit it, then save your draft.
        </p>
      </div>

      <ul
        className={`mt-3 grid gap-2 ${
          compact ? "sm:grid-cols-2" : "text-left sm:grid-cols-2"
        }`}
      >
        {MARKETING_POST_TEMPLATES.map((template) => (
          <li key={template.id}>
            <div
              className={`flex h-full flex-col gap-3 rounded-xl border p-3 ${
                northStar
                  ? "border-[rgba(176,168,143,0.22)] bg-white/80"
                  : "border-slate-200/90 bg-white"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    northStar ? "text-[#17130E]" : "text-slate-900"
                  }`}
                >
                  {template.title}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    northStar ? "text-[#6B6255]" : "text-slate-500"
                  }`}
                >
                  {template.description}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onUseTemplate(template)}
                className="admin-btn-secondary w-full justify-center text-xs sm:w-auto"
              >
                Use template
              </button>
            </div>
          </li>
        ))}
        <li>
          <div
            className={`flex h-full flex-col gap-3 rounded-xl border p-3 ${
              northStar
                ? "border-[rgba(176,168,143,0.22)] bg-white/80"
                : "border-slate-200/90 bg-white"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  northStar ? "text-[#17130E]" : "text-slate-900"
                }`}
              >
                Create from completed job
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  northStar ? "text-[#6B6255]" : "text-slate-500"
                }`}
              >
                Start with a safe draft from job type, city, and completion
                date. You review before saving.
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={onCreateFromCompletedJob}
              className="admin-btn-secondary w-full justify-center text-xs sm:w-auto"
            >
              Choose job
            </button>
          </div>
        </li>
      </ul>

      {showFounderMarketing ? (
        <div className={compact ? "mt-6" : "mt-8"}>
          <div className={compact ? "" : "text-center sm:text-left"}>
            <h3
              className={`text-sm font-semibold ${
                northStar ? "text-[#17130E]" : "text-slate-900"
              }`}
            >
              Altair founder marketing
            </h3>
            <p
              className={`mt-1 text-xs leading-relaxed ${
                northStar ? "text-[#6B6255]" : "text-slate-500"
              }`}
            >
              Create posts from product milestones, feature launches, beta
              progress, and screenshots.
            </p>
          </div>

          <ul
            className={`mt-3 grid gap-2 ${
              compact ? "sm:grid-cols-2" : "text-left sm:grid-cols-2"
            }`}
          >
            {FOUNDER_MARKETING_TEMPLATES.map((template) => (
              <li key={template.id}>
                <div
                  className={`flex h-full flex-col gap-3 rounded-xl border p-3 ${
                    northStar
                      ? "border-[rgba(164,130,58,0.28)] bg-[#FAF6EE]/70"
                      : "border-amber-200/70 bg-amber-50/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        northStar ? "text-[#17130E]" : "text-slate-900"
                      }`}
                    >
                      {template.title}
                    </p>
                    <p
                      className={`mt-0.5 text-xs ${
                        northStar ? "text-[#6B6255]" : "text-slate-500"
                      }`}
                    >
                      {template.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onUseFounderTemplate(template)}
                    className="admin-btn-secondary w-full justify-center text-xs sm:w-auto"
                  >
                    Use template
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {showFounderScreenshotCapture ? (
            <FounderScreenshotCaptureControl
              northStar={northStar}
              disabled={disabled}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function MarketingHubPageView({
  initialPosts,
  sitePublishingDetails,
  connectedAccounts,
  videoOptions = [],
  companyName,
  showFounderMarketing = false,
  showFounderScreenshotCapture = false,
  aiFeaturesEnabled = false,
  aiDraftingConfigured = false,
}: MarketingHubPageViewProps) {
  const router = useRouter();
  const northStar = isNorthStarShellEnabled();
  const timeZone = useCompanyTimezone();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [listTab, setListTab] = useState<MarketingPostListTab>("active");
  const [createDraftStarter, setCreateDraftStarter] = useState<
    | MarketingPostDraftStarter
    | MarketingCompletedJobDraftStarter
    | MarketingFounderDraftStarter
    | null
  >(null);
  const [createFormKey, setCreateFormKey] = useState("blank");
  const selectedPost =
    selectedPostId != null
      ? (initialPosts.find((post) => post.id === selectedPostId) ?? null)
      : null;
  const isFormOpen =
    viewMode === "create" ||
    viewMode === "edit" ||
    viewMode === "pick-completed-job";
  const filteredPosts = useMemo(
    () => filterMarketingPostsByTab(initialPosts, listTab),
    [initialPosts, listTab],
  );
  const tabCounts = useMemo(
    () =>
      LIST_TABS.map((tab) => ({
        ...tab,
        count: countMarketingPostsByTab(initialPosts, tab.id),
      })),
    [initialPosts],
  );
  const emptyState = EMPTY_STATE_COPY[listTab];

  function handleCreateSuccess() {
    setViewMode("list");
    router.refresh();
  }

  function handleEditSuccess() {
    setViewMode("list");
    setSelectedPostId(null);
    router.refresh();
  }

  function handleRecurringCreated() {
    setViewMode("list");
    setSelectedPostId(null);
    setListTab("scheduled");
    router.refresh();
  }

  function handleOpenCreateForm() {
    setSelectedPostId(null);
    setCreateDraftStarter(null);
    setCreateFormKey("blank");
    setViewMode("create");
  }

  function handleUseTemplate(template: MarketingPostTemplate) {
    setSelectedPostId(null);
    setCreateDraftStarter(marketingPostTemplateToDraftStarter(template));
    setCreateFormKey(template.id);
    setViewMode("create");
  }

  function handleUseFounderTemplate(template: MarketingFounderTemplate) {
    setSelectedPostId(null);
    setCreateDraftStarter(marketingFounderTemplateToDraftStarter(template));
    setCreateFormKey(template.id);
    setViewMode("create");
  }

  function handleOpenCompletedJobPicker() {
    setSelectedPostId(null);
    setCreateDraftStarter(null);
    setCreateFormKey("blank");
    setViewMode("pick-completed-job");
  }

  function handleSelectCompletedJob(job: MarketingCompletedJobPickerItem) {
    const draftStarter = buildCompletedJobDraftStarter({
      job,
      companyName,
      channel: "facebook",
    });

    setSelectedPostId(null);
    setCreateDraftStarter(draftStarter);
    setCreateFormKey(`completed-job-${job.id}`);
    setViewMode("create");
  }

  function handleCloseCompletedJobPicker() {
    setViewMode("list");
  }

  function handleSelectPost(postId: string) {
    setSelectedPostId(postId);
    setViewMode("edit");
  }

  function handleCloseForm() {
    setViewMode("list");
    setSelectedPostId(null);
    setCreateDraftStarter(null);
    setCreateFormKey("blank");
  }

  const showTemplateIdeas = listTab === "active";

  const newPostButton = (
    <button
      type="button"
      disabled={isFormOpen}
      onClick={handleOpenCreateForm}
      className={
        northStar
          ? `north-star-marketing-primary-action ${lt.primaryAction} disabled:cursor-not-allowed disabled:opacity-60`
          : `${masterListPagePrimaryActionClass} disabled:cursor-not-allowed disabled:opacity-60`
      }
    >
      <Plus className="h-3.5 w-3.5" />
      New post draft
    </button>
  );

  const body = (
    <MasterPageSurface
      variant={northStar ? "northStarList" : "card"}
      className={`${masterListPageSurfaceClass} ${northStar ? lt.listSurface : ""}`}
    >
      {northStar ? (
        <div aria-hidden="true" className={lt.listSurfaceTopAccent} />
      ) : null}

      <div className={masterListPageScrollRegionClass}>
        {viewMode === "pick-completed-job" ? (
          <div className="flex justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <MarketingCompletedJobPicker
              northStar={northStar}
              onSelect={handleSelectCompletedJob}
              onCancel={handleCloseCompletedJobPicker}
            />
          </div>
        ) : viewMode === "create" ? (
          <div className="flex justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <MarketingPostDraftForm
              key={createFormKey}
              mode="create"
              draftStarter={createDraftStarter ?? undefined}
              aiFeaturesEnabled={aiFeaturesEnabled}
              aiDraftingConfigured={aiDraftingConfigured}
              showFounderMarketing={showFounderMarketing}
              connectedAccounts={connectedAccounts}
              videoOptions={videoOptions}
              onSuccess={handleCreateSuccess}
              onCancel={handleCloseForm}
            />
          </div>
        ) : viewMode === "edit" && selectedPost ? (
          <div className="flex justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="w-full max-w-3xl">
              <MarketingPostDraftForm
              key={selectedPost.id}
              mode="edit"
              post={selectedPost}
              aiFeaturesEnabled={aiFeaturesEnabled}
              aiDraftingConfigured={aiDraftingConfigured}
              showFounderMarketing={showFounderMarketing}
              connectedAccounts={connectedAccounts}
              videoOptions={videoOptions}
              onSuccess={handleEditSuccess}
              onCancel={handleCloseForm}
              onRecurringCreated={handleRecurringCreated}
              />
              {/* ============ WEBSITE POSTS ONLY ============
                  A Facebook post has no slug, canonical or meta description,
                  and rendering empty SEO rows on one would imply those
                  fields were meant to be filled in. The details are resolved
                  server-side and are absent for every other channel. */}
              {selectedPost.channelTarget === "website" &&
              sitePublishingDetails?.[selectedPost.id] ? (
                <WebsitePublishingPanel
                  details={sitePublishingDetails[selectedPost.id]}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {/* ============ ONE HOME PER CAPABILITY ============
                A Marketing AI HQ banner and a Connected accounts card used
                to render here as well as in the workspace's Settings tab —
                the same two cards, twice, on the same page. Both now live
                in Settings only. Neither capability was removed; the second
                copy of each was.

                What is left in this file is the manual post-drafting
                workflow and nothing else: the status tabs, the starter
                templates, the draft form, the post list. */}
            <div
              className={`shrink-0 border-b px-3 py-2 sm:px-4 ${
                northStar
                  ? "border-[rgba(176,168,143,0.18)] bg-[#FAF6EE]/50"
                  : "border-slate-100/90 bg-white"
              }`}
            >
              {northStar ? (
                <div className={`${lt.viewTabsControl} w-full sm:w-auto`}>
                  {tabCounts.map((tab) => {
                    const isActive = listTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setListTab(tab.id)}
                        className={`${lt.viewTabsItem} sm:px-3 sm:py-1.5 ${
                          isActive ? lt.viewTabsItemActive : ""
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={
                            isActive
                              ? lt.viewTabsCountActive
                              : lt.viewTabsCount
                          }
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className={`${adminSegmentedControlClass} w-full sm:w-auto`}
                >
                  {tabCounts.map((tab) => {
                    const isActive = listTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setListTab(tab.id)}
                        className={`${adminSegmentedItemClass} sm:px-3 sm:py-1.5 ${
                          isActive ? adminSegmentedItemActiveClass : ""
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`ml-1.5 text-xs font-medium ${
                            isActive ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {showTemplateIdeas && filteredPosts.length > 0 ? (
              <MarketingPostTemplateIdeas
                northStar={northStar}
                disabled={isFormOpen}
                showFounderMarketing={showFounderMarketing}
                showFounderScreenshotCapture={showFounderScreenshotCapture}
                onUseTemplate={handleUseTemplate}
                onUseFounderTemplate={handleUseFounderTemplate}
                onCreateFromCompletedJob={handleOpenCompletedJobPicker}
                compact
              />
            ) : null}

            {filteredPosts.length === 0 ? (
              <div className="admin-empty-wrap">
                <div
                  className={`${
                    northStar ? lt.emptyState : "admin-empty-state"
                  } w-full max-w-md text-center`}
                >
                  <div
                    className={
                      northStar
                        ? "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE4CB] ring-1 ring-[rgba(119,89,27,0.12)]"
                        : "admin-empty-icon mx-auto"
                    }
                  >
                    <Megaphone
                      className={
                        northStar
                          ? "h-6 w-6 text-[#77591B]"
                          : "h-7 w-7 text-slate-400"
                      }
                    />
                  </div>
                  <p
                    className={`mt-4 text-sm font-semibold ${
                      northStar ? "text-[#17130E]" : "text-slate-900"
                    }`}
                  >
                    {emptyState.title}
                  </p>
                  <p
                    className={`mt-1 text-sm ${
                      northStar ? "text-[#6B6255]" : "text-slate-500"
                    }`}
                  >
                    {emptyState.description}
                  </p>
                </div>

                {showTemplateIdeas ? (
                  <MarketingPostTemplateIdeas
                    northStar={northStar}
                    disabled={isFormOpen}
                    showFounderMarketing={showFounderMarketing}
                    showFounderScreenshotCapture={
                      showFounderScreenshotCapture
                    }
                    onUseTemplate={handleUseTemplate}
                    onUseFounderTemplate={handleUseFounderTemplate}
                    onCreateFromCompletedJob={handleOpenCompletedJobPicker}
                  />
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100/90">
                {filteredPosts.map((post) => {
                  const isScheduledTab = listTab === "scheduled";
                  const overdue =
                    isScheduledTab && isScheduledPostOverdue(post);

                  return (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectPost(post.id)}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                          northStar
                            ? "hover:bg-[#FAF6EE]/80"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {post.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {formatMarketingChannel(post.channelTarget)}
                          </p>
                          {isScheduledTab && post.scheduledAt ? (
                            <p className="mt-1 text-xs text-slate-600">
                              Planned for{" "}
                              {formatDateTimeInTimeZone(
                                post.scheduledAt,
                                timeZone,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                },
                              )}
                              {" · "}
                              {/* A website post goes out through the
                                  altair_site publisher, so telling someone
                                  to copy and paste it describes a workflow
                                  that is not the one that runs. */}
                              {post.channelTarget === "website"
                                ? "Publishes to the Altair website"
                                : "Copy and post manually"}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {overdue ? (
                            <span className="inline-flex w-fit rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80">
                              Overdue
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              northStar
                                ? "bg-[#EFE4CB] text-[#77591B] ring-1 ring-[rgba(119,89,27,0.12)]"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {formatMarketingPostStatus(post.status)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </MasterPageSurface>
  );

  // ============ A SECTION, NOT A SECOND PAGE ============
  // `/marketing` is the canonical Marketing route and this view is one
  // section inside its Advanced tab — its only mount point in the product.
  // It used to declare its own page title, subtitle and canvas, which is
  // what made Advanced feel like a second application stitched into a tab.
  // Those belong to the route, and the route already has them.
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-altair-ink">Posts</h2>
          <p className="mt-0.5 text-sm text-altair-ink-muted">
            {/* ============ NOT ALL OF THESE ARE MANUAL ============
                This list was called "Manual posts" and described as copy-ready
                drafts posted by hand, which was true of every channel it had
                when that copy was written. Website posts now publish through
                the altair_site publisher and arrive here with a live URL, so
                a heading calling them manual describes the wrong workflow to
                whoever opens one. Social channels are unchanged and still say
                so. */}
            Drafts your team writes. Social channels are copied and posted by
            hand; website posts publish to the Altair website. Separate from
            the daily video.
          </p>
        </div>
        {newPostButton}
      </div>
      {body}
    </section>
  );
}
