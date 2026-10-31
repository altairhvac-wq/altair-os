import { Suspense } from "react";
import { LoginFormFields } from "@/shared/components/auth/LoginForm";
import { LoginMarketingPanel } from "@/shared/components/auth/LoginMarketingPanel";
import { LoginPageShell } from "@/shared/components/auth/LoginPageShell";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";

/**
 * The logged-out homepage: the sign-in screen, with the site's tabs across
 * the top (owner decision, 2026-10-31: "make the sign in page be our actual
 * landing page"). Returning customers sign in where they land; a stranger
 * gets the same product panel the sign-in page already had, the trial
 * button under the form, and the tabs to pricing, the landing pages,
 * Insights, Resources and Contact. The long scrolling homepage it replaces
 * was retired; its pricing and onboarding sections live on in the search
 * landing pages.
 */
export function LoginLandingPage() {
  return (
    <div className="relative bg-[#0a0b09]">
      <HomepageNav />
      <LoginPageShell
        variant="landing"
        heroPanel={
          <>
            <LoginMarketingPanel hideHeader />
            <MarketingFooter />
          </>
        }
      >
        <Suspense fallback={null}>
          <LoginFormFields />
        </Suspense>
      </LoginPageShell>
    </div>
  );
}
