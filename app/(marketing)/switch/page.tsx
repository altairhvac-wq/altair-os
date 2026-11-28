import type { Metadata } from "next";
import { getLiveOnboardingInfo } from "@/lib/onboarding/live-onboarding";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { SwitchPage } from "@/shared/components/marketing/switch/SwitchPage";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";
import { SWITCH_FAQ, SWITCH_PAGE } from "@/shared/lib/site/switch-page";

export const metadata: Metadata = {
  title: { absolute: SWITCH_PAGE.metaTitle },
  description: SWITCH_PAGE.metaDescription,
  ...buildPublicSocialMetadata({
    path: SWITCH_PAGE.path,
    title: SWITCH_PAGE.metaTitle,
    description: SWITCH_PAGE.metaDescription,
  }),
};

/** Moving from another app; content and sources live in shared/lib/site/switch-page.ts. */
export default function Page() {
  return (
    <>
      <JsonLdScript data={buildFaqPageStructuredData(SWITCH_FAQ)} />
      <SwitchPage bookingUrl={getLiveOnboardingInfo().joinUrl} />
    </>
  );
}
