import Link from "next/link";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { HomepageHero } from "@/shared/components/homepage/HomepageHero";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepageOperatingSystemSection } from "@/shared/components/homepage/HomepageOperatingSystemSection";
import { HomepageRealitySection } from "@/shared/components/homepage/HomepageRealitySection";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c]";

export function MissionControlHomepage() {
  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip text-[#f3ebdd]">
      <div className="mc-atmosphere pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[#08090c]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_130%_85%_at_50%_-20%,#171b22_0%,transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_78%_52%_at_50%_10%,rgba(210,216,224,0.11)_0%,rgba(210,216,224,0.03)_42%,transparent_68%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_42%_at_86%_26%,rgba(196,205,216,0.055),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_38%_at_10%_36%,rgba(180,188,198,0.04),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_42%_at_50%_100%,rgba(8,9,12,0.95),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(222,228,236,0.025)_0%,transparent_18%,transparent_55%,rgba(8,9,12,0.6)_100%)]" />
      </div>

      <a
        href="#mc-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#b88a2e] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#08090c]"
      >
        Skip to content
      </a>
      <HomepageNav />
      <main id="mc-main" className="relative">
        <HomepageHero />
        <HomepageRealitySection />
        <HomepageOperatingSystemSection />

        <section
          aria-labelledby="mc-final-cta-heading"
          className="relative px-5 pb-8 pt-4 sm:px-8 sm:pb-9 sm:pt-5"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.22),transparent)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-2xl rounded-2xl border border-[rgba(222,228,236,0.12)] bg-[linear-gradient(165deg,rgba(32,36,44,0.72)_0%,rgba(14,16,20,0.92)_100%)] px-5 py-6 text-center shadow-[0_1px_0_rgba(222,228,236,0.08)_inset] sm:px-8 sm:py-7">
            <h2
              id="mc-final-cta-heading"
              className="text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.65rem]"
            >
              Ready to run your shop from one system?
            </h2>
            <p className="mx-auto mt-2.5 max-w-xl text-sm leading-relaxed text-[#c9bfae]">
              Join the Altair OS closed beta and help shape the operating system
              built for real HVAC companies.
            </p>
            <div className="mt-5">
              <Link
                href="/signup"
                className={`mc-cta-primary inline-flex items-center justify-center rounded-lg bg-[#b88a2e] px-5 py-3.5 text-sm font-semibold text-[#08090c] transition-colors hover:bg-[#c9a44d] ${focusRing}`}
              >
                Request Closed Beta Access
                <span className="ml-1.5 opacity-70" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-[rgba(222,228,236,0.08)] px-5 py-5 sm:px-8 sm:py-6">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="max-w-sm">
            <Link
              href="/"
              className={`inline-flex rounded-sm ${focusRing}`}
              aria-label="Altair OS home"
            >
              <AltairLogo variant="white" size="sm" showWordmark />
            </Link>
            <p className="mt-2 text-sm leading-relaxed text-[#8e826f]">
              The operating system for HVAC companies.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
          >
            <a
              href="#product"
              className={`font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing} rounded-sm`}
            >
              Product
            </a>
            <Link
              href="/pricing"
              className={`font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing} rounded-sm`}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className={`font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing} rounded-sm`}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className={`font-medium text-[#c9a44d] transition-colors hover:text-[#e6d092] ${focusRing} rounded-sm`}
            >
              Request Closed Beta Access
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
