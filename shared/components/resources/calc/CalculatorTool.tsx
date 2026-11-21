"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  Link2,
  Mail,
  Printer,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { ResultsEmailForm } from "@/shared/components/resources/ResultsEmailForm";
import {
  Field,
  NumberInput,
  Toast,
  ToolButton,
  focusRing,
} from "@/shared/components/resources/tools/ToolControls";
import { CALCULATOR_FIELD_KEYS } from "@/shared/lib/resources/calculator-summaries";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import {
  CARRY_SOURCE_NAMES,
  carryText,
  forgetCarried,
  type CarriedNumbers,
  type CarryKey,
} from "@/shared/components/resources/calc/carry";
import type { CalculatorTool as Tool } from "@/shared/components/resources/calc/useCalculatorTool";

/**
 * The application frame every calculator under /resources/calculators
 * shares, built to the Labor Cost Workspace standard: a dark toolbar (load a
 * sample, copy a share link, save in this browser, print or save as PDF),
 * inputs beside a live results panel, an analysis area with a chart, a
 * what-if table and the formula worked with the visitor's own numbers, and a
 * results bar that stays in view on a phone.
 */

export function CalculatorTool<K extends string>({
  name,
  tool,
  printTitle,
  carry,
  inputs,
  results,
  analysis,
  mobile,
  printInputs,
}: {
  /** Toolbar name, e.g. "Technician Pay Calculator". */
  readonly name: string;
  readonly tool: Tool<K>;
  readonly printTitle: string;
  readonly carry?: React.ReactNode;
  readonly inputs: React.ReactNode;
  readonly results: React.ReactNode;
  readonly analysis: React.ReactNode;
  readonly mobile: { readonly label: string; readonly value: string; readonly note?: string };
  /** The inputs as label/value pairs, for the printed worksheet. */
  readonly printInputs: readonly { readonly label: string; readonly value: string }[];
}) {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!presetsOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!presetsRef.current?.contains(event.target as Node)) setPresetsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresetsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [presetsOpen]);

  const emailValues: Record<string, string> = {};
  for (const key of CALCULATOR_FIELD_KEYS[tool.slug]) emailValues[key] = (tool.values as Record<string, string>)[key] ?? "";

  return (
    <div id="calculator" className="scroll-mt-24" onPointerDownCapture={tool.markInteracted} onKeyDownCapture={tool.markInteracted}>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_40px_100px_-60px_rgba(28,25,23,0.55)] print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        {/* ---------- toolbar ---------- */}
        <div className="flex flex-col gap-3 bg-[#0d0f0c] px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30">
              <Calculator aria-hidden="true" className="h-4.5 w-4.5 text-[#e8d9ac]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#fff9ea]">{name}</p>
              <p className="text-[11px] text-[#a99f8f]">Runs in your browser. Nothing you type is sent anywhere.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div ref={presetsRef} className="relative">
              <ToolButton variant="dark" size="sm" icon={RotateCcw} onClick={() => setPresetsOpen((open) => !open)}>
                Load sample
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
              </ToolButton>
              {presetsOpen ? (
                <div role="menu" className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl lg:left-auto lg:right-0">
                  {tool.presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        tool.loadPreset(preset);
                        setPresetsOpen(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left hover:bg-stone-50 ${focusRing}`}
                    >
                      <span className="block text-sm font-semibold text-stone-900">{preset.label}</span>
                      <span className="block text-xs text-stone-500">{preset.text}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <ToolButton variant="dark" size="sm" icon={Link2} onClick={tool.copyLink}>
              Copy share link
            </ToolButton>
            <ToolButton variant="dark" size="sm" icon={Save} onClick={tool.save}>
              Save in this browser
            </ToolButton>
            <ToolButton variant="primary" size="sm" icon={Printer} onClick={tool.print}>
              Print / PDF
            </ToolButton>
          </div>
        </div>

        {tool.restored || tool.hasSaved ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-amber-50/60 px-4 py-2 text-[13px] text-stone-700 sm:px-5 print:hidden">
            <span>
              {tool.restored === "link"
                ? "Showing the numbers from a shared link."
                : tool.restored === "saved"
                  ? "Restored the numbers you saved in this browser."
                  : "Your numbers are saved in this browser."}
            </span>
            {tool.hasSaved ? (
              <button type="button" onClick={tool.forget} className={`inline-flex items-center gap-1 rounded font-semibold text-[#77591B] hover:underline ${focusRing}`}>
                <X aria-hidden="true" className="h-3.5 w-3.5" /> Forget saved numbers
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ---------- print header ---------- */}
        <div className="hidden print:block print:pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">Altair Operating System · {name}</p>
          <p className="mt-1 text-xl font-semibold text-black">{printTitle}</p>
          <p className="text-xs text-stone-600">Estimates from the numbers entered below. Not tax, legal or accounting advice.</p>
          <table className="mt-3 w-full text-xs">
            <caption className="pb-1 text-left text-sm font-semibold text-black">Inputs</caption>
            <tbody>
              {printInputs.map((row) => (
                <tr key={row.label} className="border-b border-stone-200">
                  <td className="py-1 text-stone-700">{row.label}</td>
                  <td className="py-1 text-right tabular-nums text-black">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] print:block">
          {/* ---------- inputs ---------- */}
          <div className="min-w-0 border-stone-200 lg:border-r print:hidden">
            {carry ? <div className="border-b border-stone-200">{carry}</div> : null}
            <form className="space-y-6 px-4 py-5 sm:px-6 sm:py-6" onSubmit={(event) => event.preventDefault()} aria-label="Calculator inputs">
              {inputs}
            </form>
          </div>

          {/* ---------- results ---------- */}
          <aside id="results" aria-label="Results" className="scroll-mt-24 bg-stone-50/60 px-4 py-5 sm:px-6 print:bg-white print:px-0">
            <div className="space-y-4 lg:sticky lg:top-24">
              {results}
              <details className="group rounded-xl border border-stone-200 bg-white print:hidden">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-semibold text-stone-800 [&::-webkit-details-marker]:hidden ${focusRing}`}>
                  <span className="flex items-center gap-2">
                    <Mail aria-hidden="true" className="h-4 w-4 text-stone-500" /> Email me this result
                  </span>
                  <ChevronDown aria-hidden="true" className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-stone-100 px-4 pb-4 pt-3">
                  <ResultsEmailForm slug={tool.slug} values={emailValues} bare />
                </div>
              </details>
            </div>
          </aside>
        </div>

        {/* ---------- analysis ---------- */}
        <div id="analysis" className="scroll-mt-24 border-t border-stone-200 bg-white px-4 py-6 sm:px-6 print:break-before-page print:px-0">
          {analysis}
        </div>
      </div>

      {/* phone: the answer stays in view while typing */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{mobile.label}</p>
            <p className="truncate text-lg font-semibold tabular-nums text-stone-900">
              {mobile.value}
              {mobile.note ? <span className="ml-2 text-xs font-medium text-stone-500">{mobile.note}</span> : null}
            </p>
          </div>
          <a href="#results" className={`inline-flex min-h-10 shrink-0 items-center rounded-lg bg-[#0d0f0c] px-3.5 text-[13px] font-semibold text-[#f3ebdd] ${focusRing}`}>
            Results
          </a>
        </div>
      </div>

      <Toast message={tool.toast.message} />
    </div>
  );
}

/* ====================== inputs ====================== */

export function InputGroup({
  title,
  text,
  badge,
  children,
  columns = 2,
}: {
  readonly title: string;
  readonly text?: React.ReactNode;
  readonly badge?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly columns?: 2 | 3;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="flex w-full flex-wrap items-center justify-between gap-2">
        <span className="text-[15px] font-semibold text-stone-900">{title}</span>
        {badge}
      </legend>
      {text ? <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-stone-600">{text}</p> : null}
      <div className={`mt-3 grid gap-4 sm:grid-cols-2 ${columns === 3 ? "xl:grid-cols-3" : ""}`}>{children}</div>
    </fieldset>
  );
}

/** One numeric field bound to a calculator key. */
export function NumField<K extends string>({
  tool,
  k,
  label,
  hint,
  prefix,
  suffix,
  badge,
  invalid,
  placeholder = "0",
}: {
  readonly tool: Tool<K>;
  readonly k: K;
  readonly label: string;
  readonly hint?: React.ReactNode;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly badge?: React.ReactNode;
  readonly invalid?: boolean;
  readonly placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} badge={badge}>
      {({ id, hintId }) => (
        <NumberInput
          id={id}
          describedBy={hintId}
          value={tool.values[k]}
          onChange={(value) => tool.set(k, value)}
          prefix={prefix}
          suffix={suffix}
          invalid={invalid}
          placeholder={placeholder}
        />
      )}
    </Field>
  );
}

/** Quick-pick chips for a field (e.g. 10% / 15% / 20%). */
export function Chips<K extends string>({ tool, k, options, suffix = "" }: { readonly tool: Tool<K>; readonly k: K; readonly options: readonly string[]; readonly suffix?: string }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {options.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => tool.set(k, value)}
          aria-pressed={tool.values[k] === value}
          className={`min-h-11 rounded-lg border px-3.5 text-sm font-semibold tabular-nums transition-colors ${
            tool.values[k] === value ? "border-[#A4823A] bg-amber-50 text-[#77591B]" : "border-stone-300 text-stone-700 hover:border-[#C2A05A]"
          } ${focusRing}`}
        >
          {value}
          {suffix}
        </button>
      ))}
    </div>
  );
}

/* ====================== carry my numbers ====================== */

export type CarryField<K extends string> = {
  readonly key: K;
  readonly from: CarryKey;
  /** The field's name on this calculator. */
  readonly label: string;
  readonly format: (value: number) => string;
};

/**
 * "Use my labor rate from the Labor Cost Workspace": offers the numbers the
 * labor tools saved in this browser. Nothing is filled in until the button
 * is pressed. Without saved numbers it points at the workspace instead.
 */
export function CarryBanner<K extends string>({
  tool,
  carried,
  fields,
  emptyText,
  buttonLabel = "Use my labor rate from the",
}: {
  readonly tool: Tool<K>;
  readonly carried: CarriedNumbers | null;
  readonly fields: readonly CarryField<K>[];
  readonly emptyText: string;
  /** Followed by the source's name: "Use my labor rate from the Labor Cost Workspace". */
  readonly buttonLabel?: string;
}) {
  const usable = carried
    ? fields.flatMap((field) => {
        const value = carried[field.from];
        return typeof value === "number" ? [{ ...field, value }] : [];
      })
    : [];

  if (!carried || usable.length === 0) {
    return (
      <div className="flex flex-col gap-3 bg-stone-50/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:hidden">
        <p className="max-w-xl text-[13px] leading-relaxed text-stone-600">{emptyText}</p>
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
          <Link href={LABOR_WORKSPACE_PATH} className={`inline-flex items-center gap-1 rounded text-[#77591B] hover:underline ${focusRing}`}>
            Labor Cost Workspace <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
          <Link href={calculatorPath("labor-rate")} className={`inline-flex items-center gap-1 rounded text-stone-600 hover:text-stone-900 hover:underline ${focusRing}`}>
            Quick version
          </Link>
        </div>
      </div>
    );
  }

  const applied = usable.every((field) => tool.values[field.key] === carryText(field.value));
  const sourceName = CARRY_SOURCE_NAMES[carried.source];
  const saved = new Date(carried.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const apply = () => {
    tool.trackAction("carry");
    const next: Partial<Record<K, string>> = {};
    for (const field of usable) next[field.key] = carryText(field.value);
    tool.patch(next);
    tool.toast.show(`Filled in from your ${sourceName}.`);
  };

  return (
    <div className="bg-amber-50/70 px-4 py-3.5 sm:px-6 print:hidden">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
            Your numbers · {sourceName} · saved {saved}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-stone-700">
            {usable.map((field) => (
              <li key={field.key}>
                {field.label} <span className="font-semibold tabular-nums text-stone-900">{field.format(field.value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {applied ? (
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-emerald-700">
              <Check aria-hidden="true" className="h-4 w-4" /> Using your numbers
            </span>
          ) : (
            <ToolButton variant="primary" onClick={apply}>
              {buttonLabel} {sourceName}
            </ToolButton>
          )}
          <button
            type="button"
            onClick={forgetCarried}
            aria-label="Forget the carried numbers"
            title="Forget the carried numbers"
            className={`flex h-11 w-11 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-700 ${focusRing}`}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== results ====================== */

export function ResultHero({
  label,
  value,
  unit,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly note?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[#0d0f0c] p-5 text-[#f3ebdd] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">{label}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-[2.6rem] font-semibold leading-none tracking-tight tabular-nums text-[#fff9ea]" aria-live="polite">
          {value}
        </span>
        {unit ? <span className="text-sm text-[#a99f8f]">{unit}</span> : null}
      </p>
      {note ? <div className="mt-2 text-[13px] leading-relaxed text-[#c9bfae]">{note}</div> : null}
    </div>
  );
}

export function ResultTiles({ children }: { readonly children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-2.5">{children}</dl>;
}

export function ResultTile({
  label,
  value,
  note,
  strong,
  tone = "neutral",
}: {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
  readonly strong?: boolean;
  readonly tone?: "neutral" | "positive" | "negative";
}) {
  const color = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-stone-900";
  return (
    <div className={`min-w-0 rounded-xl border bg-white p-3 ${strong ? "border-[#C2A05A]/70 ring-1 ring-inset ring-[#C2A05A]/30" : "border-stone-200"}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className={`mt-1 truncate text-lg font-semibold tabular-nums ${color}`}>{value}</dd>
      {note ? <dd className="text-[11px] leading-snug text-stone-500">{note}</dd> : null}
    </div>
  );
}

/** Honest empty state when the inputs have no answer. */
export function NoResult({ title = "No result yet", text }: { readonly title?: string; readonly text: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="status">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold text-stone-900">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-700">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function Panel({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-[13px] font-semibold text-stone-900">{title}</p>
      {children}
    </div>
  );
}

/* ====================== analysis ====================== */

export function AnalysisGrid({ children }: { readonly children: React.ReactNode }) {
  return <div className="grid gap-5 lg:grid-cols-2">{children}</div>;
}

export function AnalysisCard({
  title,
  text,
  children,
  wide,
}: {
  readonly title: string;
  readonly text?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly wide?: boolean;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5 print:break-inside-avoid ${wide ? "lg:col-span-2" : ""}`}>
      <h3 className="text-[15px] font-semibold text-stone-900">{title}</h3>
      {text ? <div className="mt-1 text-[13px] leading-relaxed text-stone-600">{text}</div> : null}
      {children}
    </section>
  );
}

export function EmptyAnalysis({ text = "Appears once the inputs give a result." }: { readonly text?: string }) {
  return <p className="mt-4 rounded-lg bg-stone-50 px-3 py-6 text-center text-sm text-stone-500">{text}</p>;
}

/** A what-if table: rows by columns, the visitor's own case highlighted. */
export function WhatIfTable({
  caption,
  corner,
  columns,
  rows,
  minWidth = 460,
}: {
  readonly caption: string;
  readonly corner: string;
  readonly columns: readonly { readonly key: string; readonly label: string; readonly current?: boolean }[];
  readonly rows: readonly {
    readonly key: string;
    readonly label: React.ReactNode;
    readonly current?: boolean;
    readonly cells: readonly { readonly text: string; readonly tone?: "negative" | "positive" | "muted" | "strong" }[];
  }[];
  readonly minWidth?: number;
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
          <tr>
            <th scope="col" className="px-3 py-2.5 text-left font-semibold">
              {corner}
            </th>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`px-3 py-2.5 text-right font-semibold ${column.current ? "text-[#77591B]" : ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.key} className={row.current ? "bg-amber-50/80 font-semibold" : ""}>
              <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-stone-800">
                {row.label}
                {row.current ? <span className="ml-1.5 rounded bg-[#A4823A] px-1.5 py-0.5 text-[10px] font-semibold text-[#080907]">You</span> : null}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={columns[index]?.key ?? index}
                  className={`px-3 py-2 text-right tabular-nums ${
                    cell.tone === "negative"
                      ? "text-red-700"
                      : cell.tone === "positive"
                        ? "text-emerald-700"
                        : cell.tone === "muted"
                          ? "text-stone-500"
                          : cell.tone === "strong"
                            ? "font-semibold text-stone-900"
                            : columns[index]?.current
                            ? "text-stone-900"
                            : "text-stone-600"
                  }`}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type MathRow = { readonly label: string; readonly working?: string; readonly value: string; readonly strong?: boolean };

/** The formula, worked with the numbers in the fields right now. */
export function YourMath({ rows, note }: { readonly rows: readonly MathRow[]; readonly note?: string }) {
  return (
    <div className="mt-3">
      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full min-w-[440px] text-[13px]">
          <caption className="sr-only">The formula with your numbers</caption>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => (
              <tr key={row.label} className={row.strong ? "bg-amber-50/70" : ""}>
                <th scope="row" className={`px-3 py-2 text-left font-medium ${row.strong ? "text-stone-900" : "text-stone-700"}`}>
                  {row.label}
                </th>
                <td className="px-3 py-2 font-mono text-[12px] text-stone-500">{row.working ?? ""}</td>
                <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${row.strong ? "font-semibold text-stone-900" : "text-stone-800"}`}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="mt-2 text-xs leading-relaxed text-stone-500">{note}</p> : null}
    </div>
  );
}

/* ====================== formatting ====================== */

export function money(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "–";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(fraction: number | null, digits = 1): string {
  if (fraction === null || !Number.isFinite(fraction)) return "–";
  const value = Math.round(fraction * 100 * 10 ** digits) / 10 ** digits;
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(digits)}%`;
}

export function hours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} hrs`;
}

/** A typed number as it reads in a sentence: "$30", "12%", "1.5 hrs". */
export function shown(raw: string, unit: "$" | "%" | "hrs" | ""): string {
  const text = raw.trim() === "" ? "0" : raw.trim();
  return unit === "$" ? `$${Number(text).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : unit === "" ? text : `${text}${unit === "%" ? "%" : ` ${unit}`}`;
}
