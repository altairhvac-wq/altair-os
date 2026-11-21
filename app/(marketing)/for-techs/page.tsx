import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator, PlayCircle, RotateCcw, Smartphone } from "lucide-react";
import { listPublicSaasCatalogPlans, SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { BossShareButtons } from "@/shared/components/marketing/BossShareButtons";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { calculatorPath, RESOURCES_LIBRARY_PATH } from "@/shared/lib/resources/catalog";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";
import { FOR_TECHS_PATH } from "@/shared/lib/site/about";
import { COMMERCIAL_JOB_STEPS, VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { TECH_DAY, TECH_FAQ, TECH_SCREENS } from "@/shared/lib/site/for-techs";
import { PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";

// 34 + " · Altair Operating System" = 60 characters; the description is 148.
const TITLE = "HVAC Technician App and Free Tools";
const DESCRIPTION =
  "Real screens of the technician phone view, your day from clock-in to Complete Work, plus free pay and callback calculators and HVAC training videos.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: FOR_TECHS_PATH, title: "For HVAC technicians", description: DESCRIPTION }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";
const heading = "mt-3 text-[1.5rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.9rem] sm:leading-[1.2]";
const textLink = `font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`;

/** A phone-shaped frame around one real capture. */
function PhoneShot({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="rounded-[2.1rem] border border-[rgba(230,227,220,0.16)] bg-[#141712] p-2 shadow-[0_30px_70px_-35px_rgba(0,0,0,0.95)]">
      <div className="overflow-hidden rounded-[1.6rem] bg-[#f4f1ea]">
        <Image
          src={src}
          alt={alt}
          width={540}
          height={960}
          sizes="(min-width: 768px) 260px, 220px"
          priority={priority}
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}

/**
 * A page for the person in the truck (site audit 2026-11-12: most visitors
 * come from the HVAC training videos, and many of them are technicians, not
 * owners). It shows the phone view as it really looks (sample-company
 * captures, see shared/lib/site/for-techs.ts), walks through a day on it,
 * gives the two calculators about their own week, points them at the videos,
 * and makes it one tap to send the site to whoever does buy software.
 */
export default function ForTechsPage() {
  const prices = listPublicSaasCatalogPlans()
    .map((plan) => plan.monthlyPriceUsd)
    .filter((price): price is number => typeof price === "number");
  const fromPrice = prices.length ? Math.min(...prices) : null;
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
  const training = YOUTUBE_CHANNELS.find((channel) => channel.key === "hvac-exploration");
  // The chapter where the job runs on the technician's phone (times read from the video).
  const phoneChapter = COMMERCIAL_JOB_STEPS.find((step) => /phone/i.test(step.title) && /tech/i.test(step.title));

  // One short tag, so the link still looks like a link in a text message.
  const shareUrl = `${PUBLIC_SITE_ORIGIN}/?utm_source=tech-share`;
  const shareMessage = `Worth a look for the shop: Altair Operating System. Jobs, dispatch, estimates and invoices in one place, and we would get our day on our phones. ${trialDays} days free, no credit card${fromPrice !== null ? `, then from $${fromPrice} a month` : ""}.`;

  return (
    <div className="mc-homepage relative flex min-h-dvh flex-col overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <JsonLdScript data={buildFaqPageStructuredData(TECH_FAQ)} />
      <HomepageNav />
      <main className="relative flex-1 pb-20 pt-28 sm:pt-36">
        {/* ---------- hero ---------- */}
        <section className="px-5 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow}>For technicians</p>
            <h1 className="ah-hero-display mt-4 max-w-3xl text-[2.3rem] font-normal leading-[1.08] tracking-[-0.015em] text-[#fff9ea] sm:text-[3.2rem]">
              For the tech in the truck.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#c9bfae] sm:text-lg sm:leading-[1.75]">
              You probably do not buy the software. You are the one who lives with it. Here is what Altair looks like
              on your phone, a day on it from clock-in to the last job, two free tools about your own week and the
              training videos.
            </p>
            <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
              {[
                { href: "#phone", label: "The phone view", icon: Smartphone },
                { href: "#day", label: "Your day on it", icon: RotateCcw },
                { href: "#tools", label: "Free calculators", icon: Calculator },
                { href: "#videos", label: "Training videos", icon: PlayCircle },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(230,227,220,0.16)] px-4 text-[13px] font-semibold text-[#e8d9ac] transition-colors hover:border-[#c2a05a]/60 hover:text-[#fff9ea] ${focusRing}`}
                >
                  <item.icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        {/* ---------- the real screens ---------- */}
        <section id="phone" aria-labelledby="techs-phone-heading" className="mt-16 scroll-mt-24 px-5 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow}>The software, from your side</p>
            <h2 id="techs-phone-heading" className={heading}>
              What you get on your phone
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              Real screens from the technician view, filled with a sample company&apos;s jobs. Nothing to install: it
              runs in the phone&apos;s browser on iPhone and Android, and{" "}
              <Link href="/install" className={textLink}>
                adds to your home screen
              </Link>{" "}
              like an app.
            </p>
          </div>
          {/* Phones scroll sideways on a narrow screen; three across from md up. */}
          <ul className="-mx-5 mt-8 flex max-w-5xl snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 md:mx-auto md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0">
            {TECH_SCREENS.map((screen, index) => (
              <li key={screen.src} className="w-[220px] shrink-0 snap-center md:w-auto">
                <figure>
                  <div className="mx-auto max-w-[260px]">
                    <PhoneShot src={screen.src} alt={screen.alt} priority={index === 0} />
                  </div>
                  <figcaption className="mx-auto mt-4 max-w-[260px]">
                    <span className="text-sm font-semibold text-[#fff9ea]">{screen.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-[#c9bfae]">{screen.caption}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-4 max-w-5xl text-[13px] text-[#8e826f]">
            It does not track where your truck is. The office sees the job addresses, not your location.{" "}
            <Link href="/hvac-dispatch-software" className={textLink}>
              How dispatch works
            </Link>
          </p>
        </section>

        {/* ---------- a day on it ---------- */}
        <section id="day" aria-labelledby="techs-day-heading" className="mt-16 scroll-mt-24 px-5 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow}>A day on the phone</p>
            <h2 id="techs-day-heading" className={heading}>
              From clock-in to the last job
            </h2>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {TECH_DAY.map((step, index) => (
                <li key={step.title} className={`flex flex-col p-5 ${card}`}>
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#a4823a] text-xs font-semibold text-[#080907]">
                      {index + 1}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8e826f]">
                      {step.time}
                    </span>
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-[#fff9ea]">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#c9bfae]">{step.text}</p>
                </li>
              ))}
            </ol>
            {phoneChapter ? (
              <p className="mt-4 text-sm text-[#c9bfae]">
                Want to see it move?{" "}
                <Link href={`${VIDEO_PAGE_PATH}?t=${phoneChapter.seconds}`} className={textLink}>
                  Watch a job run from the tech&apos;s phone ({phoneChapter.at})
                </Link>
              </p>
            ) : null}
          </div>
        </section>

        {/* ---------- calculators ---------- */}
        <section id="tools" aria-labelledby="techs-tools-heading" className="mt-16 scroll-mt-24 px-5 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow}>Free, no account</p>
            <h2 id="techs-tools-heading" className={heading}>
              Two calculators about your week
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              <li>
                <Link
                  href={calculatorPath("technician-pay")}
                  className={`group flex h-full flex-col p-5 transition-colors hover:border-[#c2a05a]/60 sm:p-6 ${card} ${focusRing}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8e826f]">
                    Pay calculator · about 3 min
                  </span>
                  <span className="mt-2 block text-lg font-semibold text-[#fff9ea]">Hourly, flat rate or commission?</span>
                  <span className="mt-2 block text-sm leading-relaxed text-[#c9bfae]">
                    Put in one real week and see what each pay plan would have paid, and what it works out to per hour
                    on the clock. Handy before you say yes to an offer.
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-[#c2a05a]">
                    Open the pay calculator
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={calculatorPath("callback-cost")}
                  className={`group flex h-full flex-col p-5 transition-colors hover:border-[#c2a05a]/60 sm:p-6 ${card} ${focusRing}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8e826f]">
                    Callback calculator · about 2 min
                  </span>
                  <span className="mt-2 block text-lg font-semibold text-[#fff9ea]">What a callback costs</span>
                  <span className="mt-2 block text-sm leading-relaxed text-[#c9bfae]">
                    The hours and parts a free return trip uses up, by the month and the year. A good number to have when
                    you ask for time to do the job right the first time.
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-[#c2a05a]">
                    Open the callback calculator
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* ---------- videos ---------- */}
        <section id="videos" aria-labelledby="techs-videos-heading" className="mt-16 scroll-mt-24 px-5 sm:px-8">
          <div className={`mx-auto flex max-w-5xl flex-col gap-5 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between ${card}`}>
            <div className="max-w-2xl">
              <p className={eyebrow}>Training</p>
              <h2 id="techs-videos-heading" className="mt-2 text-xl font-semibold text-[#fff9ea]">
                Free HVAC training videos
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#c9bfae] sm:text-base">
                The {training?.label ?? "Altair HVAC Exploration"} channel covers how HVAC equipment works and how to
                troubleshoot it. No sign-up.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 text-sm sm:flex-row sm:gap-5 md:flex-col md:gap-2">
              {training ? (
                <a
                  href={training.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-9 items-center ${textLink}`}
                >
                  Open the channel on YouTube<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
              <Link href={RESOURCES_LIBRARY_PATH} className={`inline-flex min-h-9 items-center ${textLink}`}>
                Search the videos and articles here
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- send to the boss ---------- */}
        <section aria-labelledby="techs-boss-heading" className="mt-16 px-5 sm:px-8">
          <div className="mx-auto max-w-5xl rounded-2xl border border-[rgba(194,160,90,0.3)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] px-5 py-8 sm:px-10 sm:py-10">
            <p className={eyebrow}>Think your shop should try it?</p>
            <h2 id="techs-boss-heading" className={heading}>
              Send this to your boss
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              The message is written. Pick how to send it; it goes from your own phone, and we never see who it went
              to.
            </p>
            <div className="mt-6">
              <BossShareButtons
                message={shareMessage}
                url={shareUrl}
                subject="Software for the shop: Altair Operating System"
              />
            </div>
          </div>
        </section>

        <MarketingFaqSection
          variant="dark"
          items={TECH_FAQ}
          eyebrowText="Questions techs ask"
          headingText="Straight answers about the phone view."
          introText="What it does on your phone today, and what it does not do."
        />

        <div className="px-5 sm:px-8">
          <NextStep
            className="mx-auto max-w-5xl"
            tone="dark"
            placement="for-techs"
            steps={NEXT_STEPS.forTechs}
            eyebrow="Keep going"
            trial={false}
          />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
