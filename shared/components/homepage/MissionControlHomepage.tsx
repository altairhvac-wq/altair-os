import { HomepageHero } from "@/shared/components/homepage/HomepageHero";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepageOperatingSystemSection } from "@/shared/components/homepage/HomepageOperatingSystemSection";
import { HomepageRealitySection } from "@/shared/components/homepage/HomepageRealitySection";

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
      </main>
      <footer className="relative border-t border-[rgba(222,228,236,0.08)] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[90rem] flex-col items-start justify-between gap-4 text-sm text-[#8e826f] sm:flex-row sm:items-center">
          <p>Altair OS — the operating system for HVAC companies.</p>
          <p>
            <a
              href="/login"
              className="font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55"
            >
              Sign in
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
