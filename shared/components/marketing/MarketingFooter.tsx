import Link from "next/link";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

/**
 * The dispatch, estimating and invoicing pages were linked only from each
 * other, so a visitor (and a crawler) on any other page had no path to them.
 * They, and the calculators, are listed here with the rest.
 */
const FOOTER_LINKS = [
  { href: "/hvac-software", label: "Product" },
  { href: "/hvac-dispatch-software", label: "Dispatch" },
  { href: "/hvac-estimating-software", label: "Estimating" },
  { href: "/hvac-invoicing-software", label: "Invoicing" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/servicetitan-alternative", label: "vs ServiceTitan" },
  { href: "/jobber-housecall-pro-alternatives", label: "vs Jobber & Housecall Pro" },
  { href: "/pricing", label: "Pricing" },
  { href: "/insights", label: "Insights" },
  { href: "/resources", label: "Resources" },
  { href: "/resources/calculators", label: "Calculators" },
  { href: "/directory", label: "Contractor Directory" },
  { href: "/for-techs", label: "For Techs" },
  { href: "/affiliates", label: "Affiliates" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/login", label: "Sign In" },
  { href: "/signup", label: "Start Your 14-Day Free Trial", accent: true },
] as const;

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-[rgba(230,227,220,0.08)] bg-[#080907] px-5 py-5 sm:px-8 sm:py-6">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="max-w-sm">
          <Link
            href="/"
            className={`inline-flex rounded-sm ${focusRing}`}
            aria-label="Altair Operating System home"
          >
            <AltairLogo variant="white" size="sm" showWordmark />
          </Link>
          <p className="mt-2 text-sm leading-relaxed text-[#8e826f]">
            The operating system for field service businesses.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-5 gap-y-0.5 text-sm"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                // min-h-9: the links were 20px tall, too small to tap reliably.
                "inline-flex min-h-9 items-center rounded-sm font-medium transition-colors",
                "accent" in link && link.accent
                  ? "text-[#c2a05a] hover:text-[#e8d9ac]"
                  : "text-[#c9bfae] hover:text-[#f3ebdd]",
                focusRing,
              ].join(" ")}
            >
              {link.label}
            </Link>
          ))}
          {/* Most visitors arrive from one of these two channels; the site
              never linked back to either. */}
          {YOUTUBE_CHANNELS.map((channel) => (
            <a
              key={channel.key}
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-9 items-center rounded-sm font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing}`}
            >
              YouTube: {channel.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
