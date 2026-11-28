"use client";

import type { LucideIcon } from "lucide-react";
import { RotateCcw } from "lucide-react";
import { focusRing } from "@/shared/components/resources/tools/ToolControls";

/**
 * The window every software-page demo sits in: a dark title bar naming the
 * demo, a "Sample data" tag, and a reset. Light inside, like the product.
 *
 * The demos are walk-throughs of the real workflow with made-up records.
 * Nothing in them calls a server, stores anything or sends anything.
 */
export function DemoFrame({
  id,
  icon: Icon,
  title,
  subtitle,
  onReset,
  children,
  onInteract,
}: {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly subtitle: string;
  readonly onReset: () => void;
  readonly children: React.ReactNode;
  /** Called on the first pointer or key press inside (analytics). */
  readonly onInteract?: () => void;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-[rgba(230,227,220,0.16)] bg-white text-stone-800 shadow-[0_50px_120px_-60px_rgba(0,0,0,0.9),0_0_0_1px_rgba(194,160,90,0.12)]"
      onPointerDownCapture={onInteract}
      onKeyDownCapture={onInteract}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d0f0c] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a4823a]/15 text-[#e8d9ac] ring-1 ring-inset ring-[#c2a05a]/30">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#fff9ea]">
              {title}
              <span className="rounded-full bg-[#a4823a]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e8d9ac] ring-1 ring-inset ring-[#c2a05a]/35">
                Sample data
              </span>
            </p>
            <p className="text-xs text-[#a89c88]">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-[13px] font-semibold text-[#f3ebdd] transition-colors hover:border-white/30 hover:bg-white/[0.12] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Start over
        </button>
      </div>
      {children}
    </div>
  );
}

export type DemoStep = { readonly id: string; readonly label: string };

/** Numbered progress across the top of a demo. Steps before `current` are done. */
export function DemoStepper({
  steps,
  current,
  onSelect,
  canSelect,
}: {
  readonly steps: readonly DemoStep[];
  readonly current: number;
  readonly onSelect: (index: number) => void;
  readonly canSelect: (index: number) => boolean;
}) {
  return (
    <ol className="flex gap-1.5 overflow-x-auto border-b border-stone-200 bg-stone-50 px-3 py-2.5 sm:px-5" aria-label="Demo steps">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const enabled = canSelect(index);
        return (
          <li key={step.id} className="shrink-0">
            <button
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(index)}
              aria-current={active ? "step" : undefined}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed ${
                active
                  ? "bg-stone-900 text-white"
                  : done
                    ? "bg-white text-stone-800 ring-1 ring-inset ring-stone-200 hover:ring-[#C2A05A]"
                    : "text-stone-400"
              } ${focusRing}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  active ? "bg-[#A4823A] text-[#080907]" : done ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Status pill colours: green good, amber waiting, red overdue, neutral draft. */
export function StatusPill({ tone, children }: { readonly tone: "neutral" | "info" | "warning" | "success" | "danger"; readonly children: React.ReactNode }) {
  const look = {
    neutral: "bg-stone-100 text-stone-700 ring-stone-200",
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    danger: "bg-red-50 text-red-800 ring-red-200",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${look}`}>{children}</span>;
}
