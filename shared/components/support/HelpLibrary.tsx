"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/design-system/components";
import { helpNotePath } from "@/shared/lib/help/paths";
import { searchHelpNotes, type HelpSearchable } from "@/shared/lib/help/search";

/** A note as the Help page needs it: findable, groupable and linkable. */
export type HelpLibraryNote = HelpSearchable & {
  readonly slug: string;
  readonly areaId: string;
};

export type HelpLibraryArea = {
  readonly id: string;
  readonly label: string;
};

type HelpLibraryProps = {
  /** Only the notes this person can follow, in catalog order. */
  notes: readonly HelpLibraryNote[];
  /** Areas in display order. Areas with no notes for this person are skipped. */
  areas: readonly HelpLibraryArea[];
};

const noteLinkClass =
  "flex h-full flex-col rounded-[var(--radius-control)] border border-altair-border/50 px-3 py-2.5 transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";

function NoteLink({ note }: { note: HelpLibraryNote }) {
  return (
    <Link href={helpNotePath(note.slug)} className={noteLinkClass}>
      <span className="text-sm font-semibold text-altair-ink-on-paper">{note.title}</span>
      <span className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
        {note.summary}
      </span>
    </Link>
  );
}

/**
 * "How do I...?" on the Help page: a search box over the how-to notes this
 * person can follow, and the same notes grouped by area. The search runs in
 * the browser over the notes already on the page.
 */
export function HelpLibrary({ notes, areas }: HelpLibraryProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed ? searchHelpNotes(notes, trimmed) : []),
    [notes, trimmed],
  );

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        Search the how-to notes
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-altair-ink-on-paper-muted"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search: invoice, receipt, invite"
          autoComplete="off"
          className="w-full pl-9"
        />
      </div>

      {trimmed ? (
        <div className="mt-3" aria-live="polite">
          {results.length === 0 ? (
            <p className="text-sm text-altair-ink-on-paper-secondary">
              Nothing matches that yet. Try one word, or write to us below.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.map((note) => (
                <li key={note.slug}>
                  <NoteLink note={note} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {areas.map((area) => {
            const inArea = notes.filter((note) => note.areaId === area.id);
            if (inArea.length === 0) return null;
            return (
              <section key={area.id} aria-label={area.label}>
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--brand-metal-text)]">
                  {area.label}
                </h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {inArea.map((note) => (
                    <li key={note.slug}>
                      <NoteLink note={note} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
