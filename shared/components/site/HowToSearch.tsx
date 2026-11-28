"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { howToNotePath } from "@/shared/lib/help/paths";
import { searchHelpNotes, type HelpSearchable } from "@/shared/lib/help/search";

/** What the search box needs of a note: enough to find it and link to it. */
export type HowToSearchNote = HelpSearchable & {
  readonly slug: string;
  readonly areaLabel: string;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40";

/**
 * The search box on the public how-to index. It filters notes already on the
 * page (no request is made), and shows nothing until something is typed, so
 * the grouped list below stays the page.
 */
export function HowToSearch({ notes }: { readonly notes: readonly HowToSearchNote[] }) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed ? searchHelpNotes(notes, trimmed).slice(0, 8) : []),
    [notes, trimmed],
  );

  return (
    <div className="mt-8">
      <label htmlFor={inputId} className="block text-sm font-medium text-stone-800">
        Search the how-to notes
      </label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Try invoice, receipt, invite, schedule"
        autoComplete="off"
        className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30"
      />

      {trimmed ? (
        <div className="mt-3" aria-live="polite">
          {results.length === 0 ? (
            <p className="text-sm text-stone-600">
              Nothing matches that yet. Try one word, such as the thing you are working on.
            </p>
          ) : (
            <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
              {results.map((note) => (
                <li key={note.slug}>
                  <Link
                    href={howToNotePath(note.slug)}
                    className={`block rounded-xl px-4 py-3 hover:bg-stone-50 ${focusRing}`}
                  >
                    <span className="block text-sm font-semibold text-stone-900">{note.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-stone-600">
                      {note.areaLabel} · {note.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
