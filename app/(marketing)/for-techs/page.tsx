import type { Metadata } from "next";
import Link from "next/link";
import { listPublicSaasCatalogPlans, SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { BossShareButtons } from "@/shared/components/marketing/BossShareButtons";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { calculatorPath, RESOURCES_LIBRARY_PATH } from "@/shared/lib/resources/catalog";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";
import { FOR_TECHS_PATH } from "@/shared/lib/site/about";
import { PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "For HVAC technicians";
const DESCRIPTION =
  "Free for HVAC technicians: a pay calculator for hourly, flat rate and commission, a callback cost calculator, training videos, and a message to send your boss about the software.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: FOR_TECHS_PATH, title: TITLE, description: DESCRIPTION }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";
const heading = "mt-3 text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]";
const textLink = `font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`;

/** What the technician's phone view does, in the words the product pages already use. */
const PHONE_VIEW: readonly { title: string; text: string }[] = [
  {
    title: "Your jobs, not everyone's",
    text: "You see your own jobs for the day, with the customer, the address and the equipment on site.",
  },
  {
    title: "Changes reach you",
    text: "When the office moves a job, you see it the next time you open or refresh your jobs.",
  },
  {
    title: "Clock in and log receipts",
    text: "Shift hours, job hours and receipts are recorded next to the jobs they belong to.",
  },
  {
    title: "Nothing to install",
    text: "It runs in the phone's web browser on iPhone and Android, and can be added to the home screen so it opens like an app.",
  },
];

/**
 * A page for the person in the truck (site audit 2026-11-12: most visitors
 * come from the HVAC training videos, and many of them are technicians, not
 * owners). It gives them the two calculators that are about their own week,
 * points them at the videos, says plainly what the phone view does, and
 * makes it one tap to send the site to whoever does buy software.
 */
export default function ForTechsPage() {
  const prices = listPublicSaasCatalogPlans()
    .map((plan) => plan.monthlyPriceUsd)
    .filter((price): price is number => typeof price === "number");
  const fromPrice = prices.length ? Math.min(...prices) : null;
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
  const training = YOUTUBE_CHANNELS.find((channel) => channel.key === "hvac-exploration");

  // One short tag, so the link still looks like a link in a text message.
  const shareUrl = `${PUBLIC_SITE_ORIGIN}/?utm_source=tech-share`;
  const shareMessage = `Worth a look for the shop: Altair Operating System. Jobs, dispatch, estimates and invoices in one place, and we would get our day on our phones. ${trialDays} days free, no credit card${fromPrice !== null ? `, then from $${fromPrice} a month` : ""}.`;

  return (
    <div className="mc-homepage relative flex min-h-dvh flex-col bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative flex-1 px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-3xl">
          <p className={eyebrow}>For technicians</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2.5rem] sm:leading-[1.15]">
            For the tech in the truck.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#c9bfae]">
            You probably do not buy the software. You are the one who lives with it. Here are two free tools about
            your own week, the training videos, and what Altair looks like from your side of the job.
          </p>

          <section aria-labelledby="techs-tools-heading" className="mt-12">
            <p className={eyebrow}>Free, no account</p>
            <h2 id="techs-tools-heading" className={heading}>
              Two calculators about your week
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              <li>
                <Link
                  href={calculatorPath("technician-pay")}
                  className={`block h-full p-5 transition-colors hover:border-[#c2a05a]/60 ${card} ${focusRing}`}
                >
                  <span className="block text-base font-semibold text-[#fff9ea]">
                    Hourly, flat rate or commission?
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-[#c9bfae]">
                    Put in one real week and see what each pay plan would have paid, and what it works out to per
                    hour on the clock. Handy before you say yes to an offer.
                  </span>
                  <span className="mt-3 block text-xs font-semibold text-[#c2a05a]">Open the pay calculator →</span>
                </Link>
              </li>
              <li>
                <Link
                  href={calculatorPath("callback-cost")}
                  className={`block h-full p-5 transition-colors hover:border-[#c2a05a]/60 ${card} ${focusRing}`}
                >
                  <span className="block text-base font-semibold text-[#fff9ea]">What a callback costs</span>
                  <span className="mt-2 block text-sm leading-relaxed text-[#c9bfae]">
                    The hours and parts a free return trip uses up, by the month and the year. A good number to
                    have when you ask for time to do the job right the first time.
                  </span>
                  <span className="mt-3 block text-xs font-semibold text-[#c2a05a]">Open the callback calculator →</span>
                </Link>
              </li>
            </ul>
          </section>

          <section aria-labelledby="techs-videos-heading" className="mt-14">
            <p className={eyebrow}>Training</p>
            <h2 id="techs-videos-heading" className={heading}>
              Free HVAC training videos
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              The {training?.label ?? "Altair HVAC Exploration"} channel covers how HVAC equipment works and how to
              troubleshoot it. No sign-up.
            </p>
            <p className="mt-3 flex flex-wrap gap-x-5 text-sm">
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
            </p>
          </section>

          <section aria-labelledby="techs-phone-heading" className="mt-14">
            <p className={eyebrow}>The software, from your side</p>
            <h2 id="techs-phone-heading" className={heading}>
              What you get on your phone
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {PHONE_VIEW.map((item) => (
                <li key={item.title} className={`p-5 ${card}`}>
                  <h3 className="text-base font-semibold text-[#fff9ea]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">{item.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-[#8e826f]">
              It does not track where your truck is. The office sees the job addresses, not your location.{" "}
              <Link href="/hvac-dispatch-software" className={textLink}>
                How dispatch works
              </Link>
            </p>
          </section>

          <section aria-labelledby="techs-boss-heading" className={`mt-14 px-5 py-7 sm:px-8 sm:py-9 ${card}`}>
            <p className={eyebrow}>Think your shop should try it?</p>
            <h2 id="techs-boss-heading" className={heading}>
              Send this to your boss
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              The message is written. Pick how to send it; it goes from your own phone, and we never see who it went
              to.
            </p>
            <div className="mt-5">
              <BossShareButtons
                message={shareMessage}
                url={shareUrl}
                subject="Software for the shop: Altair Operating System"
              />
            </div>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
