import Link from "next/link";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

const FOOTER_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/login", label: "Sign In" },
  { href: "/signup", label: "Start Your 14-Day Free Trial", accent: true },
] as const;

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-[rgba(222,228,236,0.08)] bg-[#080907] px-5 py-5 sm:px-8 sm:py-6">
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
            The operating system for field service businesses.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "rounded-sm font-medium transition-colors",
                "accent" in link && link.accent
                  ? "text-[#c2a05a] hover:text-[#e8d9ac]"
                  : "text-[#c9bfae] hover:text-[#f3ebdd]",
                focusRing,
              ].join(" ")}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
