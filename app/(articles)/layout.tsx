import "../public.css";
import type { Metadata } from "next";
import MarketingLayout, { metadata as marketingMetadata } from "../(marketing)/layout";

/**
 * The Insights articles, in their own route group.
 *
 * ============ WHY NOT INSIDE (marketing) ============
 * `app/(marketing)/loading.tsx` wraps every page in that group in a Suspense
 * boundary. A page that awaits the database inside it has already started
 * streaming as `200 OK` when it learns the slug does not exist, so
 * `notFound()` could only add `noindex`: an unknown /insights/<slug> was a
 * soft 404 in Search Console. Out here there is no loading boundary above the
 * page, so the lookup finishes before the first byte and a missing article
 * answers with a real `404`.
 *
 * Everything else is the marketing layout itself (stylesheet, display font,
 * Meta Pixel, link-preview metadata, Search Console verification), reused
 * rather than copied so the two cannot drift. The URL is unchanged: route
 * groups do not appear in the path.
 */
export const metadata: Metadata = marketingMetadata;

export default function ArticlesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MarketingLayout>{children}</MarketingLayout>;
}
