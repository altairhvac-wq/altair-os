import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Mail, MapPin, PlayCircle, UserRound } from "lucide-react";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { NextStep } from "@/shared/components/site/NextStep";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";
import {
  ABOUT_PATH,
  ABOUT_TIMELINE,
  COMPANY_FACTS,
  DECISION_QUESTIONS,
  FOUNDER,
  FOUNDER_PHOTO,
  MISSION_STATEMENT,
} from "@/shared/lib/site/about";
import { ALTAIR_NOT_YET } from "@/shared/lib/site/not-yet";
import { PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { buildOrganizationStructuredData } from "@/shared/lib/site/structured-data";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

// 29 + " · Altair Operating System" = 55 characters; the description is 154.
const TITLE = "About the Company and Founder";
const DESCRIPTION = `Altair Operating System is built by ${FOUNDER.name}, an HVAC company owner in ${COMPANY_FACTS.location}. What it does, what it doesn't yet, and when it shipped.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: ABOUT_PATH, title: "About Altair Operating System", description: DESCRIPTION }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";
const heading = "mt-3 text-[1.5rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.9rem] sm:leading-[1.2]";
const body = "text-sm leading-relaxed text-[#c9bfae] sm:text-base";
const textLink = `font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`;

/** AboutPage around the same Organization the homepage describes. */
function buildAboutPageStructuredData(): Record<string, unknown> {
  const organization = buildOrganizationStructuredData();
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${PUBLIC_SITE_NAME}`,
    url: `${PUBLIC_SITE_ORIGIN}${ABOUT_PATH}`,
    description: DESCRIPTION,
    // The Organization without its own @context, nested inside this one.
    mainEntity: Object.fromEntries(Object.entries(organization).filter(([key]) => key !== "@context")),
  };
}

/**
 * Who is behind the product (site audit 2026-11-12: "built by an HVAC company
 * owner" was said in several places and nobody was named).
 *
 * Every statement about the founder and the company comes from
 * shared/lib/site/about.ts, and every statement about the product is one the
 * site already makes elsewhere. There is no story here that has not been
 * told to us: no years in the trade, no customer counts. The mission line and
 * the five questions are quoted from docs/foundation; the timeline dates are
 * from git (about.ts names the commit or pull request for each). The picture
 * is the one the owner supplied; it is shown small with no way to enlarge it
 * (FOUNDER_PHOTO in about.ts says why).
 *
 * Batch 5 (2026-11-20 site audit: /about "discovered, not indexed"): the
 * canonical and robots were already right, so the fixes are a title that
 * says what the page is, more of the page's own substance, AboutPage data
 * and links on to the rest of the site.
 */
