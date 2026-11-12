"use client";

import { useEffect, useId, useState } from "react";

/**
 * The shared input and results pieces for the Resource Center calculators.
 *
 * Inputs are kept as the raw strings the visitor typed, so clearing a field
 * to retype it does not snap back to 0; the calculator parses them on every
 * render.
 *
 * ============ REMEMBERED ON THIS DEVICE, NEVER SENT ============
 * So an owner can come back to their own numbers, the inputs are saved in
 * this browser's localStorage and restored on the next visit, and "Copy a
 * link to these numbers" puts them in the page's query string for the owner
 * to share. Nothing is sent to Altair: there is no request, no cookie and no
 * analytics event carrying a value. A shared link wins over saved numbers;
 * "Reset" clears both back to the example.
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

const STORAGE_PREFIX = "altair-calculator:";

function readStored(id: string): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + id);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : null;
  } catch {
    return null;
  }
}

/** Only known keys, only number-looking values: a link cannot inject anything else. */
function pickValues<K extends string>(defaults: Record<K, string>, source: Record<string, string | null>) {
  const out: Partial<Record<K, string>> = {};
  for (const key of Object.keys(defaults) as K[]) {
    const value = source[key];
    if (typeof value === "string" && /^-?\d{0,9}(\.\d{0,4})?$/.test(value) && value !== "") out[key] = value;
  }
  return out;
}

/**
 * Field values as strings, seeded from the example defaults, then (after the
 * first render, so the server HTML and the first client render agree) from a
 * shared link or this device's saved numbers. `id` names the calculator's
 * storage slot; without it nothing is remembered.
 */
export function useCalculatorFields<K extends string>(defaults: Record<K, string>, id?: string) {
  const [values, setValues] = useState<Record<K, string>>(defaults);
  const [restored, setRestored] = useState<"link" | "saved" | null>(null);

  useEffect(() => {
    if (!id) return;
    const params = new URLSearchParams(window.location.search);
    const fromLink = pickValues(defaults, Object.fromEntries(params.entries()));
    const fromStore = pickValues(defaults, readStored(id) ?? {});
    const source = Object.keys(fromLink).length > 0 ? "link" : Object.keys(fromStore).length > 0 ? "saved" : null;
    if (source) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL and browser storage once after mount
      setValues({ ...defaults, ...(source === "link" ? fromLink : fromStore) });
      setRestored(source);
    }
    // Defaults are module constants; this runs once per calculator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Saved only when the visitor types, never from an effect: an effect would
  // write the example values over the saved ones before they were read back.
  const persist = (next: Record<K, string>) => {
    if (!id) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: the calculator still works, it just forgets.
    }
  };

  const setField = (key: K, value: string) =>
    setValues((current) => {
      const next = { ...current, [key]: value };
      persist(next);
      return next;
    });
  const reset = () => {
    setValues(defaults);
    setRestored(null);
    if (id) {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + id);
      } catch {
        // nothing stored to clear
      }
      if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    }
  };
  /** The current page address with these numbers in it. */
  const shareUrl = () => {
    const params = new URLSearchParams();
    for (const key of Object.keys(values) as K[]) params.set(key, values[key]);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  return { values, setField, reset, restored, shareUrl };
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

const smallButton =
  "inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40";

export function CalculatorLayout({
  fields,
  results,
  onReset,
  shareUrl,
  restored = null,
}: {
  readonly fields: React.ReactNode;
  readonly results: React.ReactNode;
  readonly onReset: () => void;
  /** Builds a link carrying the current inputs; omit to hide the button. */
  readonly shareUrl?: () => string;
  readonly restored?: "link" | "saved" | null;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!shareUrl) return;
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard permission: put the link in the address bar so it can be copied by hand.
      window.history.replaceState(null, "", url);
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <form
        className="rounded-2xl border border-stone-200/80 bg-white px-5 py-5 shadow-sm sm:px-6"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Calculator inputs"
      >
        {restored ? (
          <p className="mb-5 rounded-lg bg-[#f6efe0] px-3 py-2 text-xs text-[#5c4614]">
            {restored === "link"
              ? "These are the numbers from the link you opened."
              : "Welcome back. These are the numbers you entered last time."}
          </p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">{fields}</div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {shareUrl ? (
            <button type="button" onClick={copy} className={smallButton} aria-live="polite">
              {copied ? "Link copied" : "Copy a link to these numbers"}
            </button>
          ) : null}
          <button type="button" onClick={onReset} className={smallButton}>
            Reset to example values
          </button>
        </div>
        {shareUrl ? (
          <p className="mt-3 text-xs text-stone-500">
            Your numbers are saved in this browser so they are here when you come back. They are never sent to us.
          </p>
        ) : null}
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
