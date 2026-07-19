import Link from "next/link";
import { Lock, Network, Shield } from "lucide-react";
import { HomepageProductFrame } from "@/shared/components/homepage/HomepageProductFrame";
import { HOMEPAGE_SCREENSHOTS } from "@/shared/components/homepage/homepage-tokens";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e12]";

const TRUST = [
  { label: "Built for real shops", icon: Shield },
  { label: "Secure by design", icon: Lock },
  { label: "Connected end-to-end", icon: Network },
] as const;

export function HomepageHero() {
  return (
    <section
      aria-labelledby="mc-hero-heading"
      className="mc-hero relative overflow-hidden px-5 pb-10 pt-20 sm:px-8 sm:pb-12 sm:pt-24 lg:pb-14 lg:pt-28"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="mc-silver-bloom absolute right-[-2%] top-[4%] h-[36rem] w-[44rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(210,216,224,0.14)_0%,rgba(210,216,224,0.05)_40%,transparent_68%)] blur-2xl" />
        <div className="mc-silver-bloom absolute left-[6%] top-[18%] h-[20rem] w-[26rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(196,205,216,0.06)_0%,transparent_70%)] blur-xl" />
        <div className="absolute inset-x-0 top-[4.5rem] h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.34),transparent)]" />
        <div className="mc-silver-sweep absolute inset-x-0 top-[10%] h-44" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(8,9,12,0.96),transparent)]" />
      </div>

      <div className="relative mx-auto grid max-w-[90rem] gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.38fr)] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-8 lg:gap-y-0 xl:gap-x-10">
        <div className="mc-hero-copy max-w-xl text-center lg:max-w-none lg:self-end lg:text-left">
          <p className="mc-hero-stage mc-hero-stage-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c9a44d]">
            The operating system
          </p>
          <h1
            id="mc-hero-heading"
            className="mc-hero-stage mc-hero-stage-2 mt-3 text-[2.4rem] font-semibold leading-[1.06] tracking-[-0.02em] text-[#fff9ea] sm:mt-4 sm:text-[3.15rem] lg:text-[3.45rem] xl:text-[3.75rem]"
          >
            The operating system for{" "}
            <span className="text-[#c9a44d]">HVAC</span> companies.
          </h1>
          <p className="mc-hero-stage mc-hero-stage-3 mx-auto mt-3 max-w-lg text-base leading-[1.55] text-[#c9bfae] sm:mt-4 sm:text-lg lg:mx-0">
            One command center for the whole shop — leads, customers, jobs,
            dispatch, technicians, estimates, invoices, and payments.
          </p>
        </div>

        <div className="mc-hero-stage mc-hero-stage-deck relative mx-auto w-full max-w-none lg:col-start-2 lg:row-span-2 lg:-mr-2 lg:self-center xl:-mr-4">
          <div className="mc-hero-deck">
            <HomepageProductFrame
              src={HOMEPAGE_SCREENSHOTS.hero}
              alt="Altair OS Mission Control — North Star dashboard for HVAC companies"
              priority
              sizes="(max-width: 1024px) 100vw, 64vw"
            />
          </div>
        </div>

        <div className="mc-hero-copy flex flex-col items-stretch gap-5 text-center lg:self-start lg:pt-6 lg:text-left">
          <div className="mc-hero-stage mc-hero-stage-4 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
            <Link
              href="/signup"
              className={`mc-cta-primary inline-flex items-center justify-center rounded-lg bg-[#b88a2e] px-5 py-3.5 text-sm font-semibold text-[#08090c] transition-[background-color,transform] duration-200 hover:bg-[#c9a44d] active:translate-y-px ${focusRing}`}
            >
              Request Closed Beta Access
              <span className="ml-1.5 opacity-70" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href="#one-operating-system"
              className={`mc-cta-secondary inline-flex items-center justify-center rounded-lg border border-[rgba(222,228,236,0.16)] bg-[rgba(18,21,27,0.72)] px-5 py-3.5 text-sm font-semibold text-[#f3ebdd] transition-[border-color,background-color] duration-200 hover:border-[rgba(222,228,236,0.28)] hover:bg-[rgba(23,27,34,0.9)] ${focusRing}`}
            >
              <span className="mr-2 text-[0.65rem] opacity-70" aria-hidden="true">
                ▷
              </span>
              See how it runs
            </Link>
          </div>

          <ul className="mc-hero-stage mc-hero-stage-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:justify-start">
            {TRUST.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-xs font-medium tracking-wide text-[#8e826f] sm:text-[13px]"
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-[#c9a44d]/85"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
