import Link from "next/link";
import { PhoneFold } from "@/shared/components/marketing/phone/PhoneLayout";
import { swipeItem, swipeRowInPanel } from "@/shared/components/marketing/phone/phone-classes";
import { ArrowRight, Check, ClipboardList } from "lucide-react";
import { HomepageNav } from "@/shared/components/homepage/HomepageNav";
import { MarketingFooter } from "@/shared/components/marketing/MarketingFooter";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";

/**
 * Server-rendered frame and content blocks for the two tool pages
 * (/insights/how-to-calculate-hvac-labor-rate, /insights/hvac-invoice-template).
 *
 * Everything here is plain HTML in the first response, so the guide, the
 * sourced figures and the FAQ are crawlable; only the tool itself is a client
 * component. Styled as part of the product (panels, numbered sections, a
 * section index) rather than a single blog column.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

export function ToolPageShell({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-stone-50 via-white to-stone-100/80 pb-20 lg:pb-0 print:bg-white print:pb-0">
      <div className="print:hidden">
        <HomepageNav />
      </div>
      <main>{children}</main>
      <div className="print:hidden">
        <MarketingFooter />
      </div>
    </div>
  );
}

export function ToolHero({
  crumb,
  eyebrow,
  title,
  lead,
  updated,
  facts,
  jumpLinks,
  question,
  needs,
  trail = [{ label: "Free tools", href: "/resources" }],
}: {
  /**
   * The question the tool answers, in the owner's words. When given, a phone
   * shows it in place of the longer lead, the check-mark facts and the jump
   * buttons, so the first box to type in is on the first screen (2026-11-27:
   * it was 1.3 to 1.5 screens down on every tool). Wider screens are unchanged.
   */
  readonly question?: string;
  /** What to have open before starting: shown on every screen size, right above the tool. */
  readonly needs?: string;
  /** The links before the current page in the breadcrumb. */
  readonly trail?: readonly { readonly label: string; readonly href: string }[];
  readonly crumb: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: React.ReactNode;
  readonly updated: { readonly iso: string; readonly label: string };
  readonly facts: readonly string[];
  readonly jumpLinks: readonly { readonly href: string; readonly label: string }[];
}) {
  return (
    <header className={`mx-auto max-w-[90rem] px-4 pt-24 sm:px-8 sm:pb-6 sm:pt-28 lg:px-12 print:hidden ${question ? "pb-4" : "pb-6"}`}>
      <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          {trail.map((item, index) => (
            <li key={item.href} className="flex items-center gap-1.5">
              <Link href={item.href} className={`rounded-sm hover:text-[#77591B] ${focusRing}`}>
                {item.label}
              </Link>
              <span aria-hidden="true" className={index === trail.length - 1 ? "max-sm:hidden" : undefined}>
                /
              </span>
            </li>
          ))}
          <li aria-current="page" className="text-stone-600 max-sm:hidden">
            {crumb}
          </li>
        </ol>
      </nav>
      <div className={`mt-4 grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end ${question ? "gap-3 sm:gap-6" : "gap-6"}`}>
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">{eyebrow}</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-[2.75rem]">
            {title}
          </h1>
          {question ? <p className="mt-3 text-[15px] font-medium leading-snug text-stone-800 sm:hidden">{question}</p> : null}
          <div className={`mt-4 text-base leading-relaxed text-stone-600 sm:text-lg ${question ? "hidden sm:block" : ""}`}>{lead}</div>
          <ul className={`mt-4 flex-wrap gap-x-5 gap-y-2 text-[13px] text-stone-600 ${question ? "hidden sm:flex" : "flex"}`}>
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-1.5">
                <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
                {fact}
              </li>
            ))}
            <li className="text-stone-500">
              Updated <time dateTime={updated.iso}>{updated.label}</time>
            </li>
          </ul>
        </div>
        {/* What to have on hand sits beside the title on a wide screen (no extra height above the tool) and
            directly above the tool on a phone. */}
        <div className="flex min-w-0 flex-col gap-3 lg:max-w-[34rem] lg:items-end">
          {needs ? (
            <p className="flex gap-2 rounded-xl border border-[#C2A05A]/45 bg-amber-50/70 px-3 py-2 text-[13px] leading-snug text-stone-700">
              <ClipboardList aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77591B]" />
              <span>
                <span className="font-semibold text-stone-900">Have on hand: </span>
                {needs}
              </span>
            </p>
          ) : null}
        <nav aria-label="On this page" className={`flex-wrap gap-2 lg:justify-end ${question ? "hidden sm:flex" : "flex"}`}>
          {jumpLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`inline-flex min-h-10 items-center rounded-full border border-stone-300 bg-white px-4 text-[13px] font-semibold text-stone-700 transition-colors hover:border-[#C2A05A] hover:text-stone-900 ${focusRing}`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        </div>
      </div>
    </header>
  );
}

