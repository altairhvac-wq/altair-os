"use client";

import { useId, useState } from "react";

/**
 * The shared input and results pieces for the Resource Center calculators.
 *
 * Inputs are kept as the raw strings the visitor typed, so clearing a field
 * to retype it does not snap back to 0; the calculator parses them on every
 * render. Values live only in component state; nothing is stored or sent.
 */

export type FieldSpec<K extends string> = {
  readonly key: K;
  readonly label: string;
  readonly hint?: string;
  readonly unit: "$" | "%" | "hrs" | "hrs/wk";
  readonly step?: number;
  readonly min?: number;
  readonly max?: number;
};

export function parseNumber(raw: string): number {
  const value = Number.parseFloat(raw.replace(/[$,%\s]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

/**
 * Field values as strings, seeded from the example defaults. Nothing is
 * persisted: a reload starts from the example again, and no input leaves
 * the page.
 */
export function useCalculatorFields<K extends string>(defaults: Record<K, string>) {
  const [values, setValues] = useState<Record<K, string>>(defaults);

  const setField = (key: K, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const reset = () => setValues(defaults);

  return { values, setField, reset };
}

export function NumberField<K extends string>({
  spec,
  value,
  onChange,
}: {
  readonly spec: FieldSpec<K>;
  readonly value: string;
  readonly onChange: (key: K, value: string) => void;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const prefix = spec.unit === "$" ? "$" : null;
  const suffix = spec.unit === "$" ? null : spec.unit;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {spec.label}
      </label>
      <div className="mt-1.5 flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-[#A4823A] focus-within:ring-2 focus-within:ring-[#C2A05A]/30">
        {prefix ? (
          <span className="pl-3 text-sm text-stone-500" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={spec.step ?? "any"}
          min={spec.min ?? 0}
          max={spec.max}
          value={value}
          aria-describedby={spec.hint ? hintId : undefined}
          onChange={(event) => onChange(spec.key, event.target.value)}
          className="min-h-11 w-full min-w-0 rounded-lg bg-transparent px-3 py-2 text-base text-stone-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix ? (
          <span className="pr-3 text-sm text-stone-500" aria-hidden="true">
            {suffix}
          </span>
        ) : null}
      </div>
      {spec.hint ? (
        <p id={hintId} className="mt-1 text-xs leading-relaxed text-stone-500">
          {spec.hint}
        </p>
      ) : null}
    </div>
  );
}

export type ResultLine = {
  readonly label: string;
  readonly value: string;
  readonly emphasis?: boolean;
  readonly tone?: "neutral" | "negative";
};

/** The shared results pattern: one headline figure, then the working. */
export function ResultsPanel({
  headlineLabel,
  headlineValue,
  headlineNote,
  lines,
  invalidMessage,
}: {
  readonly headlineLabel: string;
  readonly headlineValue: string | null;
  readonly headlineNote?: string;
  readonly lines: readonly ResultLine[];
  readonly invalidMessage: string;
}) {
  return (
    <section
      aria-label="Results"
      aria-live="polite"
      className="rounded-2xl border border-[#2a2a24] bg-[#0c0f0b] px-5 py-6 text-[#f3ebdd] shadow-sm sm:px-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c2a05a]">
        {headlineLabel}
      </p>
      {headlineValue === null ? (
        <p className="mt-3 text-sm leading-relaxed text-[#e8dcc4]">{invalidMessage}</p>
      ) : (
        <>
          <p className="mt-2 text-[2.25rem] font-semibold tracking-tight text-[#fff9ea] tabular-nums">
            {headlineValue}
          </p>
          {headlineNote ? (
            <p className="mt-1 text-xs text-[#c9bfae]">{headlineNote}</p>
          ) : null}
          <dl className="mt-5 space-y-2.5 border-t border-[rgba(251,247,239,0.1)] pt-4 text-sm">
            {lines.map((line) => (
              <div key={line.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-[#c9bfae]">{line.label}</dt>
                <dd
                  className={[
                    "tabular-nums",
                    line.emphasis ? "font-semibold text-[#fff9ea]" : "text-[#f3ebdd]",
                    line.tone === "negative" ? "text-[#f0a58f]" : "",
                  ].join(" ")}
                >
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}

export function CalculatorLayout({
  fields,
  results,
  onReset,
}: {
  readonly fields: React.ReactNode;
  readonly results: React.ReactNode;
  readonly onReset: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <form
        className="rounded-2xl border border-stone-200/80 bg-white px-5 py-5 shadow-sm sm:px-6"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Calculator inputs"
      >
        <div className="grid gap-5 sm:grid-cols-2">{fields}</div>
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
        >
          Reset to example values
        </button>
      </form>
      <div className="lg:sticky lg:top-24 lg:self-start">{results}</div>
    </div>
  );
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatPercent(fraction: number | null): string {
  if (fraction === null || !Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(1)}%`;
}
