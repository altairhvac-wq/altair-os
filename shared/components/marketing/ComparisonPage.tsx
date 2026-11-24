import Link from "next/link";
import { PhoneJumpBar, ShowMore } from "@/shared/components/marketing/phone/PhoneLayout";
import { jumpTarget, showFirst, swipeItem, swipeRow } from "@/shared/components/marketing/phone/phone-classes";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { CommercialVideoPlayer } from "@/shared/components/marketing/CommercialVideoPlayer";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { NextStep } from "@/shared/components/site/NextStep";
import { BAND, GOLD_BUTTON, GOLD_SECONDARY_BUTTON, TONE, type BandTone } from "@/shared/lib/site/bands";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import {
  COMPARISON_METHOD_NOTE,
  COMPETITOR_FACTS_CHECKED,
  COMPETITOR_FACTS_CHECKED_ISO,
  type ComparisonPageContent,
} from "@/shared/lib/site/comparison-pages";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const eyebrow = (tone: BandTone) => `text-[11px] font-semibold uppercase tracking-[0.16em] ${TONE[tone].eyebrow}`;
const h2 = (tone: BandTone) => `mt-3 text-[1.6rem] font-semibold tracking-tight sm:text-[2rem] sm:leading-[1.2] ${TONE[tone].heading}`;
const link = (tone: BandTone) => `${TONE[tone].link} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55`;

function TrialButtons({ trialDays, tone }: { trialDays: number; tone: "dark" | "gold" }) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      <Link
        href="/signup"
        className={
          tone === "gold"
            ? GOLD_BUTTON
            : `inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-8 py-3.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`
        }
      >
        Start Your {trialDays}-Day Free Trial
      </Link>
      <Link
        href="/pricing"
        className={
          tone === "gold"
            ? GOLD_SECONDARY_BUTTON
            : `inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-8 py-3.5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`
        }
      >
        See Altair pricing
      </Link>
    </div>
  );
}

/** The dated, sourced promise near the top of the page; the sources are at the bottom. */
function FactsChecked() {
  return (
    <a
      href="#sources"
      className={`mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(194,160,90,0.35)] bg-[rgba(194,160,90,0.08)] px-3.5 py-1.5 text-[13px] text-[#e8d9ac] transition-colors hover:border-[#c2a05a]/70 ${focusRing}`}
    >
      <CalendarCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>
        Facts checked on <time dateTime={COMPETITOR_FACTS_CHECKED_ISO}>{COMPETITOR_FACTS_CHECKED}</time>
        <span className="text-[#8e826f]"> · </span>
        <span className="underline underline-offset-4">See the sources</span>
      </span>
    </a>
  );
}

/**
 * A competitor comparison page. Every Altair fact comes from the product's
 * own code or the plan catalog; every competitor fact is dated and sourced
 * to that company's public website (see `sources` in the content).
 *
 * Sections alternate dark and warm-cream bands (shared/lib/site/bands.ts,
 * 2026-11-21) whichever optional sections a page has; our column, our card
 * and the closing band carry the gold.
 */