export function ToolStage({ children }: { readonly children: React.ReactNode }) {
  return <section className="mx-auto max-w-[90rem] px-3 sm:px-8 lg:px-12 print:max-w-none print:px-0">{children}</section>;
}

export type GuideNavItem = { readonly id: string; readonly label: string };

/** The guide area: a sticky section index beside numbered panels. */
export function GuideLayout({
  eyebrow,
  title,
  nav,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly nav: readonly GuideNavItem[];
  readonly children: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-14 max-w-[90rem] px-4 sm:mt-20 sm:px-8 lg:px-12 print:hidden">
      <div className="mb-8 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">{eyebrow}</p>
        <h2 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.1rem]">{title}</h2>
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-12">
        <nav aria-label="Guide sections" className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-stone-200 bg-white/80 p-4">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">In this guide</p>
            <ol className="mt-2 space-y-0.5 text-[13px]">
              {nav.map((item, index) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`flex gap-2 rounded-lg px-2 py-1.5 text-stone-700 hover:bg-stone-100 hover:text-stone-900 ${focusRing}`}
                  >
                    <span className="w-4 shrink-0 text-right tabular-nums text-stone-400">{index + 1}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </div>
  );
}

export function GuideSection({
  id,
  n,
  title,
  children,
  aside,
}: {
  readonly id: string;
  readonly n: number;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly aside?: React.ReactNode;
}) {
  return (
    // On a phone every section but the first folds under its title (owner, 2026-11-23:
    // long pages should not scroll forever); from sm up it reads as before.
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <PhoneFold headingId={`${id}-title`} n={n} title={title} defaultOpen={n === 1}>
        <div className={aside ? "mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]" : "mt-5"}>
          <div className="min-w-0 space-y-4 text-[15.5px] leading-7 text-stone-700 sm:text-base [&>p]:max-w-[46rem] [&>ul]:max-w-[46rem] [&_table]:leading-snug">{children}</div>
          {aside ? <div className="min-w-0">{aside}</div> : null}
        </div>
      </PhoneFold>
    </section>
  );
}

