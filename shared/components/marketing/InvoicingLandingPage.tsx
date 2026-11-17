import Link from "next/link";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { HomepagePricingSection } from "@/shared/components/homepage/HomepagePricingSection";
import { MarketingFaqSection } from "@/shared/components/marketing/MarketingFaqSection";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { ProductScreenshotPlaceholder } from "@/shared/components/marketing/ProductScreenshotPlaceholder";
import { SHOWCASE_ITEMS } from "@/shared/components/marketing/SeeAltairInActionSection";
import { RESOURCE_CALCULATORS, calculatorPath } from "@/shared/lib/resources/catalog";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import { INVOICING_COMPARISON } from "@/shared/lib/site/comparison-pages";
import {
  INVOICE_CONTENTS,
  INVOICING_FAQ,
  INVOICING_HERO,
  INVOICING_LIMITS,
  INVOICING_PAGE_PATH,
  INVOICING_STEPS,
  lowestMonthlyPriceUsd,
} from "@/shared/lib/site/invoicing-page";
import { SOFTWARE_PAGES, SOFTWARE_PAGE_ORDER, SOFTWARE_PAGE_RELATED } from "@/shared/lib/site/internal-links";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const h2Class =
  "mt-3 max-w-2xl text-[1.6rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2rem] sm:leading-[1.2]";
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";
const textLink = `font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`;
const primaryButton = `inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`;
const secondaryButton = `inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`;

/**
 * /hvac-invoicing-software. Its own page rather than the shared landing
 * template, because it answers the site's biggest non-brand search; the
 * words and the evidence for every claim are in
 * shared/lib/site/invoicing-page.ts. Screenshots are the clean sample-company
 * tour shots the pricing page already uses. Static.
 */
