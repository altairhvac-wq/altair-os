import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, Mail } from "lucide-react";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { ContactComposer } from "@/shared/components/marketing/ContactComposer";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { CONTACT_EXPECTATIONS, CONTACT_FAQ, CONTACT_PATH } from "@/shared/lib/site/contact";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

// 31 + " · Altair Operating System" = 57 characters; the description is 145.
const TITLE = "Contact Us and Common Questions";
const DESCRIPTION =
  "Email the people behind Altair Operating System, book the free one-on-one setup call, and get straight answers to the questions asked most often.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: CONTACT_PATH, title: `Contact ${PUBLIC_SITE_NAME}`, description: DESCRIPTION }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";

/** ContactPage with the one support address, the same one the page shows. */
function buildContactPageStructuredData(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${PUBLIC_SITE_NAME}`,
    url: `${PUBLIC_SITE_ORIGIN}${CONTACT_PATH}`,
    mainEntity: {
      "@type": "Organization",
      name: PUBLIC_SITE_NAME,
      url: PUBLIC_SITE_ORIGIN,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SUPPORT_EMAIL,
        availableLanguage: "English",
      },
    },
  };
}

/**
 * Visitors type /contact (the analytics saw it land on the 404 page). The
 * ways to reach us are the ones every other page already states: the email
 * and the one-on-one setup call. Batch 5 added a helper that writes the
 * email in the visitor's own mail app (nothing is sent from the site), what
 * to expect (only the reply times the product already promises), the
 * questions asked most, and FAQPage + ContactPage data from the same lists.
 */
export default function ContactPage() {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
  return (
    <div className="mc-homepage relative flex min-h-dvh flex-col overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <JsonLdScript data={buildContactPageStructuredData()} />
      <JsonLdScript data={buildFaqPageStructuredData(CONTACT_FAQ)} />
      <HomepageNav />
      <main className="relative flex-1 pb-20 pt-28 sm:pt-36">
        <div className="px-5 sm:px-8">
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-14">
            {/* ---------- left: who and how ---------- */}
            <div>
              <p className={eyebrow}>Contact</p>
              <h1 className="ah-hero-display mt-4 text-[2.3rem] font-normal leading-[1.08] tracking-[-0.015em] text-[#fff9ea] sm:text-[3.2rem]">
                Talk to a person.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-[#c9bfae] sm:text-lg sm:leading-[1.75]">
                Questions about the product, the trial, or whether Altair fits the way your company runs: write to us,
                and the founder reads it.
              </p>

              <div className="mt-8 space-y-3">
                <div className={`flex gap-4 p-5 ${card}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(194,160,90,0.12)] text-[#c2a05a]">
                    <Mail aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e826f]">Email</h2>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className={`mt-1 block break-all text-lg font-semibold text-[#fff9ea] underline-offset-4 hover:underline ${focusRing}`}
                    >
                      {SUPPORT_EMAIL}
                    </a>
                    <p className="mt-1 text-sm leading-relaxed text-[#c9bfae]">
                      Support, billing and sales questions all go to the same inbox.
                    </p>
                  </div>
                </div>
                <div className={`flex gap-4 p-5 ${card}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(194,160,90,0.12)] text-[#c2a05a]">
                    <CalendarClock aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e826f]">Setup call</h2>
                    <p className="mt-1 text-lg font-semibold text-[#fff9ea]">One-on-one, on Zoom</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#c9bfae]">
                      Every customer can book a free call: setup help, workflow guidance and your questions. You book it
                      from your workspace after you sign up.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  data-cta="contact"
                  className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-6 py-3 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
                >
                  Start Your {trialDays}-Day Free Trial
                </Link>
                <a
                  href="#faq"
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[rgba(230,227,220,0.18)] px-6 py-3 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`}
                >
                  Common questions
                  <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-90" />
                </a>
              </div>
            </div>

            {/* ---------- right: write to us ---------- */}
            <section
              aria-labelledby="contact-write-heading"
              className="rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] p-5 sm:p-7 md:mt-2"
            >
              <p className={eyebrow}>Write to us</p>
              <h2 id="contact-write-heading" className="mt-2 text-xl font-semibold text-[#fff9ea] sm:text-[1.4rem]">
                Say what you need, we take it from there
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">
                Pick a topic and write a few lines. It opens in your own email app, addressed to {SUPPORT_EMAIL}.
              </p>
              <div className="mt-6">
                <ContactComposer />
              </div>
            </section>
          </div>
        </div>

        {/* ---------- what to expect ---------- */}
        <section aria-labelledby="contact-expect-heading" className="mt-16 px-5 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow}>What happens next</p>
            <h2
              id="contact-expect-heading"
              className="mt-3 text-[1.5rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.9rem]"
            >
              Who answers, and when
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CONTACT_EXPECTATIONS.map((item) => (
                <li key={item.title} className={`flex flex-col p-5 ${card}`}>
                  <h3 className="text-[15px] font-semibold text-[#fff9ea]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#c9bfae]">{item.text}</p>
                  {item.href && item.linkLabel ? (
                    <Link
                      href={item.href}
                      className={`mt-auto inline-flex items-center gap-1 pt-3 text-[13px] font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`}
                    >
                      {item.linkLabel}
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <MarketingFaqSection
          variant="dark"
          items={CONTACT_FAQ}
          eyebrowText="Common questions"
          headingText="Answers to what people write in about."
          introText="The questions that come in most, answered from what the product does today."
        />

        <div className="px-5 sm:px-8">
          <NextStep
            className="mx-auto max-w-5xl"
            tone="dark"
            placement="contact"
            steps={NEXT_STEPS.contact}
            eyebrow="While you are here"
            heading="See it, try the free tools, or read up"
            trial={false}
          />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
