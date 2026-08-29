import Link from "next/link";
import {
  CircleHelp,
  Lightbulb,
  Settings2,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const ONBOARDING_ITEMS: { title: string; detail: string; icon: LucideIcon }[] = [
  {
    title: "Business setup",
    detail: "Configure Altair around your company, team, and day-to-day operation.",
    icon: Settings2,
  },
  {
    title: "Workflow guidance",
    detail: "Connect the path from new lead through completed work and payment.",
    icon: Workflow,
  },
  {
    title: "Best practices",
    detail: "Learn practical ways to keep office and field teams working together.",
    icon: Lightbulb,
  },
  {
    title: "Live Q&A",
    detail: "Bring real questions and get more from Altair as your business grows.",
    icon: CircleHelp,
  },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";

export function HomepageOnboardingSection() {
  return (
    <section
      id="onboarding"
      aria-labelledby="mc-onboarding-heading"
      className="relative scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(230,227,220,0.2),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-[12%] top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(194,160,90,0.09),transparent_72%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-[78rem] gap-8 rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(145deg,rgba(31,36,29,0.8),rgba(12,15,11,0.9))] p-5 shadow-[0_1px_0_rgba(230,227,220,0.08)_inset] sm:p-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 lg:p-10">
        <div className="lg:py-2">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(194,160,90,0.35)] bg-[rgba(164,130,58,0.1)]">
            <Video
              className="h-5 w-5 text-[#c2a05a]"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </span>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c2a05a]">
            Included customer success
          </p>
          <h2
            id="mc-onboarding-heading"
            className="mt-3 text-[1.85rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.35rem] sm:leading-[1.15]"
          >
            Live onboarding, twice every week.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#c9bfae]">
            Every Altair customer can join live Zoom onboarding sessions for
            practical guidance from setup through daily use. Come once, return
            whenever it helps, and bring the questions that matter to your team.
          </p>
          <Link
            href="/signup"
            className={`mc-cta-primary mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-5 py-3 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
          >
            Start Your 14-Day Free Trial
          </Link>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {ONBOARDING_ITEMS.map(({ title, detail, icon: Icon }) => (
            <li
              key={title}
              className="rounded-xl border border-[rgba(230,227,220,0.1)] bg-[rgba(8,9,7,0.46)] p-4 sm:p-5"
            >
              <Icon
                className="h-4.5 w-4.5 text-[#c2a05a]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h3 className="mt-3 text-sm font-semibold text-[#fff9ea] sm:text-base">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9a9080]">
                {detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
