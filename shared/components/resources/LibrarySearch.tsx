"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import Link from "next/link";

/**
 * Client-side search over the library items the server already loaded
 * (published Insights pages and public channel videos). No request is made
 * while typing; filtering is a substring match on title, summary and source.
 * Every string is rendered as a React text node.
 */

export type LibraryItem = {
  readonly id: string;
  readonly kind: "article" | "video";
  readonly title: string;
  readonly summary: string;
  /** "Insights" or the channel name. */
  readonly source: string;
  readonly href: string;
  readonly external: boolean;
  readonly date: string;
};

type Filter = "all" | "article" | "video";

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "article", label: "Articles" },
  { value: "video", label: "Videos" },
];

function normalise(text: string): string {
  return text.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function LibrarySearch({ items }: { readonly items: readonly LibraryItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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
  const results = indexed
    .filter(({ item }) => filter === "all" || item.kind === filter)
    .filter(({ haystack }) => terms.every((term) => haystack.includes(term)))
    .map(({ item }) => item);

  return (
    <div className="mt-10">
      <div className="rounded-2xl border border-stone-200/80 bg-white px-5 py-5 shadow-sm sm:px-6">
        <label htmlFor={inputId} className="block text-sm font-medium text-stone-800">
          Search the library
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try pricing, capacitor, dispatch, invoices…"
          autoComplete="off"
          className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30"
        />
        <div role="group" aria-label="Filter by type" className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={[
                "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40",
                filter === option.value
                  ? "border-[#a4823a] bg-[#a4823a] text-[#080907]"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm text-stone-600" aria-live="polite">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>

      {results.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-stone-200/80 bg-white px-6 py-10 text-center text-sm text-stone-600">
          {items.length === 0
            ? "Nothing is in the library yet. Check back soon."
            : "Nothing matches that search. Try a shorter or different word."}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {results.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-sm sm:px-6"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77591B]">
                {item.kind === "video" ? "Video" : "Article"} · {item.source}
              </p>
              <h2 className="mt-1.5 text-base font-semibold tracking-tight text-[#0A0A0A]">
                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
                  >
                    {item.title}
                    <span className="sr-only"> (opens YouTube in a new tab)</span>
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
                  >
                    {item.title}
                  </Link>
                )}
              </h2>
              {item.summary ? (
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{item.summary}</p>
              ) : null}
              {formatDate(item.date) ? (
                <p className="mt-2 text-xs text-stone-500">
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                  {item.external ? " · Watch on YouTube" : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
