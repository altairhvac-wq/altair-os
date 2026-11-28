"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { focusRing } from "@/shared/components/resources/tools/ToolControls";

/**
 * "Mark done" for the learning path on /resources/guides, remembered in this
 * browser only (localStorage, one key), so an owner can come back and pick
 * up where they stopped. A convenience, not a record: nothing is sent, a
 * blocked or cleared storage simply shows every step as not done, and the
 * page reads the same without it. The only signal is a `cta_click` named
 * for the step, never anything typed.
 */

const STORAGE_KEY = "altair-learning-path:v1";
const CHANGE_EVENT = "altair-learning-path-change";

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && /^[a-z0-9-]{1,40}$/.test(id)) : [];
  } catch {
    return [];
  }
}

function write(ids: readonly string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage blocked: the toggle still works for this visit
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

let memory: string[] | null = null;

function useDone(): readonly [readonly string[], (id: string) => void] {
  const [done, setDone] = useState<readonly string[]>([]);
  useEffect(() => {
    const sync = () => setDone(memory ?? read());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = (id: string) => {
    const current = memory ?? read();
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    memory = next;
    if (!current.includes(id)) trackEngagement("cta_click", `tool-learning-path-done-${id}`.slice(0, 64), { repeat: true });
    write(next);
  };
  return [done, toggle] as const;
}

export function StepDoneToggle({ id, title }: { readonly id: string; readonly title: string }) {
  const [done, toggle] = useDone();
  const on = done.includes(id);
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={on}
      aria-label={`${on ? "Done" : "Mark done"}: ${title}`}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
        on ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-stone-300 bg-white text-stone-600 hover:border-[#C2A05A] hover:text-stone-900"
      } ${focusRing}`}
    >
      <Check aria-hidden="true" className={`h-4 w-4 ${on ? "" : "text-stone-400"}`} />
      {on ? "Done" : "Mark done"}
    </button>
  );
}

export function StepBadge({ id, n }: { readonly id: string; readonly n: number }) {
  const [done] = useDone();
  const on = done.includes(id);
  return (
    <span
      aria-hidden="true"
      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ring-4 ring-stone-50 transition-colors ${
        on ? "bg-emerald-600 text-white" : "bg-[#0d0f0c] text-[#e8d9ac]"
      }`}
    >
      {on ? <Check className="h-4.5 w-4.5" /> : n}
    </span>
  );
}

export function PathMeter({ ids }: { readonly ids: readonly string[] }) {
  const [done] = useDone();
  const count = ids.filter((id) => done.includes(id)).length;
  const share = ids.length > 0 ? count / ids.length : 0;
  return (
    <div>
      <p className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-[#fff9ea]">
          <span className="tabular-nums">{count}</span> of {ids.length} done
        </span>
        <span className="text-xs tabular-nums text-[#8e826f]">{Math.round(share * 100)}%</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(230,227,220,0.1)]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#c2a05a] transition-[width]" style={{ width: `${share * 100}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-[#8e826f]">Remembered in this browser only.</p>
    </div>
  );
}
