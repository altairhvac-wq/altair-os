import Link from "next/link";
import { Check } from "lucide-react";
import { HomepageProductFrame } from "@/shared/components/homepage/HomepageProductFrame";
import { HOMEPAGE_SCREENSHOTS } from "@/shared/components/homepage/homepage-tokens";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c]";

const TRUST_ITEMS = [
  "Free during beta",
  "Setup support included",
  "Built for HVAC & the trades",
] as const;

/**
 * Homepage hero — centered product-forward composition.
 * Mission-led copy; the Mission Control screenshot carries the proof.
 */
export function HomepageHero() {
  return (
    <section
      aria-labelledby="ah-hero-heading"
      className="ah-hero relative isolate overflow-hidden px-5 pb-8 pt-20 sm:px-8 sm:pb-10 sm:pt-24 lg:px-12 lg:pb-12 lg:pt-24 xl:px-16"
    >
      {/* Soft graphite light — environment alive, product remains the brightest plane */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-x-[6%] top-[12%] h-[42%] bg-[radial-gradient(ellipse_at_center,rgba(210,216,224,0.09)_0%,transparent_68%)]" />
        <div className="absolute inset-x-[16%] bottom-0 h-[56%] bg-[radial-gradient(ellipse_at_bottom,rgba(210,216,224,0.07)_0%,transparent_70%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-[96rem]">
        <div className="mx-auto max-w-3xl text-center lg:max-w-[52rem]">
          <p className="ah-hero-fade ah-hero-fade-1 inline-flex items-center rounded-full border border-[rgba(222,228,236,0.14)] bg-[rgba(23,27,34,0.55)] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c9bfae]">
            Closed Beta Now Available
          </p>

          <h1
            id="ah-hero-heading"
            className="ah-hero-fade ah-hero-fade-2 ah-hero-display mt-4 text-[2.35rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:mt-5 sm:text-[3.25rem] sm:leading-[1.08] lg:mt-6 lg:text-[4.15rem] lg:leading-[1.05] xl:text-[4.65rem]"
          >
            Be more present
            <br />
            where it matters most.
          </h1>

          <p className="ah-hero-fade ah-hero-fade-3 mx-auto mt-3.5 max-w-[600px] text-[0.95rem] leading-[1.75] text-[#c9bfae] sm:mt-4 sm:text-lg sm:leading-[1.8]">
            Altair brings your customers, scheduling, technicians, jobs,
            estimates, invoices, and payments into one calm, connected operating
            system—so you can spend less time managing software and more time
            leading your business.
          </p>

          <div className="ah-hero-fade ah-hero-fade-4 mt-5 flex flex-col items-stretch justify-center gap-3 sm:mt-6 sm:flex-row sm:items-center sm:gap-3.5">
            <Link
              href="/signup"
              className={`inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#b88a2e] px-8 py-3.5 text-sm font-semibold text-[#08090c] transition-[background-color,transform] duration-200 hover:bg-[#c9a44d] active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 sm:w-auto ${focusRing}`}
            >
              Start Free Beta
            </Link>
            <Link
              href="/#about"
              className={`inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[rgba(222,228,236,0.18)] bg-transparent px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-[border-color,background-color] duration-200 hover:border-[rgba(222,228,236,0.32)] hover:bg-[rgba(23,27,34,0.45)] motion-reduce:transition-none sm:w-auto ${focusRing}`}
            >
              Watch Our Story
            </Link>
          </div>

          <ul className="ah-hero-fade ah-hero-fade-5 mx-auto mt-5 flex max-w-lg flex-row flex-wrap items-center justify-center gap-x-7 gap-y-2.5 sm:mt-6 sm:max-w-none sm:gap-x-10">
            {TRUST_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-1.5 text-[12px] text-[#8e826f]/88 sm:text-[13px]"
              >
                <Check
                  className="h-3 w-3 shrink-0 text-[#c9a44d]/65"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ah-hero-fade ah-hero-fade-6 ah-hero-product-stage relative mx-auto mt-7 w-[min(100%,calc(84rem*1.17))] max-w-none sm:mt-9 lg:mt-10">
          <div
            className="pointer-events-none absolute -inset-x-[8%] -inset-y-[10%] bg-[radial-gradient(ellipse_at_center,rgba(230,236,244,0.14)_0%,rgba(210,216,224,0.045)_44%,transparent_70%)]"
            aria-hidden="true"
          />
          <HomepageProductFrame
            src={HOMEPAGE_SCREENSHOTS.hero}
            alt="Altair Mission Control dashboard showing today's operations, mission-critical queues, cash flow, and technician activity"
            priority
            className="ah-hero-product"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 96vw, 1480px"
          />
        </div>
      </div>
    </section>
  );
}