export default function AboutPage() {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;

  return (
    <div className="mc-homepage relative flex min-h-dvh flex-col overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <JsonLdScript data={buildAboutPageStructuredData()} />
      <HomepageNav />
      <main className="relative flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-36">
        {/* ---------- hero ---------- */}
        <div className="mx-auto max-w-5xl">
          <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_260px] md:gap-14">
            <div className="min-w-0">
              <p className={eyebrow}>About</p>
              <h1 className="ah-hero-display mt-4 text-[2.3rem] font-normal leading-[1.08] tracking-[-0.015em] text-[#fff9ea] sm:text-[3.2rem]">
                Built by an HVAC company owner.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#c9bfae] sm:text-lg sm:leading-[1.75]">
                Altair Operating System is built by {FOUNDER.name}, who owns an HVAC company. It is made for HVAC
                companies first; plumbing, electrical and other field service trades run on the same workflow.
              </p>

              {/*
                ============ FOUNDER STORY: THE OWNER'S OWN WORDS GO HERE ============
                Reserved for the founder's story, written and approved by the
                owner (site upgrade plan 2026-11-20, "what waits on the owner",
                item 4). Nothing is shown until he supplies it. Do not draft,
                paraphrase or fill this from anything else: no years in the
                trade, no origin story, no customer counts.
              */}

              <dl className={`mt-8 grid gap-px overflow-hidden sm:grid-cols-2 ${card}`}>
                <div className="flex gap-3 bg-[rgba(14,17,13,0.6)] px-5 py-4">
                  <UserRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#c2a05a]" />
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e826f]">Who</dt>
                    <dd className="mt-1 text-[15px] font-semibold text-[#fff9ea]">{FOUNDER.name}</dd>
                    <dd className="text-sm text-[#c9bfae]">{FOUNDER.title}</dd>
                  </div>
                </div>
                <div className="flex gap-3 bg-[rgba(14,17,13,0.6)] px-5 py-4">
                  <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#c2a05a]" />
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e826f]">Where</dt>
                    <dd className="mt-1 text-[15px] font-semibold text-[#fff9ea]">{COMPANY_FACTS.location}</dd>
                    <dd className="text-sm text-[#c9bfae]">Founded in {COMPANY_FACTS.foundedYear}</dd>
                  </div>
                </div>
                <div className="flex gap-3 bg-[rgba(14,17,13,0.6)] px-5 py-4">
                  <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#c2a05a]" />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e826f]">Write to us</dt>
                    <dd className="mt-1">
                      <a href={`mailto:${SUPPORT_EMAIL}`} className={`break-all text-[15px] ${textLink}`}>
                        {SUPPORT_EMAIL}
                      </a>
                    </dd>
                    <dd className="text-sm text-[#c9bfae]">Support, billing and sales, one inbox</dd>
                  </div>
                </div>
                <div className="flex gap-3 bg-[rgba(14,17,13,0.6)] px-5 py-4">
                  <PlayCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#c2a05a]" />
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8e826f]">Watch</dt>
                    {YOUTUBE_CHANNELS.map((channel) => (
                      <dd key={channel.key} className="mt-1 text-sm">
                        <a href={channel.url} target="_blank" rel="noopener noreferrer" className={textLink}>
                          {channel.label} on YouTube<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </dd>
                    ))}
                  </div>
                </div>
              </dl>
            </div>

            {/* Small, not a link, and served as the one small file it is. */}
            <figure className="mx-auto w-[240px] shrink-0 md:mx-0 md:mt-10 md:w-full">
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
        </div>

        {/* ---------- why, and how decisions get made ---------- */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-2">
          <section aria-labelledby="about-why-heading" className={`px-6 py-7 sm:px-8 sm:py-8 ${card}`}>
            <p className={eyebrow}>Why it exists</p>
            <h2 id="about-why-heading" className="sr-only">
              Why it exists
            </h2>
            <blockquote className="ah-hero-display mt-4 text-[1.35rem] leading-[1.4] text-[#fff9ea] sm:text-[1.6rem]">
              &ldquo;{MISSION_STATEMENT}&rdquo;
            </blockquote>
            <p className="mt-4 text-xs text-[#8e826f]">From the company&apos;s mission, as written.</p>
          </section>
          <section aria-labelledby="about-decide-heading" className={`px-6 py-7 sm:px-8 sm:py-8 ${card}`}>
            <p className={eyebrow}>How we decide</p>
            <h2 id="about-decide-heading" className="mt-3 text-lg font-semibold text-[#fff9ea]">
              Every decision should answer yes to five questions
            </h2>
            <ol className="mt-4 space-y-2.5">
              {DECISION_QUESTIONS.map((question, index) => (
                <li key={question} className="flex gap-3 text-sm leading-relaxed text-[#c9bfae]">
                  <span className="font-mono text-xs font-semibold leading-6 text-[#c2a05a]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ---------- a small company ---------- */}
        <div className="mx-auto mt-16 max-w-5xl">
          <section aria-labelledby="about-small-heading" className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-12">
            <div>
              <p className={eyebrow}>Who you deal with</p>
              <h2 id="about-small-heading" className={heading}>
                A small company
              </h2>
            </div>
            <div className={`space-y-4 ${body}`}>
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
        </div>

        {/* ---------- timeline ---------- */}
        <div className="mx-auto mt-16 max-w-5xl">
          <section aria-labelledby="about-timeline-heading">
            <p className={eyebrow}>What shipped, and when</p>
            <h2 id="about-timeline-heading" className={heading}>
              The work so far
            </h2>
            <p className={`mt-3 max-w-2xl ${body}`}>
              Each date is the month the work was released, taken from the product&apos;s own change history.
            </p>
            <ol className="relative mt-8 space-y-4 border-l border-[rgba(194,160,90,0.3)] pl-6 sm:pl-8">
              {ABOUT_TIMELINE.map((entry) => (
                <li key={entry.month} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[31px] top-5 h-3 w-3 rounded-full border-2 border-[#080907] bg-[#c2a05a] sm:-left-[39px]"
                  />
                  <div className={`px-5 py-4 sm:px-6 sm:py-5 ${card}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#e8d9ac]">
                      <time dateTime={entry.month}>{entry.label}</time>
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {entry.items.map((item) => (
                        <li key={item.text} className="flex gap-2.5 text-sm leading-relaxed text-[#c9bfae] sm:text-[15px]">
                          <Check aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-[#c2a05a]" />
                          {item.href ? (
                            <Link href={item.href} className={`hover:text-[#fff9ea] hover:underline underline-offset-4 ${focusRing}`}>
                              {item.text}
                            </Link>
                          ) : (
                            <span>{item.text}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ---------- honest gaps and data ---------- */}
        <div className="mx-auto mt-16 max-w-5xl">
          <section aria-labelledby="about-honest-heading">
            <p className={eyebrow}>Said up front</p>
            <h2 id="about-honest-heading" className={heading}>
              What it does not do yet
            </h2>
            <p className={`mt-3 max-w-2xl ${body}`}>
              You would find these in the first week of a trial, so here they are now. Each one says what exists today
              instead.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {ALTAIR_NOT_YET.map((item) => (
                <li key={item.title} className={`px-5 py-4 ${card}`}>
                  <p className="text-sm font-semibold text-[#fff9ea]">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#c9bfae]">{item.today}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="about-data-heading" className={`mt-6 px-6 py-6 sm:px-8 ${card}`}>
            <h2 id="about-data-heading" className="text-lg font-semibold text-[#fff9ea]">
              Your records stay yours
            </h2>
            <p className={`mt-2 ${body}`}>
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
        </div>

        {/* ---------- see it ---------- */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] px-6 py-9 text-center sm:px-10">
            <h2 className="text-[1.5rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.9rem]">
              See it for yourself
            </h2>
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
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`}
              >
                Watch the 2-minute video
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-5xl">
          <NextStep tone="dark" placement="about" steps={NEXT_STEPS.about} eyebrow="Keep going" trial={false} />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