export function InvoicingLandingPage() {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
  const fromPrice = lowestMonthlyPriceUsd();
  const related = SOFTWARE_PAGE_RELATED[INVOICING_PAGE_PATH];
  const tools = related.tools
    .map((slug) => RESOURCE_CALCULATORS.find((calculator) => calculator.slug === slug))
    .filter((calculator): calculator is (typeof RESOURCE_CALCULATORS)[number] => Boolean(calculator));
  const otherSoftware = SOFTWARE_PAGE_ORDER.filter((path) => path !== INVOICING_PAGE_PATH).map(
    (path) => SOFTWARE_PAGES[path],
  );
  const comparison = INVOICING_COMPARISON;

  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative">
        <section className="px-5 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center rounded-full border border-[rgba(230,227,220,0.14)] bg-[rgba(24,28,22,0.55)] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c9bfae]">
              {INVOICING_HERO.eyebrow}
            </p>
            <h1 className="ah-hero-display mt-5 text-[2.1rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:text-[2.9rem] sm:leading-[1.08] lg:text-[3.3rem]">
              {INVOICING_HERO.headline}
            </h1>
            <p className="mx-auto mt-5 max-w-[640px] text-[0.95rem] leading-[1.75] text-[#c9bfae] sm:text-lg sm:leading-[1.8]">
              {INVOICING_HERO.intro}
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" data-cta="invoicing-hero" className={primaryButton}>
                Start Your {trialDays}-Day Free Trial
              </Link>
              <a href="#how-invoicing-works" className={secondaryButton}>
                See how it works
              </a>
            </div>
            <p className="mt-5 text-[13px] text-[#8e826f] sm:text-sm">
              No credit card to start.
              {fromPrice !== null ? ` Plans from $${fromPrice}/month, invoicing included.` : ""} A one-on-one
              setup call is included.
            </p>
          </div>
        </section>

        <section
          id="how-invoicing-works"
          aria-labelledby="invoicing-steps-heading"
          className="scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16"
        >
          <div className="mx-auto max-w-6xl">
            <p className={eyebrowClass}>How HVAC invoicing works in Altair</p>
            <h2 id="invoicing-steps-heading" className={h2Class}>
              From the finished job to the paid invoice, in five steps.
            </h2>
            <ol className="mt-10 space-y-10 sm:space-y-14">
              {INVOICING_STEPS.map((step, index) => {
                const shot = step.screenshotId
                  ? SHOWCASE_ITEMS.find((item) => item.id === step.screenshotId)
                  : undefined;
                return (
                  <li
                    key={step.title}
                    className={
                      shot
                        ? `flex flex-col gap-5 lg:items-center lg:gap-10 ${index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"}`
                        : `${card} p-5 sm:p-6 lg:mx-auto lg:max-w-3xl`
                    }
                  >
                    {shot ? (
                      <div className="min-w-0 flex-1 lg:flex-[1.5]">
                        <ProductScreenshotPlaceholder
                          alt={shot.imageAlt}
                          label={shot.imageLabel}
                          src={shot.imageSrc}
                          mobileSrc={shot.imageSrcMobile}
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1 lg:max-w-md">
                      <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[#c2a05a]">
                        STEP {index + 1}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[#fff9ea] sm:text-xl">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#c9bfae] sm:text-[15px]">{step.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-10 text-center text-xs text-[#8e826f]">
              Screens from a sample HVAC company; no real customers.{" "}
              <Link href={VIDEO_PAGE_PATH} className={textLink}>
                Watch one job go from first call to paid (2:27)
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="invoice-contents-heading" className="px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrowClass}>What goes on the invoice</p>
            <h2 id="invoice-contents-heading" className={h2Class}>
              Everything an HVAC invoice needs, filled in from the job.
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {INVOICE_CONTENTS.map((item) => (
                <li key={item.title} className={`${card} p-5`}>
                  <h3 className="text-base font-semibold text-[#fff9ea]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">{item.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#8e826f]">{INVOICING_LIMITS}</p>
          </div>
        </section>

        <HomepagePricingSection />

        <section aria-labelledby="invoicing-compare-heading" className="px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrowClass}>Compared honestly</p>
            <h2 id="invoicing-compare-heading" className={h2Class}>
              Altair, Jobber and Housecall Pro, for a shop that needs to invoice.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              Prices and plan limits from each company&apos;s own website, checked {comparison.checkedOn}. Jobber
              and Housecall Pro sync with QuickBooks on their higher tiers; Altair does not sync with QuickBooks
              today. Pick the one that fits how your office keeps its books.
            </p>
            <div className={`mt-8 hidden overflow-hidden md:block ${card}`}>
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Altair, Jobber and Housecall Pro compared</caption>
                <thead>
                  <tr className="border-b border-[rgba(230,227,220,0.12)] bg-[rgba(24,28,22,0.7)]">
                    <th scope="col" className="w-[20%] px-5 py-4 font-semibold text-[#c9bfae]">
                      <span className="sr-only">Topic</span>
                    </th>
                    {comparison.columns.map((column, index) => (
                      <th
                        key={column}
                        scope="col"
                        className={`px-5 py-4 font-semibold ${index === 0 ? "text-[#e8d9ac]" : "text-[#fff9ea]"}`}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.label} className="border-b border-[rgba(230,227,220,0.08)] align-top last:border-b-0">
                      <th scope="row" className="px-5 py-4 font-semibold text-[#fff9ea]">
                        {row.label}
                      </th>
                      {row.cells.map((cell, index) => (
                        <td
                          key={`${row.label}-${index}`}
                          className={`px-5 py-4 leading-relaxed ${index === 0 ? "bg-[rgba(194,160,90,0.06)] text-[#f3ebdd]" : "text-[#c9bfae]"}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 space-y-4 md:hidden">
              {comparison.columns.map((column, columnIndex) => (
                <div key={column} className={`${card} p-5 ${columnIndex === 0 ? "border-[#c2a05a]/40" : ""}`}>
                  <p className={`text-base font-semibold ${columnIndex === 0 ? "text-[#e8d9ac]" : "text-[#fff9ea]"}`}>
                    {column}
                  </p>
                  <dl className="mt-3 space-y-3 text-sm">
                    {comparison.rows.map((row) => (
                      <div key={row.label}>
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8e826f]">{row.label}</dt>
                        <dd className="mt-0.5 leading-relaxed text-[#c9bfae]">{row.cells[columnIndex]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[#8e826f]">
              {comparison.footnote} Sources:{" "}
              {comparison.sources.map((source, index) => (
                <span key={source.url}>
                  {index > 0 ? ", " : ""}
                  <a href={source.url} rel="nofollow noopener" target="_blank" className={textLink}>
                    {source.label}
                  </a>
                </span>
              ))}
              .{" "}
              <Link href={comparison.fullComparisonPath} className={textLink}>
                The full Jobber and Housecall Pro comparison
              </Link>{" "}
              ·{" "}
              <Link href="/servicetitan-alternative" className={textLink}>
                Altair vs. ServiceTitan
              </Link>
            </p>
          </div>
        </section>

        <MarketingFaqSection
          variant="dark"
          items={INVOICING_FAQ}
          eyebrowText="HVAC invoicing questions"
          headingText="What owners ask about invoicing in Altair."
          introText="Straight answers, including what it does not do yet."
        />

        <section aria-labelledby="invoicing-related-heading" className="px-5 pb-6 pt-4 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrowClass}>Free for owners</p>
            <h2
              id="invoicing-related-heading"
              className="mt-3 text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]"
            >
              Get the numbers on the invoice right.
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {tools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={calculatorPath(tool.slug)}
                    className={`block h-full p-5 transition-colors hover:border-[#c2a05a]/60 ${card} ${focusRing}`}
                  >
                    <span className="block text-base font-semibold text-[#fff9ea]">{tool.title}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-[#c9bfae]">{tool.description}</span>
                    <span className="mt-3 block text-xs font-semibold text-[#c2a05a]">Open it, no account →</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8e826f]">Read</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {related.articles.map((article) => (
                    <li key={article.slug}>
                      <Link href={`${SITE_PAGE_PATH_PREFIX}/${article.slug}`} className={textLink}>
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8e826f]">
                  The rest of the system
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {otherSoftware.map((page) => (
                    <li key={page.href}>
                      <Link href={page.href} className={textLink}>
                        {page.label}
                      </Link>
                      <span className="text-[#8e826f]"> — {page.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 pt-10 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] px-5 py-8 text-center sm:px-8 sm:py-9">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]">
              Bill your next finished job from it.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">
              Invoice from the job, send the link, record the payment. If that took less time than today, you have
              your answer. {trialDays} days free, no card.
            </p>
            <Link href="/signup" data-cta="invoicing-closing" className={`mt-6 ${primaryButton}`}>
              Start Your {trialDays}-Day Free Trial
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
