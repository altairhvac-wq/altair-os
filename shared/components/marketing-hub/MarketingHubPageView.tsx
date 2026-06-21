"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus } from "lucide-react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  MasterListPageLayout,
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
import { MarketingPostDraftForm } from "@/shared/components/marketing-hub/MarketingPostDraftForm";
import {
  countMarketingPostsByTab,
  filterMarketingPostsByTab,
  formatMarketingChannel,
  formatMarketingPostStatus,
  type MarketingPost,
  type MarketingPostListTab,
} from "@/shared/types/marketing-post";

type ViewMode = "list" | "create" | "edit";

type MarketingHubPageViewProps = {
  initialPosts: MarketingPost[];
};

const LIST_TABS: { id: MarketingPostListTab; label: string }[] = [
  { id: "active", label: "Active" },
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
  posted: {
    title: "No posted marketing posts yet.",
    description: "Posts you mark posted manually will appear here.",
  },
  archived: {
    title: "No archived marketing posts.",
    description: "Archived posts will appear here.",
  },
};

export function MarketingHubPageView({ initialPosts }: MarketingHubPageViewProps) {
  const router = useRouter();
  const northStar = isNorthStarShellEnabled();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [listTab, setListTab] = useState<MarketingPostListTab>("active");
  const selectedPost =
    selectedPostId != null
      ? initialPosts.find((post) => post.id === selectedPostId) ?? null
      : null;
  const isFormOpen = viewMode === "create" || viewMode === "edit";
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

  function handleOpenCreateForm() {
    setSelectedPostId(null);
    setViewMode("create");
  }

  function handleSelectPost(postId: string) {
    setSelectedPostId(postId);
    setViewMode("edit");
  }

  function handleCloseForm() {
    setViewMode("list");
    setSelectedPostId(null);
  }

  return (
    <MasterListPageLayout
      title="Marketing"
      subtitle="Draft and track copy-ready marketing posts your team can paste manually."
      density="compact"
      primaryAction={
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
      }
      className={northStar ? lt.pageCanvas : ""}
      headerClassName={northStar ? lt.pageHeader : undefined}
      headerSurfaceVariant={northStar ? "northStar" : "default"}
      headerTitleClassName={northStar ? lt.pageHeaderTitle : undefined}
      headerSubtitleClassName={northStar ? lt.pageHeaderSubtitle : undefined}
    >
      <MasterPageSurface
        variant={northStar ? "northStarList" : "card"}
        className={`${masterListPageSurfaceClass} ${northStar ? lt.listSurface : ""}`}
      >
        {northStar ? (
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />
        ) : null}

        <div className={masterListPageScrollRegionClass}>
          {viewMode === "create" ? (
            <div className="flex justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
              <MarketingPostDraftForm
                mode="create"
                onSuccess={handleCreateSuccess}
                onCancel={handleCloseForm}
              />
            </div>
          ) : viewMode === "edit" && selectedPost ? (
            <div className="flex justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
              <MarketingPostDraftForm
                key={selectedPost.id}
                mode="edit"
                post={selectedPost}
                onSuccess={handleEditSuccess}
                onCancel={handleCloseForm}
              />
            </div>
          ) : (
            <>
              <div
                className={`shrink-0 border-b px-3 py-2 sm:px-4 ${
                  northStar
                    ? "border-[rgba(148,163,184,0.18)] bg-[#FAF6EE]/50"
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
                              isActive ? lt.viewTabsCountActive : lt.viewTabsCount
                            }
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`${adminSegmentedControlClass} w-full sm:w-auto`}>
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
                          ? "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]"
                          : "admin-empty-icon mx-auto"
                      }
                    >
                      <Megaphone
                        className={
                          northStar
                            ? "h-6 w-6 text-[#8A6324]"
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
                </div>
              ) : (
                <ul className="divide-y divide-slate-100/90">
                  {filteredPosts.map((post) => (
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
                        </div>
                        <span
                          className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            northStar
                              ? "bg-[#EFE4CB] text-[#6B4E1A] ring-1 ring-[rgba(138,99,36,0.12)]"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {formatMarketingPostStatus(post.status)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </MasterPageSurface>
    </MasterListPageLayout>
  );
}
