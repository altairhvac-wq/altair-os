import { redirect } from "next/navigation";

/**
 * Marketing HQ was folded into `/marketing` on 2026-10-25: its weekly social
 * ideas now wait in the Today queue and brand & goals live under Settings.
 * The address redirects so old links and bookmarks still land somewhere real.
 */
export default function MarketingHqRedirect() {
  redirect("/marketing");
}
