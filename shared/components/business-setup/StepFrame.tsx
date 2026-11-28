"use client";

import { useState, useTransition } from "react";
import type { SetupActionResult } from "@/app/actions/business-setup";
import { altairMcCardClass, altairMcCardPadClass } from "@/shared/design-system/components/mc-surface";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { altairCanvasInkClass, altairCanvasInkMutedClass } from "@/shared/design-system/foundation";
import { BUSINESS_SETUP_STEPS } from "@/shared/types/business-numbers";

/**
 * The frame every step of the guided setup sits in: which step this is, the
 * one question it asks, the boxes, and the same three ways out (use it, go
 * back, skip for now).
 *
 * ============ ON A PHONE ============
 * A step can be taller than the screen, so the way forward is pinned above
 * the tab bar with the answer so far beside it, and any message about a save
 * that did not go through is shown there too. (.admin-sticky-footer sits on
 * --bottom-nav-offset, so it never covers the tabs.)
 */

export const SETUP_SAVE_FAILED_MESSAGE = "That did not save. Check your connection and try again. Nothing you typed was lost.";

export type StepProblem = {
  readonly message: string;
  readonly field: string | null;
  readonly row: number | null;
};

/**
 * Runs a step's save. Whatever goes wrong (a refused value, a dropped
 * connection, a server error) the boxes keep their text and `problem` says
 * what happened; `onDone` is called only with a result that saved.
 */
export function useStepSave(onDone: (result: SetupActionResult) => void) {
  const [isPending, startTransition] = useTransition();
  const [problem, setProblem] = useState<StepProblem | null>(null);

  function run(call: () => Promise<SetupActionResult>) {
    if (isPending) return;
    startTransition(async () => {
      let result: SetupActionResult;
      try {
        result = await call();
      } catch {
        setProblem({ message: SETUP_SAVE_FAILED_MESSAGE, field: null, row: null });
        return;
      }
      if (result.error || !result.record) {
        setProblem({ message: result.error ?? SETUP_SAVE_FAILED_MESSAGE, field: result.field ?? null, row: result.row ?? null });
        return;
      }
      setProblem(null);
      onDone(result);
    });
  }

  return { isPending, problem, clearProblem: () => setProblem(null), run };
}

type StepFrameProps = {
  /** 1-based position among the steps. */
  readonly number: number;
  readonly title: string;
  readonly lede: string;
  readonly primaryLabel: string;
  /** Short answer so far, shown beside the button on a phone ("$121 an hour"). */
  readonly headline?: string | null;
  readonly busy: boolean;
  readonly problem: StepProblem | null;
  /** The id the message carries, so a refused box can point at it. */
  readonly problemId: string;
  readonly onSubmit: () => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
  readonly children: React.ReactNode;
};

export function StepFrame({ number, title, lede, primaryLabel, headline, busy, problem, problemId, onSubmit, onBack, onSkip, children }: StepFrameProps) {
  const total = BUSINESS_SETUP_STEPS.length;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="min-w-0"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand-metal-text)]">
        Step {number} of {total}
      </p>
      {/* Focused when the step opens, so a keyboard or screen reader starts at the question, not at the top of the app. */}
      <h1 tabIndex={-1} className={`mt-1 text-[26px] font-bold leading-tight tracking-tight outline-none ${altairCanvasInkClass}`}>
        {title}
      </h1>
      <p className={`mt-1 max-w-2xl text-sm leading-relaxed ${altairCanvasInkMutedClass}`}>{lede}</p>

      <ol aria-hidden="true" className="mt-4 flex gap-1.5">
        {BUSINESS_SETUP_STEPS.map((step, index) => (
          <li key={step} className={`h-1.5 flex-1 rounded-full ${index < number ? "bg-altair-brass" : "bg-altair-border-strong/50"}`} />
        ))}
      </ol>

      <div className={`mt-4 ${altairMcCardClass} ${altairMcCardPadClass}`}>{children}</div>

      {/* One message at a time is announced: this one from the tablet width up, the pinned bar's on a phone. */}
      <div aria-live="polite" className="mt-3 min-h-0 max-sm:hidden">
        {problem ? (
          <p id={problemId} role="alert" className="rounded-xl border border-[rgba(185,28,28,0.28)] bg-[rgba(254,242,242,0.92)] px-3 py-2.5 text-[13px] leading-relaxed text-[#991B1B]">
            {problem.message}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 max-sm:hidden">
        <button type="submit" disabled={busy} className={buttonClassName("primary", "md")}>
          {busy ? "Saving…" : primaryLabel}
        </button>
        <button type="button" disabled={busy} onClick={onBack} className={buttonClassName("secondary", "md")}>
          Back
        </button>
        <button type="button" disabled={busy} onClick={onSkip} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline disabled:opacity-60">
          Skip for now
        </button>
      </div>

      <div aria-hidden="true" className={`sm:hidden ${problem ? "h-44" : "h-28"}`} />
      <div className="admin-sticky-footer sm:hidden">
        {problem ? (
          <p role="alert" className="mb-2 text-[13px] leading-snug text-[#991B1B]">
            {problem.message}
          </p>
        ) : null}
        {/* One line above the buttons: the answer so far on the left, the way back on the right. */}
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] font-semibold text-altair-ink-on-paper">{problem ? "" : headline ?? ""}</p>
          <button type="button" disabled={busy} onClick={onBack} className="-mr-2 min-h-11 shrink-0 px-2 text-[13px] font-semibold text-altair-ink-on-paper-secondary underline-offset-2 hover:underline">
            Back
          </button>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={buttonClassName("primary", "md", "min-w-0 flex-1")}>
            <span className="truncate">{busy ? "Saving…" : primaryLabel}</span>
          </button>
          <button type="button" disabled={busy} onClick={onSkip} className={buttonClassName("secondary", "md", "shrink-0")}>
            Skip
          </button>
        </div>
      </div>
    </form>
  );
}
