"use client";

import { useEffect, useRef, useState } from "react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import type { CalculatorSlug } from "@/shared/lib/resources/calculator-summaries";
import { copyText, readStorage, removeStorage, useToast, writeStorage } from "@/shared/components/resources/tools/ToolControls";

/**
 * State for one calculator under /resources/calculators: the fields as the
 * text the visitor typed, the presets, the share link, the saved copy and
 * the first-party "tool used" signal.
 *
 * ============ NOTHING LEAVES THE BROWSER ============
 * "Copy share link" puts the inputs in the page's own query string (the
 * visitor decides who gets it), "Save in this browser" writes them to
 * localStorage, "Print / PDF" is the browser's own dialog. The analytics
 * events carry the calculator's name and the button pressed, never a value.
 *
 * The query string and the storage slot keep the names the calculators have
 * used since they shipped (`?hourlyWage=30&...`, `altair-calculator:<slug>`),
 * so links and saved numbers from before this rebuild still open.
 */

export type CalcPreset<K extends string> = {
  readonly id: string;
  readonly label: string;
  readonly text: string;
  readonly values: Readonly<Record<K, string>>;
};

/** Each calculator's saved numbers live under this prefix plus its slug. "Your numbers" on the tools pages reads the same keys. */
export const CALCULATOR_STORAGE_PREFIX = "altair-calculator:";
const STORAGE_PREFIX = CALCULATOR_STORAGE_PREFIX;
const NUMBER_TEXT = /^-?\d{0,9}(\.\d{0,4})?$/;

/** Only this calculator's keys, only number-looking text; missing keys come from the fallback. */
function pickValues<K extends string>(keys: readonly K[], fallback: Record<K, string>, source: Record<string, unknown>) {
  let found = 0;
  const out = { ...fallback };
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && NUMBER_TEXT.test(value)) {
      out[key] = value;
      found += 1;
    }
  }
  return found > 0 ? out : null;
}

export function num(raw: string | undefined): number {
  const value = Number.parseFloat((raw ?? "").replace(/[$,%\s]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

export type CalculatorTool<K extends string> = ReturnType<typeof useCalculatorTool<K>>;

export function useCalculatorTool<K extends string>({
  slug,
  keys,
  presets,
}: {
  readonly slug: CalculatorSlug;
  readonly keys: readonly K[];
  /** The first preset is the worked example the calculator opens with. */
  readonly presets: readonly CalcPreset<K>[];
}) {
  const example = presets[0].values as Record<K, string>;
  const [values, setValues] = useState<Record<K, string>>(example);
  const [restored, setRestored] = useState<"link" | "saved" | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const toast = useToast();
  const storageKey = STORAGE_PREFIX + slug;

  // "Tool used" (once per page view, never a value): the numbers changed
  // because the visitor pressed or typed something, not because a saved copy
  // or a shared link was restored on load.
  const interacted = useRef(false);
  const markInteracted = () => {
    interacted.current = true;
  };
  useEffect(() => {
    if (interacted.current) trackEngagement("calculator_used", slug);
  }, [values, slug]);
  const trackAction = (action: "print" | "link" | "save" | "sample" | "carry") =>
    trackEngagement("cta_click", `tool-${slug}-${action}`, { repeat: true });

  // After the first render (so server HTML and hydration agree): a shared
  // link wins over this browser's saved copy.
  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    const fromLink = pickValues(keys, example, params);
    const stored = readStorage(storageKey);
    const fromStore = stored && typeof stored === "object" ? pickValues(keys, example, stored as Record<string, unknown>) : null;
    /* eslint-disable react-hooks/set-state-in-effect -- reads the URL and browser storage once after mount */
    if (fromStore) setHasSaved(true);
    if (fromLink) {
      setValues(fromLink);
      setRestored("link");
    } else if (fromStore) {
      setValues(fromStore);
      setRestored("saved");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // keys and presets are module constants; this runs once per calculator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const set = (key: K, value: string) => {
    // Typing always counts, however the field was reached (keyboard, paste, autofill).
    interacted.current = true;
    setValues((current) => ({ ...current, [key]: value }));
  };
  const patch = (next: Partial<Record<K, string>>) => setValues((current) => ({ ...current, ...next }));

  const clearQuery = () => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  };

  const loadPreset = (preset: CalcPreset<K>) => {
    trackAction("sample");
    setValues({ ...(preset.values as Record<K, string>) });
    setRestored(null);
    clearQuery();
    toast.show(preset.id === "blank" ? "Cleared. Enter your own numbers." : `${preset.label} loaded.`);
  };

  const copyLink = async () => {
    trackAction("link");
    const params = new URLSearchParams();
    for (const key of keys) params.set(key, values[key]);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}#calculator`;
    const ok = await copyText(url);
    if (!ok) window.history.replaceState(null, "", url);
    toast.show(ok ? "Link copied. Anyone with it sees these numbers." : "Your browser blocked the clipboard. The link is in the address bar.");
  };

  const save = () => {
    trackAction("save");
    const picked: Record<string, string> = {};
    for (const key of keys) picked[key] = values[key];
    const ok = writeStorage(storageKey, picked);
    if (ok) setHasSaved(true);
    toast.show(ok ? "Saved in this browser only." : "This browser is blocking storage, so nothing was saved.");
  };

  const forget = () => {
    removeStorage(storageKey);
    setHasSaved(false);
    setRestored(null);
    toast.show("Saved numbers removed from this browser.");
  };

  const print = () => {
    trackAction("print");
    window.print();
  };

  /** Still showing the worked example the page opened with. */
  const isExample = keys.every((key) => values[key] === example[key]);

  return {
    slug,
    values,
    isExample,
    set,
    patch,
    presets,
    loadPreset,
    restored,
    hasSaved,
    copyLink,
    save,
    forget,
    print,
    toast,
    markInteracted,
    /** True once the visitor has pressed or typed something on this page. */
    interacted,
    trackAction,
  };
}
