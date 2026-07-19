import Image from "next/image";
import Link from "next/link";
import { HOMEPAGE_SCREENSHOTS } from "@/shared/components/homepage/homepage-tokens";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1118]";

export function HomepageHero() {
  return (
    <section
      aria-labelledby="mc-hero-heading"
      className="mc-hero relative overflow-hidden px-5 pb-12 pt-24 sm:px-8 sm:pb-20 sm:pt-28"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(184,138,46,0.14),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(7,11,16,0.92),transparent)]" />
        <div className="absolute inset-x-0 top-[42%] h-px bg-[linear-gradient(to_right,transparent,rgba(201,164,77,0.22),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mc-hero-stage mc-hero-stage-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9a44d]">
            Altair OS
          </p>
          <h1
            id="mc-hero-heading"
            className="mc-hero-stage mc-hero-stage-2 mt-4 text-[2.05rem] font-semibold leading-[1.08] tracking-tight text-[#fff9ea] sm:text-[2.75rem] sm:leading-[1.05] lg:text-[3.15rem]"
          >
            The operating system for HVAC companies.
          </h1>
          <p className="mc-hero-stage mc-hero-stage-3 mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#c9bfae] sm:text-lg">
            One command center for the whole shop — leads, customers, jobs,
            dispatch, technicians, estimates, invoices, and payments.
          </p>

          <div className="mc-hero-stage mc-hero-stage-4 mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className={`mc-cta-primary inline-flex items-center justify-center rounded-lg bg-[#b88a2e] px-5 py-3 text-sm font-semibold text-[#070b10] transition-colors hover:bg-[#c9a44d] ${focusRing}`}
            >
              Request Closed Beta Access
            </Link>
            <Link
              href="#one-operating-system"
              className={`inline-flex items-center justify-center rounded-lg border border-[#223044] bg-[#101a28]/55 px-5 py-3 text-sm font-semibold text-[#f3ebdd] transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#101a28] ${focusRing}`}
            >
              See how it runs
            </Link>
          </div>

          <p className="mc-hero-stage mc-hero-stage-5 mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#8e826f]">
            Closed beta for a small group of HVAC and field-service companies.
            Built around real shop workflows — not bolt-on modules.
          </p>
        </div>

        <div className="mc-hero-stage mc-hero-stage-deck relative mx-auto mt-10 max-w-5xl sm:mt-12">
          <div className="mc-hero-deck relative mx-auto overflow-hidden rounded-xl border border-[rgba(201,164,77,0.18)] bg-[#0e141d] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.04] sm:rounded-2xl">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-[linear-gradient(to_right,transparent,rgba(201,164,77,0.45),transparent)]"
              aria-hidden="true"
            />
            <div className="relative aspect-[16/10] w-full bg-[#070b10]">
              <Image
                src={HOMEPAGE_SCREENSHOTS.dashboard}
                alt="Altair OS Mission Control dashboard showing Action, Work, and Money operating boards"
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1024px"
                className="object-cover object-top"
              />
              <div
                className="mc-hero-brass-pulse pointer-events-none absolute right-[12%] top-[18%] hidden h-2.5 w-2.5 rounded-full bg-[#c9a44d] sm:block"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
