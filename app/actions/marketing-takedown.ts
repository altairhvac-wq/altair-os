"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { archivePublishedSitePageForCompany } from "@/lib/database/queries/marketing-site-pages";

/**
 * Take a live website page down from the end-of-day review on /marketing.
 *
 * Owner decision 2026-10-25: marketing publishes on its own and the owner
 * removes what they do not like at the end of the day. This is the website
 * half; YouTube and Facebook removals happen on those platforms (the
 * YouTube connection holds upload permission only, not delete).
 *
 * A public security boundary like every Server Action: the caller must have
 * an active company, be its owner or admin, and hold the marketing permission;
 * the page must belong to that company and be live.
 */
export async function takeDownSitePageAction(
  pageId: string,
): Promise<{ error?: string; slug?: string }> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "Choose a company first." };
  if (!hasCompanyRole(context.role, ["owner", "admin"]) || !context.permissions.dispatchJobs) {
    return { error: "Only an owner or admin can take a page down." };
  }
  const id = typeof pageId === "string" ? pageId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "A valid page is required." };

  const result = await archivePublishedSitePageForCompany({
    companyId: context.company.id,
    pageId: id,
  });
  if (result.error || !result.slug) return { error: result.error ?? "Could not take the page down." };

  revalidatePath(`/insights/${result.slug}`);
  revalidatePath("/insights");
  revalidatePath("/sitemap.xml");
  revalidatePath("/marketing");
  return { slug: result.slug };
}
