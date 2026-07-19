import { HomepageHero } from "@/shared/components/homepage/HomepageHero";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepageOperatingSystemSection } from "@/shared/components/homepage/HomepageOperatingSystemSection";
import { HomepageRealitySection } from "@/shared/components/homepage/HomepageRealitySection";

export function MissionControlHomepage() {
  return (
    <div className="mc-homepage min-h-dvh bg-[#070b10] text-[#f3ebdd]">
      <a
        href="#mc-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#b88a2e] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#070b10]"
      >
        Skip to content
      </a>
      <HomepageNav />
      <main id="mc-main">
        <HomepageHero />
        <HomepageRealitySection />
        <HomepageOperatingSystemSection />
      </main>
      <footer className="border-t border-[#223044]/80 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 text-sm text-[#8e826f] sm:flex-row sm:items-center">
          <p>Altair OS — Mission Control for the shop.</p>
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
