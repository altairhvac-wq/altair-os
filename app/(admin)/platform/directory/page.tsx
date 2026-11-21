import type { Metadata } from "next";
import { listListingsForReview } from "@/lib/directory/listings";
import { requirePlatformAdmin } from "@/lib/database/platform-admin";
import { viewableMediaSet } from "@/lib/directory/media";
import { isDirectory214Installed } from "@/lib/directory/schema";
import { DirectoryReviewView, type ReviewImages } from "@/shared/components/platform-admin/directory/DirectoryReviewView";

export const metadata: Metadata = {
  title: "Contractor directory",
};

/**
 * The owner's review screen for the public directory: approve new listings,
 * approve or decline edits, deal with reports. Platform admins only. The
 * layout already gates this, and the page checks again because the data below
 * is read with the service role and includes listers' private email addresses.
 */
export default async function PlatformDirectoryPage() {
  await requirePlatformAdmin();
  const data = await listListingsForReview();
  // Images to look at: the live ones and any waiting set. Waiting images are
  // private; the reviewer sees them through ten-minute signed links.
  const images: Record<string, ReviewImages> = {};
  for (const item of data.items ?? []) {
    if (item.status === "removed") continue;
    const hasLive = item.media.logo !== null || item.media.photos.length > 0;
    if (!hasLive && !item.pendingMedia) continue;
    images[item.id] = {
      live: hasLive ? await viewableMediaSet(item.media, item.id) : null,
      waiting: item.pendingMedia ? await viewableMediaSet(item.pendingMedia, item.id) : null,
    };
  }
  // Adding with permission needs migration 214; before it the form explains that.
  const canAddWithPermission = await isDirectory214Installed();
  return <DirectoryReviewView data={data} images={images} canAddWithPermission={canAddWithPermission} />;
}
