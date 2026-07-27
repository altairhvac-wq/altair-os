import Link from "next/link";
import {
  Check,
  Handshake,
  MessageCircle,
  Route,
  ShieldCheck,
  Unlock,
  type LucideIcon,
} from "lucide-react";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c]";

const FOUNDING_BENEFITS = [
  "3 months free",
  "Lock in today's pricing while you remain a customer",
  "Direct access to the founder during onboarding",
  "Priority support during beta",
  "Influence future features and roadmap",
] as const;

const SWITCHING_POINTS: { label: string; icon: LucideIcon }[] = [
  { label: "We'll help you get started.", icon: Handshake },
  { label: "Direct access to the founder during beta.", icon: MessageCircle },
  { label: "No long-term contracts.", icon: ShieldCheck },
  { label: "Cancel anytime.", icon: Unlock },
  { label: "Built specifically for HVAC companies.", icon: Route },
];

export function HomepageFoundingSection() {
  return (
    <>
      <section
        aria-labelledby="mc-founding-heading"
        className="mc-founding relative scroll-mt-28 px-5 py-12 sm:px-8 sm:py-14"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.22),transparent)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-[12%] top-0 h-24 bg-[radial-gradient(ellipse_at_top,rgba(201,164,77,0.08),transparent_70%)]"
          aria-hidden="true"
        />

        <div id="founding-member" className="relative mx-auto max-w-[90rem]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9a44d]">
              Closed Beta
            </p>
            <h2
              id="mc-founding-heading"
              className="mt-3 text-[1.85rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.35rem] sm:leading-[1.15]"
            >
              Become a Founding Member
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#c9bfae] sm:text-lg">
              Join Altair OS during our Closed Beta and help shape the operating
              system built for real HVAC companies.
            </p>
          </div>

          <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:mt-10 sm:grid-cols-2">
            {FOUNDING_BENEFITS.map((benefit, index) => {
              const isLastOdd =
                index === FOUNDING_BENEFITS.length - 1 &&
                FOUNDING_BENEFITS.length % 2 === 1;
              return (
                <li
                  key={benefit}
                  className={[
                    "mc-glass-card flex items-start gap-3 rounded-2xl px-4 py-4",
                    isLastOdd
                      ? "sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.375rem)]"
                      : "",
                  ].join(" ")}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgba(201,164,77,0.4)] bg-[rgba(184,138,46,0.1)]">
                    <Check
                      className="h-3.5 w-3.5 text-[#c9a44d]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-sm font-medium leading-snug text-[#f3ebdd] sm:text-[0.95rem]">
                    {benefit}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-[#9a9080] sm:text-[0.95rem]">
            We intentionally onboard a limited number of companies at a time so
            every customer receives hands-on onboarding, direct support, and a
            smooth transition into Altair OS.
          </p>

          <div className="mt-7 flex justify-center">
            <Link
              href="/signup"
              className={`mc-cta-primary inline-flex items-center justify-center rounded-lg bg-[#b88a2e] px-5 py-3.5 text-sm font-semibold text-[#08090c] transition-colors hover:bg-[#c9a44d] ${focusRing}`}
            >
              Request Closed Beta Access
              <span className="ml-1.5 opacity-70" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="mc-switching-heading"
        className="mc-switching relative px-5 py-10 sm:px-8 sm:py-12"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.16),transparent)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <h2
            id="mc-switching-heading"
            className="text-[1.55rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.85rem] sm:leading-[1.2]"
          >
            Switching software shouldn&apos;t slow your business down.
          </h2>

          <ul className="mt-7 flex flex-col items-stretch gap-3 sm:mx-auto sm:max-w-xl">
            {SWITCHING_POINTS.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-[rgba(222,228,236,0.1)] bg-[rgba(14,16,20,0.45)] px-4 py-3 text-left"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-[#c9a44d]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="text-sm leading-snug text-[#c9bfae]">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="about"
        aria-labelledby="mc-about-heading"
        className="mc-about relative scroll-mt-28 px-5 py-14 sm:px-8 sm:py-20"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.16),transparent)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-[18%] top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(201,164,77,0.06),transparent_72%)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9a44d]">
            A note from the founder
          </p>
          <h2
            id="mc-about-heading"
            className="mt-5 text-[1.65rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.1rem] sm:leading-[1.2]"
          >
            Built by someone who understands what it means to carry a business.
          </h2>
          <div className="mx-auto mt-6 space-y-5 text-base leading-relaxed text-[#c9bfae] sm:mt-7 sm:text-lg sm:leading-[1.75]">
            <p>
              Altair was not created because the world needed another software
              company.
            </p>
            <p>
              It was built because running a field-service business should not
              mean spending every evening chasing paperwork, fixing schedules,
              and answering calls after everyone else has gone home.
            </p>
            <p>
              I wanted one calm, connected system that could help owners spend
              less time fighting software and more time leading their teams,
              serving their customers, and being present with their families.
            </p>
            <p className="text-[#f3ebdd]">
              That is what Altair is being built to become.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
