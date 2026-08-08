import Link from "next/link";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c]";

type LegalPageShellProps = {
  title: string;
  effectiveDate: string;
  intro: string;
  children: React.ReactNode;
};

/**
 * Shared shell for public legal documents (/privacy, /terms): dark marketing
 * chrome, readable light document body, marketing footer.
 */
export function LegalPageShell({
  title,
  effectiveDate,
  intro,
  children,
}: LegalPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#08090c]">
      <header className="border-b border-[rgba(222,228,236,0.08)] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between">
          <Link
            href="/"
            className={`inline-flex rounded-sm ${focusRing}`}
            aria-label="Altair OS home"
          >
            <AltairLogo variant="white" size="sm" showWordmark />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/pricing"
              className={`rounded-sm font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing}`}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className={`rounded-sm font-medium text-[#c9a44d] transition-colors hover:text-[#e6d092] ${focusRing}`}
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-[#fbf7ef] px-5 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#977d2a]">
            Altair OS
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-altair-display)] text-4xl tracking-tight text-[#17130e] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[#64748b]">
            Effective {effectiveDate}
          </p>
          <p className="mt-6 text-base leading-relaxed text-[#4f4638]">
            {intro}
          </p>
          <div className="mt-10 space-y-8">{children}</div>
        </article>
      </main>

      <MarketingFooter />
    </div>
  );
}

type LegalSectionProps = {
  heading: string;
  children: React.ReactNode;
};

export function LegalSection({ heading, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-[#17130e]">
        {heading}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#4f4638]">
        {children}
      </div>
    </section>
  );
}
