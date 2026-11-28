import type { Metadata } from "next";
import { findLandingPage } from "@/shared/lib/site/landing-pages";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import type { SoftwarePagePath } from "@/shared/lib/site/internal-links";

/** Title, description, canonical and link preview for one software page. */
export function softwarePageMetadata(path: SoftwarePagePath): Metadata {
  const page = findLandingPage(path);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    ...buildPublicSocialMetadata({
      path: page.path,
      title: `${page.title} · Altair Operating System`,
      description: page.description,
    }),
  };
}