export function ComparisonPage({ page }: { page: ComparisonPageContent }) {
  const trialDays = SAAS_TRIAL_CONFIG.durationDays;

  // The bands after the hero, in order; tones alternate starting with light.
  const order = [
    "table",
    "reasons",
    ...(page.alternatives ? ["alternatives"] : []),
    "fit",
    "switching",
    "video",
    "faq",
  ] as const;
  const toneOf = (section: (typeof order)[number]): BandTone =>
    order.indexOf(section) % 2 === 0 ? "light" : "dark";
  const band = (section: (typeof order)[number]) => (toneOf(section) === "light" ? BAND.light : BAND.olive);

  return (
    <div className="mc-homepage relative min-h-dvh overflow-x-clip bg-[#080907] text-[#f3ebdd]">
      <HomepageNav />
      <main className="relative">
        {/* hero */}
        <section className={`${BAND.hero} px-5 pb-14 pt-28 sm:px-8 sm:pb-20 sm:pt-36`}>
          <div className="mx-auto max-w-3xl">
            <p className="inline-flex items-center rounded-full border border-[rgba(194,160,90,0.35)] bg-[rgba(164,130,58,0.12)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e8d9ac]">
              {page.eyebrow}
            </p>
            <h1 className="ah-hero-display mt-5 text-[2.1rem] font-normal leading-[1.12] tracking-[-0.015em] text-[#fff9ea] sm:text-[2.9rem] sm:leading-[1.08]">
              {page.headline}
            </h1>
            <div className="mt-5 space-y-4 text-[0.95rem] leading-[1.75] text-[#d6ccba] sm:text-lg sm:leading-[1.8]">
              {page.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-7">
              <TrialButtons trialDays={trialDays} tone="dark" />
            </div>
            <p className="mt-4 text-[13px] text-[#8e826f] sm:text-sm">{page.priceNote}</p>
            <FactsChecked />
          </div>
        </section>

        {/* at a glance */}
        <PhoneJumpBar
          items={[
            { id: "compare", label: "Side by side" },
            { id: "reasons", label: "Why switch" },
            ...(page.alternatives ? [{ id: "in-detail", label: "In detail" }] : []),
            { id: "switching", label: "Switching" },
            { id: "questions", label: "Questions" },
          ]}
        />
        <section id="compare" aria-labelledby="compare-table-heading" className={`${band("table")} ${jumpTarget} px-5 py-14 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow(toneOf("table"))}>At a glance</p>
            <h2 id="compare-table-heading" className={h2(toneOf("table"))}>
              {page.table.heading}
            </h2>
            {/* desktop: a real table */}
            <div className={`mt-8 hidden overflow-hidden md:block ${TONE[toneOf("table")].card}`}>
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">{page.table.heading}</caption>
                <thead>
                  <tr className={toneOf("table") === "light" ? "border-b border-[#e4d9c4] bg-[#f7f2e8]" : "border-b border-[rgba(230,227,220,0.12)] bg-[rgba(24,28,22,0.7)]"}>
                    <th scope="col" className="w-[22%] px-5 py-4 font-semibold">
                      <span className="sr-only">Topic</span>
                    </th>
                    {page.table.columns.map((column, index) => (
                      <th
                        key={column}
                        scope="col"
                        className={`px-5 py-4 font-semibold ${
                          index === 0 ? "bg-[#14120e] text-[#e8d9ac]" : TONE[toneOf("table")].heading
                        }`}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.table.rows.map((row) => (
                    <tr key={row.label} className={`border-b align-top last:border-b-0 ${TONE[toneOf("table")].divider}`}>
                      <th scope="row" className={`px-5 py-4 font-semibold ${TONE[toneOf("table")].heading}`}>
                        {row.label}
                      </th>
                      {row.cells.map((cell, index) => (
                        <td
                          key={`${row.label}-${index}`}
                          className={`px-5 py-4 leading-relaxed ${
                            index === 0
                              ? toneOf("table") === "light"
                                ? "bg-[#fbf6ea] font-medium text-[#14120e]"
                                : "bg-[rgba(194,160,90,0.06)] text-[#f3ebdd]"
                              : TONE[toneOf("table")].body
                          }`}
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
            <p className={`mt-6 text-xs md:hidden ${TONE[toneOf("table")].muted}`}>Swipe to compare.</p>
            <div className={`mt-3 space-y-4 md:hidden ${swipeRow}`}>
              {page.table.columns.map((column, columnIndex) => {
                const ours = columnIndex === 0;
                const tone: BandTone = ours ? "dark" : toneOf("table");
                return (
                  <div key={column} className={`p-5 ${swipeItem} ${ours ? TONE.light.cardLit : TONE[tone].card}`}>
                    <p className={`text-base font-semibold ${ours ? "text-[#e8d9ac]" : TONE[tone].heading}`}>{column}</p>
                    <dl className="mt-3 space-y-3 text-sm">
                      {page.table.rows.map((row) => (
                        <div key={row.label}>
                          <dt className={`text-xs font-semibold uppercase tracking-[0.08em] ${ours ? "text-[#a89c88]" : TONE[tone].muted}`}>
                            {row.label}
                          </dt>
                          <dd className={`mt-0.5 leading-relaxed ${ours ? "text-[#e6dccb]" : TONE[tone].body}`}>
                            {row.cells[columnIndex]}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
            <p className={`mt-4 text-xs leading-relaxed ${TONE[toneOf("table")].muted}`}>{page.table.footnote}</p>
          </div>
        </section>

        {/* reasons */}
        <section id="reasons" aria-labelledby="compare-reasons-heading" className={`${band("reasons")} ${jumpTarget} px-5 py-14 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow(toneOf("reasons"))}>{page.reasons.eyebrow}</p>
            <h2 id="compare-reasons-heading" className={h2(toneOf("reasons"))}>
              {page.reasons.heading}
            </h2>
            <ol className={`mt-8 grid gap-4 sm:grid-cols-2 ${swipeRow}`}>
              {page.reasons.items.map((reason, index) => (
                <li key={reason.title} className={`${TONE[toneOf("reasons")].card} p-5 ${swipeItem}`}>
                  <p className={`font-mono text-[11px] font-semibold tracking-[0.14em] ${TONE[toneOf("reasons")].eyebrow}`}>
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className={`mt-2 text-base font-semibold ${TONE[toneOf("reasons")].heading}`}>{reason.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${TONE[toneOf("reasons")].body}`}>{reason.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {page.alternatives ? (
          <section id="in-detail" aria-labelledby="compare-details-heading" className={`${band("alternatives")} ${jumpTarget} px-5 py-14 sm:px-8 sm:py-20`}>
            <div className="mx-auto max-w-5xl">
              <p className={eyebrow(toneOf("alternatives"))}>In detail</p>
              <h2 id="compare-details-heading" className={h2(toneOf("alternatives"))}>
                {page.alternatives.heading}
              </h2>
              <div className={`mt-8 grid gap-4 md:grid-cols-2 ${swipeRow}`}>
                {page.alternatives.items.map((alt) => {
                  const tone: BandTone = alt.highlight ? "dark" : toneOf("alternatives");
                  const lit = alt.highlight && toneOf("alternatives") === "light";
                  return (
                    <article
                      key={alt.name}
                      className={`p-5 ${swipeItem} ${lit ? TONE.light.cardLit : TONE[tone].card} ${alt.highlight && !lit ? "border-[#c2a05a]/40" : ""}`}
                    >
                      <h3 className={`text-lg font-semibold ${alt.highlight ? "text-[#e8d9ac]" : TONE[tone].heading}`}>{alt.name}</h3>
                      <p className={`mt-2 text-sm leading-relaxed ${lit ? "text-[#d6ccba]" : TONE[tone].body}`}>{alt.summary}</p>
                      <dl className="mt-4 space-y-2 text-sm">
                        <div>
                          <dt className={`text-xs font-semibold uppercase tracking-[0.08em] ${lit ? "text-[#a89c88]" : TONE[tone].muted}`}>
                            Good fit for
                          </dt>
                          <dd className={`mt-0.5 leading-relaxed ${lit ? "text-[#d6ccba]" : TONE[tone].body}`}>{alt.goodFor}</dd>
                        </div>
                        <div>
                          <dt className={`text-xs font-semibold uppercase tracking-[0.08em] ${lit ? "text-[#a89c88]" : TONE[tone].muted}`}>
                            Worth knowing
                          </dt>
                          <dd className={`mt-0.5 leading-relaxed ${lit ? "text-[#d6ccba]" : TONE[tone].body}`}>{alt.worthKnowing}</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* straight answer: who should pick which */}
        <section aria-labelledby="compare-fit-heading" className={`${band("fit")} px-5 py-14 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow(toneOf("fit"))}>A straight answer</p>
            <h2 id="compare-fit-heading" className={h2(toneOf("fit"))}>
              {page.fit.heading}
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className={`${TONE[toneOf("fit")].card} p-6`}>
                <h3 className={`text-base font-semibold ${TONE[toneOf("fit")].heading}`}>{page.fit.themTitle}</h3>
                <ul className={`mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed ${TONE[toneOf("fit")].body} marker:text-[#8e826f]`}>
                  {page.fit.them.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className={`${toneOf("fit") === "light" ? TONE.light.cardLit : `${TONE.dark.card} border-[#c2a05a]/40`} p-6`}>
                <h3 className="text-base font-semibold text-[#e8d9ac]">{page.fit.usTitle}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#d6ccba] marker:text-[#c2a05a]">
                  {page.fit.us.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* moving over: customers, price book, open invoices, team */}
        <section id="switching" aria-labelledby="compare-switch-heading" className={`${band("switching")} ${jumpTarget} px-5 py-14 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-5xl">
            <p className={eyebrow(toneOf("switching"))}>Moving over</p>
            <h2 id="compare-switch-heading" className={h2(toneOf("switching"))}>
              {page.switching.heading}
            </h2>
            <p className={`mt-3 max-w-2xl text-sm leading-relaxed sm:text-base ${TONE[toneOf("switching")].body}`}>
              {page.switching.intro}
            </p>
            <ol className={`mt-8 grid gap-4 md:grid-cols-2 ${swipeRow}`}>
              {page.switching.steps.map((step, index) => (
                <li key={step.title} className={`${TONE[toneOf("switching")].card} p-5 sm:p-6 ${swipeItem}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a4823a] text-sm font-semibold text-[#080907]">
                      {index + 1}
                    </span>
                    <h3 className={`text-base font-semibold ${TONE[toneOf("switching")].heading}`}>{step.title}</h3>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {step.items.map((item) => (
                      <li key={item} className={`flex gap-2.5 text-sm leading-relaxed ${TONE[toneOf("switching")].body}`}>
                        <CheckCircle2 aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[toneOf("switching")].icon}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* the product, shown rather than claimed */}
        <section aria-labelledby="compare-video-heading" className={`${band("video")} px-5 py-14 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-4xl">
            <p className={`text-center ${eyebrow(toneOf("video"))}`}>See it run</p>
            <h2 id="compare-video-heading" className={`text-center ${h2(toneOf("video"))}`}>
              One HVAC job in Altair, from first call to paid
            </h2>
            <p className={`mx-auto mt-2 max-w-xl text-center text-sm ${TONE[toneOf("video")].body}`}>
              2 minutes 27 seconds, with sound.{" "}
              <Link href={VIDEO_PAGE_PATH} className={link(toneOf("video"))}>
                Read the transcript
              </Link>
            </p>
            <div className="mt-6">
              <CommercialVideoPlayer />
            </div>
          </div>
        </section>

        {/* questions, where to look next, and the sources */}
        <div className={`${band("faq")} pb-12`}>
          <section id="questions" aria-labelledby="compare-faq-heading" className={`${jumpTarget} px-5 py-14 sm:px-8 sm:py-20`}>
            <div className="mx-auto max-w-3xl">
              <p className={eyebrow(toneOf("faq"))}>Questions</p>
              <h2 id="compare-faq-heading" className={h2(toneOf("faq"))}>
                {page.faq.heading}
              </h2>
              <ShowMore hidden={Math.max(0, page.faq.items.length - 4)} noun="more questions" tone={toneOf("faq") === "light" ? "light" : "dark"}>
              <div className={`mt-8 space-y-3 ${showFirst[4]}`}>
                {page.faq.items.map((entry) => (
                  <details
                    key={entry.question}
                    className={`group ${TONE[toneOf("faq")].card} ${toneOf("faq") === "light" ? "open:bg-[#fffdf8]" : "open:bg-[rgba(24,28,22,0.7)]"}`}
                  >
                    <summary
                      className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-left text-[15px] font-semibold [&::-webkit-details-marker]:hidden ${TONE[toneOf("faq")].strong}`}
                    >
                      <span>{entry.question}</span>
                      <span
                        className={`shrink-0 text-lg leading-none transition-transform group-open:rotate-45 ${TONE[toneOf("faq")].eyebrow}`}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>
                    <p className={`px-5 pb-4 text-sm leading-relaxed ${TONE[toneOf("faq")].body}`}>{entry.answer}</p>
                  </details>
                ))}
              </div>
              </ShowMore>
            </div>
          </section>

          <div className="px-5 sm:px-8">
            <NextStep
              className="mx-auto max-w-5xl"
              tone={toneOf("faq")}
              placement="comparison"
              steps={NEXT_STEPS.comparison}
              eyebrow="Still deciding?"
              heading="Look closer before you switch"
              trial={false}
            />
          </div>

          {/* sources */}
          <section id="sources" aria-labelledby="compare-sources-heading" className="scroll-mt-24 px-5 pt-12 sm:px-8">
            <div className={`mx-auto max-w-3xl border-t pt-6 text-xs leading-relaxed ${TONE[toneOf("faq")].divider} ${TONE[toneOf("faq")].muted}`}>
              <h2 id="compare-sources-heading" className={`font-semibold ${TONE[toneOf("faq")].strong}`}>
                Sources
              </h2>
              <p className="mt-2">{page.sources.note}</p>
              <p className="mt-2">{COMPARISON_METHOD_NOTE}</p>
              <ul className="mt-2 space-y-1">
                {page.sources.items.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                      className={`underline-offset-4 hover:underline ${toneOf("faq") === "light" ? "hover:text-stone-800" : "hover:text-[#c9bfae]"}`}
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3">{page.sources.trademarks}</p>
            </div>
          </section>
        </div>

        {/* closing */}
        <section className={`${BAND.gold} px-5 py-16 sm:px-8 sm:py-20`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[1.6rem] font-semibold tracking-tight text-[#14120e] sm:text-[2.1rem]">{page.closing.heading}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#2a2416] sm:text-base">{page.closing.text}</p>
            <div className="mt-7 flex justify-center">
              <TrialButtons trialDays={trialDays} tone="gold" />
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-[#2a2416]">
            Also:{" "}
            {page.related.map((item, index) => (
              <span key={item.href}>
                {index > 0 ? " · " : ""}
                <Link
                  href={item.href}
                  className="font-semibold text-[#14120e] underline decoration-[#14120e]/30 underline-offset-4 hover:decoration-[#14120e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14120e]/60"
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
