import Link from "next/link";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { CommercialVideoPlayer } from "@/shared/components/marketing/CommercialVideoPlayer";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import type { ComparisonPageContent } from "@/shared/lib/site/comparison-pages";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]";
const h2Class = "mt-3 text-[1.6rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[2rem] sm:leading-[1.2]";
const card = "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]";

function TrialButtons({ trialDays }: { trialDays: number }) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      <Link
        href="/signup"
        className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
      >
        Start Your {trialDays}-Day Free Trial
      </Link>
      <Link
        href="/pricing"
        className={`inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`}
      >
        See Altair pricing
      </Link>
    </div>
  );
}

/**
 * A competitor comparison page. Every Altair fact comes from the product's
 * own code or the plan catalog; every competitor fact is dated and sourced
 * to that company's public website (see `sources` in the content).
 */
export function ComparisonPage({ page }: { page: ComparisonPageContent }) {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;
  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative">
        {/* hero */}
        <section className="px-5 pb-12 pt-28 sm:px-8 sm:pb-14 sm:pt-36">
          <div className="mx-auto max-w-3xl">
            <p className="inline-flex items-center rounded-full border border-[rgba(230,227,220,0.14)] bg-[rgba(24,28,22,0.55)] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c9bfae]">
              {page.eyebrow}
            </p>
            <h1 className="ah-hero-display mt-5 text-[2.1rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:text-[2.9rem] sm:leading-[1.08]">
              {page.headline}
            </h1>
            <div className="mt-5 space-y-4 text-[0.95rem] leading-[1.75] text-[#c9bfae] sm:text-lg sm:leading-[1.8]">
              {page.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-7">
              <TrialButtons trialDays={trialDays} />
            </div>
            <p className="mt-4 text-[13px] text-[#8e826f] sm:text-sm">{page.priceNote}</p>
          </div>
        </section>

        {/* at a glance */}
        <section aria-labelledby="compare-table-heading" className="px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrowClass}>At a glance</p>
            <h2 id="compare-table-heading" className={h2Class}>
              {page.table.heading}
            </h2>
            {/* desktop: a real table */}
            <div className={`mt-8 hidden overflow-hidden md:block ${card}`}>
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">{page.table.heading}</caption>
                <thead>
                  <tr className="border-b border-[rgba(230,227,220,0.12)] bg-[rgba(24,28,22,0.7)]">
                    <th scope="col" className="w-[22%] px-5 py-4 font-semibold text-[#c9bfae]">
                      <span className="sr-only">Topic</span>
                    </th>
                    {page.table.columns.map((column, index) => (
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
                  {page.table.rows.map((row) => (
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
            {/* phone: one card per column */}
            <div className="mt-8 space-y-4 md:hidden">
              {page.table.columns.map((column, columnIndex) => (
                <div key={column} className={`${card} p-5 ${columnIndex === 0 ? "border-[#c2a05a]/40" : ""}`}>
                  <p className={`text-base font-semibold ${columnIndex === 0 ? "text-[#e8d9ac]" : "text-[#fff9ea]"}`}>
                    {column}
                  </p>
                  <dl className="mt-3 space-y-3 text-sm">
                    {page.table.rows.map((row) => (
                      <div key={row.label}>
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8e826f]">{row.label}</dt>
                        <dd className="mt-0.5 leading-relaxed text-[#c9bfae]">{row.cells[columnIndex]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[#8e826f]">{page.table.footnote}</p>
          </div>
        </section>

        {/* reasons */}
        <section aria-labelledby="compare-reasons-heading" className="px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrowClass}>{page.reasons.eyebrow}</p>
            <h2 id="compare-reasons-heading" className={h2Class}>
              {page.reasons.heading}
            </h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {page.reasons.items.map((reason, index) => (
                <li key={reason.title} className={`${card} p-5`}>
                  <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[#c2a05a]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[#fff9ea]">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">{reason.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {page.alternatives ? (
          <section aria-labelledby="compare-details-heading" className="px-5 py-10 sm:px-8 sm:py-14">
            <div className="mx-auto max-w-5xl">
              <p className={eyebrowClass}>In detail</p>
              <h2 id="compare-details-heading" className={h2Class}>
                {page.alternatives.heading}
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {page.alternatives.items.map((alt) => (
                  <article key={alt.name} className={`${card} p-5 ${alt.highlight ? "border-[#c2a05a]/40" : ""}`}>
                    <h3 className={`text-lg font-semibold ${alt.highlight ? "text-[#e8d9ac]" : "text-[#fff9ea]"}`}>
                      {alt.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#c9bfae]">{alt.summary}</p>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8e826f]">Good fit for</dt>
                        <dd className="mt-0.5 leading-relaxed text-[#c9bfae]">{alt.goodFor}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8e826f]">Worth knowing</dt>
                        <dd className="mt-0.5 leading-relaxed text-[#c9bfae]">{alt.worthKnowing}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* straight answer: who should pick which */}
        <section aria-labelledby="compare-fit-heading" className="px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <p className={eyebrowClass}>A straight answer</p>
            <h2 id="compare-fit-heading" className={h2Class}>
              {page.fit.heading}
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className={`${card} p-6`}>
                <h3 className="text-base font-semibold text-[#fff9ea]">{page.fit.themTitle}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#c9bfae] marker:text-[#8e826f]">
                  {page.fit.them.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className={`${card} border-[#c2a05a]/40 p-6`}>
                <h3 className="text-base font-semibold text-[#e8d9ac]">{page.fit.usTitle}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#c9bfae] marker:text-[#c2a05a]">
                  {page.fit.us.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* the product, shown rather than claimed */}
        <section aria-labelledby="compare-video-heading" className="px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-4xl">
            <p className={`text-center ${eyebrowClass}`}>See it run</p>
            <h2 id="compare-video-heading" className={`text-center ${h2Class}`}>
              One HVAC job in Altair, from first call to paid
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[#c9bfae]">
              2 minutes 27 seconds, with sound.{" "}
              <Link href={VIDEO_PAGE_PATH} className={`font-semibold text-[#c2a05a] hover:underline ${focusRing}`}>
                Read the transcript
              </Link>
            </p>
            <div className="mt-6">
              <CommercialVideoPlayer />
            </div>
          </div>
        </section>

        {/* questions */}
        <section aria-labelledby="compare-faq-heading" className="px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-3xl">
            <p className={eyebrowClass}>Questions</p>
            <h2 id="compare-faq-heading" className={h2Class}>
              {page.faq.heading}
            </h2>
            <div className="mt-8 space-y-3">
              {page.faq.items.map((entry) => (
                <details key={entry.question} className={`group ${card} open:bg-[rgba(24,28,22,0.7)]`}>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-left text-[15px] font-semibold text-[#f3ebdd] [&::-webkit-details-marker]:hidden">
                    <span>{entry.question}</span>
                    <span className="shrink-0 text-lg leading-none text-[#c2a05a] transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-4 text-sm leading-relaxed text-[#c9bfae]">{entry.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* closing */}
        <section className="px-5 pb-10 pt-6 sm:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.72)_0%,rgba(14,17,13,0.92)_100%)] px-5 py-8 text-center sm:px-8 sm:py-9">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]">
              {page.closing.heading}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#c9bfae] sm:text-base">{page.closing.text}</p>
            <div className="mt-6 flex justify-center">
              <TrialButtons trialDays={trialDays} />
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-[#8e826f]">
            Also:{" "}
            {page.related.map((link, index) => (
              <span key={link.href}>
                {index > 0 ? " · " : ""}
                <Link
                  href={link.href}
                  className={`font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline ${focusRing}`}
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        </section>

        {/* sources */}
        <section aria-labelledby="compare-sources-heading" className="px-5 pb-16 sm:px-8">
          <div className="mx-auto max-w-3xl border-t border-[rgba(230,227,220,0.1)] pt-6 text-xs leading-relaxed text-[#8e826f]">
            <h2 id="compare-sources-heading" className="font-semibold text-[#c9bfae]">
              Sources
            </h2>
            <p className="mt-2">{page.sources.note}</p>
            <ul className="mt-2 space-y-1">
              {page.sources.items.map((source) => (
                <li key={source.url}>
                  <a href={source.url} rel="nofollow noopener noreferrer" target="_blank" className="underline-offset-4 hover:text-[#c9bfae] hover:underline">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3">{page.sources.trademarks}</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
