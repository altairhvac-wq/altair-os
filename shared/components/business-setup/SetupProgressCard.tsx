"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { dismissGuidedSetupAction } from "@/app/actions/business-setup";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { BUSINESS_SETUP_STEPS } from "@/shared/types/business-numbers";

/**
 * The dashboard's way back into the guided setup, for an owner or admin who
 * has not finished it. On the computer and the phone alike.
 *
 * "Not now" stops it being offered. The numbers stay where they are, and the
 * setup can still be opened from Settings > Numbers.
 */

type SetupProgressCardProps = {
  readonly companyId: string;
  /** True once any step has been finished or skipped. */
  readonly started: boolean;
  /** Steps finished (a skipped step is not done). */
  readonly done: number;
  /** The step the setup would open on, in words ("your labor rate"), or null when only the summary is left. */
  readonly nextStepName: string | null;
  readonly className?: string;
};

export function SetupProgressCard({ companyId, started, done, nextStepName, className = "" }: SetupProgressCardProps) {
  const [hidden, setHidden] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const total = BUSINESS_SETUP_STEPS.length;

  if (hidden) return null;

  function dismiss() {
    startTransition(async () => {
      try {
        const result = await dismissGuidedSetupAction(companyId);
        if (result.error) {
          setProblem(result.error);
          return;
        }
        setHidden(true);
      } catch {
        setProblem("That did not save. Check your connection and try again.");
      }
    });
  }

  return (
    <section aria-label="Set up your shop" className={`rounded-2xl border border-[rgba(180,120,20,0.3)] bg-[rgba(255,248,230,0.95)] p-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold tracking-tight text-[#2b1f06]">{started ? "Finish setting up your shop" : "Set up your shop"}</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[#4a3408]">
            {started
              ? `${done} of ${total} steps done.${nextStepName ? ` Next: ${nextStepName}.` : ""}`
              : "Five short steps put your labor rate, your service call fee and a priced price book into the app. About ten minutes."}
          </p>
          <ol aria-hidden="true" className="mt-2 flex max-w-xs gap-1">
            {BUSINESS_SETUP_STEPS.map((step, index) => (
              <li key={step} className={`h-1.5 flex-1 rounded-full ${index < done ? "bg-altair-brass" : "bg-[rgba(124,90,20,0.22)]"}`} />
            ))}
          </ol>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/get-started" className={buttonClassName("primary", "sm", "flex-1 sm:flex-none")}>
            {started ? "Continue" : "Start"}
          </Link>
          <button type="button" disabled={isPending} onClick={dismiss} className={buttonClassName("secondary", "sm")}>
            Not now
          </button>
        </div>
      </div>
      {problem ? (
        <p role="alert" className="mt-2 text-[13px] text-[#991B1B]">
          {problem}
        </p>
      ) : null}
    </section>
  );
}
