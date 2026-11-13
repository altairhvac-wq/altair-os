import type { Metadata } from "next";
import { listListingsForReview } from "@/lib/directory/listings";
import { requirePlatformAdmin } from "@/lib/database/platform-admin";
import { DirectoryReviewView } from "@/shared/components/platform-admin/directory/DirectoryReviewView";

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
  return <DirectoryReviewView data={data} />;
}
