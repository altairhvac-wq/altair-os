import type { Metadata } from "next";
import Link from "next/link";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { SUPPORT_EMAIL } from "@/shared/lib/site/faq";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach the people behind Altair Operating System: email for questions and support, and live onboarding sessions twice a week for every customer.",
  ...buildPublicSocialMetadata({ path: "/contact" }),
};

/**
 * Visitors type /contact (the analytics saw it land on the 404 page). The
 * two ways to reach us are the ones every other page already states: the
 * email on the privacy and terms pages, and the live onboarding sessions.
 */
export default function ContactPage() {
  return (
    <div className="mc-homepage relative flex min-h-dvh flex-col bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
            Contact
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.5rem] sm:leading-[1.15]">
            Talk to a person.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#c9bfae]">
            Questions about the product, the trial, or whether Altair fits the
            way your company runs: write to us, and the founder reads it.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#c2a05a]">
                Email
              </h2>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-3 block break-all text-lg font-semibold text-[#fff9ea] underline-offset-4 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">
                Support, billing and sales questions all go to the same inbox.
              </p>
            </section>

            <section className="rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#c2a05a]">
                Live onboarding
              </h2>
              <p className="mt-3 text-lg font-semibold text-[#fff9ea]">
                Twice every week, on Zoom
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">
                Every customer can join: setup help, workflow guidance and open
                questions. The invitation is in your workspace after you sign up.
              </p>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-6 py-3 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a]"
            >
              Start Your 14-Day Free Trial
            </Link>
            <Link
              href="/pricing#faq"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-6 py-3 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)]"
            >
              Read the common questions
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
