"use client";

import Link from "next/link";
import { ArrowRight, Calculator, RotateCcw } from "lucide-react";
import { Toast, focusRing } from "@/shared/components/resources/tools/ToolControls";

/**
 * The compact frame a free tool uses when it is built into an Insights
 * article: the calculator's own inputs and live result in one panel, and a
 * link that opens the full tool with the same numbers filled in (the full
 * calculators read their fields from the query string, the same way their
 * "Copy share link" does).
 *
 * No share, save, print or email here: those live on the full tool, one
 * click away. Everything still runs in the browser and nothing typed is sent
 * anywhere; the only signal is the calculator's own "tool used" event, which
 * carries the tool's name and the article's path, never a value.
 */

export type CompactTool = {
  readonly toast: { readonly message: string | null };
  readonly markInteracted: () => void;
};

export function CompactCalculator({
  name,
  text,
  tool,
  carry,
  inputs,
  results,
  fullHref,
  fullLabel,
  fullTrack,
  onReset,
  footnote,
}: {
  readonly name: string;
  /** One line under the name: what to put in. */
  readonly text: React.ReactNode;
  readonly tool: CompactTool;
  readonly carry?: React.ReactNode;
  readonly inputs: React.ReactNode;
  readonly results: React.ReactNode;
  /** The full tool, with these numbers in its query string. */
  readonly fullHref: string;
  readonly fullLabel: string;
  /** `data-track` label for the full-tool link (a `cta_click` "next-" step). */
  readonly fullTrack: string;
  readonly onReset?: () => void;
  readonly footnote?: React.ReactNode;
}) {
  return (
    <div onPointerDownCapture={tool.markInteracted} onKeyDownCapture={tool.markInteracted}>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_30px_80px_-55px_rgba(28,25,23,0.6)]">
        <div className="flex items-center justify-between gap-3 bg-[#0d0f0c] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30">
              <Calculator aria-hidden="true" className="h-4.5 w-4.5 text-[#e8d9ac]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#fff9ea]">{name}</p>
              <p className="text-[11px] text-[#a99f8f]">Runs in your browser. Nothing you type is sent anywhere.</p>
            </div>
          </div>
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(230,227,220,0.18)] px-3 text-[12px] font-semibold text-[#f3ebdd] hover:border-[#c2a05a]/60 ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to the example</span>
              <span className="sm:hidden">Reset</span>
            </button>
          ) : null}
        </div>

        {carry ? <div className="border-b border-stone-200">{carry}</div> : null}

        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,290px)]">
          <form
            className="min-w-0 space-y-4 border-stone-200 px-4 py-5 sm:px-5 md:border-r"
            onSubmit={(event) => event.preventDefault()}
            aria-label={`${name} inputs`}
          >
            <p className="text-[13px] leading-relaxed text-stone-600">{text}</p>
            <div className="grid gap-4 sm:grid-cols-2">{inputs}</div>
          </form>
          <div aria-label={`${name} result`} role="group" className="min-w-0 space-y-3 bg-stone-50/70 px-4 py-5 sm:px-5">
            {results}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-stone-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {footnote ? <p className="text-xs leading-relaxed text-stone-500">{footnote}</p> : <span />}
          <Link
            href={fullHref}
            data-track={fullTrack.slice(0, 64)}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0d0f0c] px-4 text-[13px] font-semibold text-[#f3ebdd] transition-colors hover:bg-[#1b1e18] ${focusRing}`}
          >
            {fullLabel}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <Toast message={tool.toast.message} />
    </div>
  );
}

/** The full calculator's address with these fields in its query string (what its share link does). */
export function withNumbers(path: string, values: Readonly<Record<string, string>>, hash = "calculator"): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) params.set(key, value);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

/** A small result line: label, value, optional note. */
export function CompactStat({
  label,
  value,
  note,
  tone = "neutral",
}: {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
  readonly tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const color =
    tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : tone === "warning" ? "text-amber-800" : "text-stone-900";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-stone-200/80 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[13px] text-stone-600">
        {label}
        {note ? <span className="block text-[11px] text-stone-500">{note}</span> : null}
      </dt>
      <dd className={`shrink-0 text-[15px] font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}
