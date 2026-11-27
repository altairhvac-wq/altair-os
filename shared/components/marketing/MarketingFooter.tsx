import Link from "next/link";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { FooterColumn } from "@/shared/components/marketing/phone/PhoneLayout";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

type FooterLink = { readonly href: string; readonly label: string; readonly accent?: boolean };

/**
 * The footer, in four columns.
 *
 * The dispatch, estimating and invoicing pages were once linked only from
 * each other, so a visitor (and a crawler) on any other page had no path to
 * them; they stay here. The "Free tools" column (2026-11-20) names each tool
 * the way owners search for it, so every page on the site links to the two
 * workspaces and the calculators people use most.
 */
const FOOTER_COLUMNS: readonly { readonly title: string; readonly links: readonly FooterLink[] }[] = [
  {
    title: "Software",
    links: [
      { href: "/hvac-software", label: "HVAC Software" },
      { href: "/hvac-dispatch-software", label: "HVAC Dispatch Software" },
      { href: "/hvac-estimating-software", label: "HVAC Estimating Software" },
      { href: "/hvac-invoicing-software", label: "HVAC Invoicing Software" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/servicetitan-alternative", label: "vs ServiceTitan" },
      { href: "/jobber-housecall-pro-alternatives", label: "vs Jobber & Housecall Pro" },
      { href: "/switch", label: "Switch From Another App" },
    ],
  },
  {
    title: "Free tools",
    links: [
      { href: "/insights/how-to-calculate-hvac-labor-rate", label: "Labor Rate Calculator" },
      { href: "/insights/hvac-invoice-template", label: "Invoice Builder" },
      { href: "/resources/calculators/technician-pay", label: "Technician Pay Calculator" },
      { href: "/resources/calculators/break-even", label: "Break-Even Calculator" },
      { href: "/resources/calculators/maintenance-agreement", label: "Maintenance Agreement Pricing" },
      { href: "/resources/calculators/job-profitability", label: "Job Profitability Calculator" },
      { href: "/resources/calculators/callback-cost", label: "Callback Cost Calculator" },
      { href: "/resources/calculators/service-call-fee", label: "Service Call Fee Calculator" },
      { href: "/resources/templates", label: "Templates" },
      { href: "/resources", label: "All Free Tools" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/insights", label: "Guides" },
      { href: "/resources/guides", label: "New Owner? Start Here" },
      { href: "/resources/library", label: "Videos and Articles" },
      { href: "/utah/hvac-labor-rates", label: "Utah HVAC Labor Rates" },
      { href: "/for-techs", label: "For Technicians" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/directory", label: "Contractor Directory" },
      { href: "/directory/list", label: "List Your Business" },
      { href: "/affiliates", label: "Affiliates" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/login", label: "Sign In" },
      { href: "/signup", label: "Start Your 14-Day Free Trial", accent: true },
    ],
  },
];

const linkClass = (accent?: boolean) =>
  [
    // min-h-9: the links were 20px tall, too small to tap reliably.
    "inline-flex min-h-9 items-center rounded-sm text-sm font-medium transition-colors",
    accent ? "text-[#c2a05a] hover:text-[#e8d9ac]" : "text-[#c9bfae] hover:text-[#f3ebdd]",
    focusRing,
  ].join(" ");

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-[rgba(230,227,220,0.08)] bg-[#080907] px-5 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-[90rem] gap-8 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-12">
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
          {/* Most visitors arrive from one of these two channels; the site
              never linked back to either. */}
          <ul className="mt-4 space-y-0.5">
            {YOUTUBE_CHANNELS.map((channel) => (
              <li key={channel.key}>
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass()}
                >
                  YouTube: {channel.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* On a phone each column folds into a tap-to-open row (owner, 2026-11-23: the
            footer alone was over a screen long). The links stay in the page either way. */}
        <nav aria-label="Footer" className="grid grid-cols-1 border-t border-white/10 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 sm:border-t-0 md:grid-cols-4">
          {FOOTER_COLUMNS.map((column) => (
            <FooterColumn key={column.title} title={column.title}>
              <ul className="sm:mt-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass(link.accent)}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterColumn>
          ))}
        </nav>
      </div>
    </footer>
  );
}
