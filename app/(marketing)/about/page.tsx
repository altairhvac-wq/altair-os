import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";
import { ABOUT_PATH, COMPANY_FACTS, FOUNDER, FOUNDER_PHOTO } from "@/shared/lib/site/about";
import { ALTAIR_NOT_YET } from "@/shared/lib/site/not-yet";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { buildOrganizationStructuredData } from "@/shared/lib/site/structured-data";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

const TITLE = "About";
const DESCRIPTION = `Who builds Altair Operating System: ${FOUNDER.name}, an HVAC company owner. Founded in ${COMPANY_FACTS.foundedYear}, based in ${COMPANY_FACTS.location}. One person answers the email and takes the setup calls.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: ABOUT_PATH, title: "About Altair Operating System", description: DESCRIPTION }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";
const heading = "text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]";
const body = "text-sm leading-relaxed text-[#c9bfae] sm:text-base";
const textLink = `font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`;

/**
 * Who is behind the product (site audit 2026-11-12: "built by an HVAC company
 * owner" was said in several places and nobody was named).
 *
 * Every statement about the founder and the company comes from
 * shared/lib/site/about.ts, and every statement about the product is one the
 * site already makes elsewhere. There is no story here that has not been
 * told to us: no years in the trade, no customer counts. The picture is the
 * one the owner supplied; it is shown small with no way to enlarge it
 * (FOUNDER_PHOTO in about.ts says why).
 */
export default function AboutPage() {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;

  return (
    <div className="mc-homepage relative flex min-h-dvh flex-col bg-[#080907] text-[#f3ebdd]">
      <JsonLdScript data={buildOrganizationStructuredData()} />
      <HomepageNav />
      <main className="relative flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-3xl">
          <div className="sm:flex sm:items-start sm:gap-8">
            <div className="min-w-0 flex-1">
              <p className={eyebrow}>About</p>
              <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.5rem] sm:leading-[1.15]">
                Built by an HVAC company owner.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-[#c9bfae] sm:text-lg">
                Altair Operating System is built by {FOUNDER.name}, who owns an HVAC company. It is made for HVAC
                companies first; plumbing, electrical and other field service trades run on the same workflow.
              </p>
            </div>
            {/* Small, not a link, and served as the one small file it is. */}
            <figure className="mx-auto mt-8 w-[240px] shrink-0 sm:mx-0 sm:mt-2 sm:w-[220px]">
              <Image
                src={FOUNDER_PHOTO.src}
                alt={FOUNDER_PHOTO.alt}
                width={FOUNDER_PHOTO.width}
                height={FOUNDER_PHOTO.height}
                unoptimized
                priority
                draggable={false}
                className="h-auto w-full select-none rounded-2xl border border-[rgba(230,227,220,0.14)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]"
              />
              <figcaption className="mt-2 text-center text-xs text-[#8e826f]">
                {FOUNDER.name}, founder, with family.
              </figcaption>
            </figure>
          </div>

          <dl className={`mt-10 grid gap-x-8 gap-y-5 px-5 py-6 sm:grid-cols-2 sm:px-8 ${card}`}>
            <div>
              <dt className={eyebrow}>Who</dt>
              <dd className="mt-1.5 text-base font-semibold text-[#fff9ea]">{FOUNDER.name}</dd>
              <dd className="text-sm text-[#c9bfae]">{FOUNDER.title}</dd>
            </div>
            <div>
              <dt className={eyebrow}>Where</dt>
              <dd className="mt-1.5 text-base font-semibold text-[#fff9ea]">{COMPANY_FACTS.location}</dd>
              <dd className="text-sm text-[#c9bfae]">Founded in {COMPANY_FACTS.foundedYear}</dd>
            </div>
            <div>
              <dt className={eyebrow}>Write to us</dt>
              <dd className="mt-1.5">
                <a href={`mailto:${SUPPORT_EMAIL}`} className={`break-all text-base ${textLink}`}>
                  {SUPPORT_EMAIL}
                </a>
              </dd>
              <dd className="text-sm text-[#c9bfae]">Support, billing and sales, one inbox</dd>
            </div>
            <div>
              <dt className={eyebrow}>Watch</dt>
              {YOUTUBE_CHANNELS.map((channel) => (
                <dd key={channel.key} className="mt-1.5 text-sm">
                  <a href={channel.url} target="_blank" rel="noopener noreferrer" className={textLink}>
                    {channel.label} on YouTube<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </dd>
              ))}
            </div>
          </dl>

          <section aria-labelledby="about-small-heading" className="mt-14">
            <h2 id="about-small-heading" className={heading}>
              A small company
            </h2>
            <div className={`mt-4 space-y-4 ${body}`}>
              <p>
                When you write to {SUPPORT_EMAIL}, the founder reads it. When you book the setup call, it is a
                one-on-one call on Zoom, and you can bring any question: setup, importing your customers, pricing,
                your first jobs.
              </p>
              <p>
                There is no sales team and no long contract. You try the whole system for {trialDays} days without a
                credit card. If you stay, you pay by the month or the year and can cancel from Settings.
              </p>
            </div>
          </section>

          <section aria-labelledby="about-honest-heading" className="mt-14">
            <h2 id="about-honest-heading" className={heading}>
              What it does not do yet
            </h2>
            <p className={`mt-4 ${body}`}>
              You would find these in the first week of a trial, so here they are now. Each one says what exists
              today instead.
            </p>
            <ul className="mt-5 space-y-3">
              {ALTAIR_NOT_YET.map((item) => (
                <li key={item.title} className={`px-5 py-4 ${card}`}>
                  <p className="text-sm font-semibold text-[#fff9ea]">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#c9bfae]">{item.today}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="about-data-heading" className="mt-14">
            <h2 id="about-data-heading" className={heading}>
              Your records stay yours
            </h2>
            <p className={`mt-4 ${body}`}>
              The owner of a workspace can download every record in it as one file from Settings: customers, jobs,
              estimates, invoices, payments and the rest. How data is handled is written in plain words in the{" "}
              <Link href="/privacy" className={textLink}>
                privacy policy
              </Link>{" "}
              and the{" "}
              <Link href="/terms" className={textLink}>
                terms
              </Link>
              .
            </p>
          </section>

          <div className={`mt-14 px-5 py-8 text-center sm:px-8 ${card}`}>
            <h2 className={heading}>See it for yourself</h2>
            <p className={`mx-auto mt-3 max-w-xl ${body}`}>
              Watch one job go from the first call to the paid invoice, or start a trial and run your own.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                data-cta="about"
                className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
              >
                Start Your {trialDays}-Day Free Trial
              </Link>
              <Link
                href="/how-it-works"
                className={`inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`}
              >
                Watch the 2-minute video
              </Link>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
