"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, PlayCircle } from "lucide-react";

/**
 * Client-side search over the library items the server already loaded
 * (published Insights pages and public channel videos). No request is made
 * while typing; filtering is a substring match on title, summary and source.
 * Every string is rendered as a React text node.
 *
 * ============ TWO SHELVES (2026-11-27) ============
 * It used to be one flat, newest-first list. Thirty of its 38 items were
 * technical lessons (chillers, data centers) from the school channel, so an
 * owner who came for pricing or invoicing saw a page that was not for them.
 * Now the items sit on two shelves: "Running the business" (the guides and
 * the software channel), shown first, and "How the equipment works" (the
 * school channel). A search looks on the open shelf and says when the other
 * shelf has matches. Twelve show at a time.
 */

export type LibraryItem = {
  readonly id: string;
  readonly kind: "article" | "video";
  /** Which shelf it sits on. */
  readonly audience: "business" | "equipment";
  readonly title: string;
  readonly summary: string;
  /** "Insights" or the channel name. */
  readonly source: string;
  readonly href: string;
  readonly external: boolean;
  readonly date: string;
};

type Shelf = "business" | "equipment" | "all";

const SHELVES: readonly { value: Shelf; label: string; text: string }[] = [
  { value: "business", label: "Running the business", text: "Pricing, invoicing, hiring and the software." },
  { value: "equipment", label: "How the equipment works", text: "Lessons from the Altair HVAC Exploration channel." },
  { value: "all", label: "Everything", text: "Both shelves, newest first." },
];

const PAGE_SIZE = 12;

function normalise(text: string): string {
  return text.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // One time zone for the server and every visitor. Formatting in the visitor's own zone made the server's text
  // and the browser's text differ for videos published near midnight UTC (a hydration error on every load in
  // US time zones, found 2026-11-27).
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/50 focus-visible:ring-offset-2";

export function LibrarySearch({ items }: { readonly items: readonly LibraryItem[] }) {
  const [query, setQuery] = useState("");
  // Open on the business shelf when it has anything; otherwise show everything.
  const [shelf, setShelf] = useState<Shelf>(() => (items.some((item) => item.audience === "business") ? "business" : "all"));
  const [shown, setShown] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);
  const inputId = useId();

  const indexed = useMemo(
    () =>
      items.map((item) => ({
        item,
        haystack: normalise(`${item.title} ${item.summary} ${item.source}`),
      })),
    [items],
  );

  const terms = normalise(deferredQuery).split(/\s+/).filter(Boolean);
  const matching = indexed.filter(({ haystack }) => terms.every((term) => haystack.includes(term))).map(({ item }) => item);
  const results = matching.filter((item) => shelf === "all" || item.audience === shelf);
  const elsewhere = shelf === "all" ? 0 : matching.length - results.length;
  const visible = results.slice(0, shown);
  const countOn = (value: Shelf) => (value === "all" ? items.length : items.filter((item) => item.audience === value).length);

  const pick = (value: Shelf) => {
    setShelf(value);
    setShown(PAGE_SIZE);
  };

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-stone-200/80 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div role="group" aria-label="Choose a shelf" className="grid gap-2 sm:grid-cols-3">
          {SHELVES.map((option) => {
            const active = shelf === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => pick(option.value)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  active ? "border-[#0d0f0c] bg-[#0d0f0c] text-[#fff9ea]" : "border-stone-300 bg-white text-stone-800 hover:border-[#C2A05A]"
                } ${focusRing}`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {option.label}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${active ? "bg-white/15 text-[#e8d9ac]" : "bg-stone-100 text-stone-600"}`}>
                    {countOn(option.value)}
                  </span>
                </span>
                <span className={`mt-0.5 block text-[13px] leading-snug ${active ? "text-[#c9bfae]" : "text-stone-600"}`}>{option.text}</span>
              </button>
            );
          })}
        </div>
        <label htmlFor={inputId} className="mt-4 block text-sm font-medium text-stone-800">
          Search
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShown(PAGE_SIZE);
          }}
          placeholder="Try pricing, invoice, capacitor, chiller…"
          autoComplete="off"
          className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30"
        />
      </div>

      <p className="mt-5 text-sm text-stone-600" aria-live="polite">
        {results.length === 1 ? "1 result" : `${results.length} results`}
        {terms.length > 0 && elsewhere > 0 ? (
          <>
            {" · "}
            <button type="button" onClick={() => pick("all")} className={`rounded font-semibold text-[#77591B] underline underline-offset-2 ${focusRing}`}>
              {elsewhere} more on the other shelf
            </button>
          </>
        ) : null}
      </p>

      {results.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-stone-200/80 bg-white px-6 py-10 text-center text-sm text-stone-600">
          {items.length === 0 ? "Nothing is in the library yet. Check back soon." : "Nothing matches that search here. Try a shorter or different word."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {visible.map((item) => {
            const Icon = item.kind === "video" ? PlayCircle : FileText;
            const body = (
              <>
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77591B]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-[#e8d9ac]">
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                  {item.kind === "video" ? "Video" : "Guide"} · {item.source}
                </span>
                {/* The new-tab note lives in the link's accessible name, not in the heading, so search engines read the title alone. */}
                <h2 className="mt-2.5 text-base font-semibold leading-snug tracking-tight text-[#0A0A0A] group-hover:text-[#77591B]">{item.title}</h2>
                {item.summary ? <span className="mt-1.5 block text-sm leading-relaxed text-stone-600">{item.summary}</span> : null}
                <span className="mt-auto flex items-center justify-between gap-3 pt-3 text-[13px] text-stone-500">
                  {formatDate(item.date) ? <time dateTime={item.date}>{formatDate(item.date)}</time> : <span />}
                  <span className="inline-flex items-center gap-1 font-semibold text-[#77591B]">
                    {item.external ? "Watch on YouTube" : "Read it"}
                    <ArrowUpRight aria-hidden="true" className={`h-3.5 w-3.5 ${item.external ? "" : "rotate-45"}`} />
                  </span>
                </span>
              </>
            );
            const cardClass = `group flex h-full flex-col rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-sm transition-colors hover:border-[#C2A05A] ${focusRing}`;
            return (
              <li key={item.id}>
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} (opens YouTube in a new tab)`} className={cardClass}>
                    {body}
                  </a>
                ) : (
                  <Link href={item.href} className={cardClass}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {results.length > shown ? (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setShown(results.length)}
            className={`inline-flex min-h-11 items-center rounded-lg border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:border-[#C2A05A] ${focusRing}`}
          >
            Show all {results.length}
          </button>
        </div>
      ) : null}
    </div>
  );
}
