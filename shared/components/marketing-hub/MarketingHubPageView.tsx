"use client";

import { useState } from "react";
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
import { MarketingPostDraftForm } from "@/shared/components/marketing-hub/MarketingPostDraftForm";
import {
  formatMarketingChannel,
  formatMarketingPostStatus,
  type MarketingPost,
} from "@/shared/types/marketing-post";

type MarketingHubPageViewProps = {
  initialPosts: MarketingPost[];
};

export function MarketingHubPageView({ initialPosts }: MarketingHubPageViewProps) {
  const router = useRouter();
  const northStar = isNorthStarShellEnabled();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const hasNoPosts = initialPosts.length === 0;

  function handleCreateSuccess() {
    setShowCreateForm(false);
    router.refresh();
  }

  return (
    <MasterListPageLayout
      title="Marketing"
      subtitle="Turn completed work, service areas, and seasonal reminders into ready-to-post content."
      density="compact"
      primaryAction={
        <button
          type="button"
          disabled={showCreateForm}
          onClick={() => setShowCreateForm(true)}
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
          {showCreateForm ? (
            <div className="p-4 sm:p-6">
              <MarketingPostDraftForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          ) : hasNoPosts ? (
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
                      northStar ? "h-6 w-6 text-[#8A6324]" : "h-7 w-7 text-slate-400"
                    }
                  />
                </div>
                <p
                  className={`mt-4 text-sm font-semibold ${
                    northStar ? "text-[#17130E]" : "text-slate-900"
                  }`}
                >
                  No marketing posts yet.
                </p>
                <p
                  className={`mt-1 text-sm ${
                    northStar ? "text-[#6B6255]" : "text-slate-500"
                  }`}
                >
                  Draft posts from completed jobs, service areas, and seasonal reminders
                  will appear here.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100/90">
              {initialPosts.map((post) => (
                <li
                  key={post.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </MasterPageSurface>
    </MasterListPageLayout>
  );
}
