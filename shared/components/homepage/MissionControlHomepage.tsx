import Link from "next/link";
import { HomepageFoundingSection } from "@/shared/components/homepage/HomepageFoundingSection";
import { HomepageHero } from "@/shared/components/homepage/HomepageHero";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepageOnboardingSection } from "@/shared/components/homepage/HomepageOnboardingSection";
import { HomepageOperatingSystemSection } from "@/shared/components/homepage/HomepageOperatingSystemSection";
import { HomepagePricingSection } from "@/shared/components/homepage/HomepagePricingSection";
import { HomepageProductProofSection } from "@/shared/components/homepage/HomepageProductProofSection";
import { HomepageRealitySection } from "@/shared/components/homepage/HomepageRealitySection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

export function MissionControlHomepage() {
  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip text-[#f3ebdd]">
      <div className="mc-atmosphere pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[#080907]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_130%_85%_at_50%_-20%,#1a1f28_0%,transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_78%_52%_at_50%_18%,rgba(220,215,204,0.11)_0%,rgba(220,215,204,0.035)_42%,transparent_68%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_42%_at_86%_26%,rgba(210,204,190,0.05),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_38%_at_10%_36%,rgba(193,187,173,0.04),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_42%_at_50%_100%,rgba(8,9,7,0.88),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(230,227,220,0.03)_0%,transparent_18%,transparent_55%,rgba(8,9,7,0.48)_100%)]" />
        <div className="auth-noise absolute inset-0 opacity-32" />
      </div>

      <a
        href="#mc-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#a4823a] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#080907]"
      >
        Skip to content
      </a>
      <HomepageNav />
      <main id="mc-main" className="relative">
        <HomepageHero />
        <HomepageRealitySection />
        <HomepageOperatingSystemSection />
        <HomepageProductProofSection />
        <HomepageFoundingSection />
        <HomepageOnboardingSection />
        <HomepagePricingSection />

        <section
          aria-labelledby="mc-final-cta-heading"
          className="relative px-5 pb-10 pt-16 sm:px-8 sm:pb-12 sm:pt-20"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(230,227,220,0.22),transparent)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] px-5 py-8 text-center shadow-[0_1px_0_rgba(230,227,220,0.08)_inset] sm:px-8 sm:py-9">
            <h2
              id="mc-final-cta-heading"
              className="text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem] sm:leading-[1.25]"
            >
              Put your whole service business on one connected operating system.
            </h2>
            <p className="mx-auto mt-3.5 max-w-xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              Bring your customers, jobs, technicians, estimates, invoices, and
              payments into one connected operating system.
            </p>
            <div className="mt-7">
              <Link
                href="/signup"
                className={`mc-cta-primary inline-flex items-center justify-center rounded-lg bg-[#a4823a] px-5 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
              >
                Start Your 14-Day Free Trial
                <span className="ml-1.5 opacity-70" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
            <p className="mt-4 text-sm text-[#8e826f]">
              Credit card required. Live onboarding included. Cancel anytime.
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
