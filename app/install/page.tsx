import type { Metadata } from "next";
import { InstallPageView } from "@/shared/components/pwa/InstallPageView";
import { PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Install the App on Your Phone";
const DESCRIPTION =
  "Add Altair Operating System to your home screen and open it like an app on iPhone, iPad, or Android.";

/**
 * /install is in the sitemap and robots.txt, but it sits outside the
 * (marketing) group, so it never got that layout's metadataBase or canonical
 * (site audit 2026-11-20: the only indexed page without one). It sets both
 * here, on the same public origin every other page uses.
 */
export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_ORIGIN),
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: "/install", title: TITLE, description: DESCRIPTION }),
};

export default function InstallPage() {
  return <InstallPageView />;
}