/** Ordered steps with a number badge each. */
export function StepList({ steps }: { readonly steps: readonly { readonly title: string; readonly text: React.ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3 rounded-xl bg-stone-50 p-4 ring-1 ring-inset ring-stone-200">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A4823A] text-[11px] font-semibold text-[#080907]">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">{step.title}</p>
            <div className="mt-0.5 text-[15px] leading-relaxed text-stone-700">{step.text}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function BulletList({ items }: { readonly items: readonly React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[#a4823a]">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** A worked calculation: label, working, result. */
export function MathTable({
  caption,
  rows,
}: {
  readonly caption: string;
  readonly rows: readonly { readonly label: string; readonly working?: string; readonly value: string; readonly strong?: boolean }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full min-w-[420px] text-[14px]">
        <caption className="bg-stone-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
          {caption}
        </caption>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.label} className={row.strong ? "bg-amber-50/70" : ""}>
              <th scope="row" className={`px-4 py-2.5 text-left font-medium ${row.strong ? "text-stone-900" : "text-stone-700"}`}>
                {row.label}
              </th>
              <td className="px-4 py-2.5 text-stone-500">{row.working ?? ""}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${row.strong ? "font-semibold text-stone-900" : "text-stone-800"}`}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataTable({
  caption,
  head,
  rows,
}: {
  readonly caption?: string;
  readonly head: readonly string[];
  readonly rows: readonly (readonly React.ReactNode[])[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full min-w-[520px] text-[14px]">
        {caption ? (
          <caption className="bg-stone-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
            {caption}
          </caption>
        ) : null}
        <thead className="border-b border-stone-200 bg-white text-[11px] uppercase tracking-wide text-stone-500">
          <tr>
            {head.map((cell, index) => (
              <th key={index} scope="col" className={`px-4 py-2.5 font-semibold ${index === 0 ? "text-left" : "text-left"}`}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row" className="px-4 py-2.5 text-left font-medium text-stone-900">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex} className="px-4 py-2.5 text-stone-700">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({ title, children, tone = "neutral" }: { readonly title: string; readonly children: React.ReactNode; readonly tone?: "neutral" | "brass" }) {
  return (
    <div className={`rounded-xl p-4 ring-1 ring-inset ${tone === "brass" ? "bg-amber-50/70 ring-[#C2A05A]/40" : "bg-stone-50 ring-stone-200"}`}>
      <p className="text-[13px] font-semibold text-stone-900">{title}</p>
      <div className="mt-1 text-sm leading-relaxed text-stone-700">{children}</div>
    </div>
  );
}

export type FaqItem = { readonly question: string; readonly answer: string };

/** The FAQ the page's FAQPage JSON-LD is built from: one list, both places. */
export function FaqList({ items }: { readonly items: readonly FaqItem[] }) {
  return (
    <div className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200">
      {items.map((item, index) => (
        <details key={item.question} className="group bg-white open:bg-stone-50/60" open={index === 0}>
          <summary
            className={`flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-stone-900 [&::-webkit-details-marker]:hidden ${focusRing}`}
          >
            <h3 className="min-w-0">{item.question}</h3>
            <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="px-5 pb-5 text-[15px] leading-relaxed text-stone-700">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export type Source = { readonly label: string; readonly detail: string; readonly href: string };

export function SourceList({ sources }: { readonly sources: readonly Source[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {sources.map((source, index) => (
        <li key={source.href} className="flex gap-3">
          <span className="w-5 shrink-0 text-right tabular-nums text-stone-400">{index + 1}.</span>
          <span className="min-w-0">
            <a
              href={source.href}
              rel="noopener"
              target="_blank"
              className={`font-medium text-[#77591B] underline-offset-4 hover:underline ${focusRing}`}
            >
              {source.label}
            </a>
            <span className="block text-stone-600">{source.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export type RelatedLink = { readonly href: string; readonly title: string; readonly text: string };

export function RelatedGrid({ title, links }: { readonly title: string; readonly links: readonly RelatedLink[] }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">{title}</h2>
      <ul className={`mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${swipeRowInPanel}`}>
        {links.map((link) => (
          <li key={link.href} className={swipeItem}>
            <Link
              href={link.href}
              className={`group flex h-full flex-col rounded-xl border border-stone-200 bg-white px-4 py-4 transition-colors hover:border-[#c2a05a] ${focusRing}`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-[#0A0A0A]">
                {link.title}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#A4823A]" />
              </span>
              <span className="mt-1 text-xs leading-relaxed text-stone-600">{link.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProductBand({
  headline,
  text,
  softwareHref,
  softwareLabel,
}: {
  readonly headline: string;
  readonly text: string;
  readonly softwareHref: string;
  readonly softwareLabel: string;
}) {
  return (
    <aside
      aria-label="Altair Operating System"
      className="rounded-2xl bg-[#0d0f0c] px-6 py-7 text-[#f3ebdd] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] sm:px-8"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">Altair Operating System</p>
      <p className="mt-2 text-xl font-semibold text-[#fff9ea] sm:text-2xl">{headline}</p>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#c9bfae]">{text}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={softwareHref}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[#a4823a] px-6 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
        >
          See {softwareLabel}
        </Link>
        <Link
          href="/signup"
          className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.2)] px-6 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.4)] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
        >
          Start a 14-day free trial
        </Link>
        <Link
          href={VIDEO_PAGE_PATH}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm font-semibold text-[#e8d9ac] underline-offset-4 hover:underline ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
        >
          Watch one job, start to finish
        </Link>
      </div>
    </aside>
  );
}
