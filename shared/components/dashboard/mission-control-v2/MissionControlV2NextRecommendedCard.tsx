"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Sparkles } from "lucide-react";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import { altairSemanticSurfaceClass } from "@/shared/design-system/foundation";
import {
  getNextOnboardingChecklistItem,
  getOnboardingProgressPercent,
} from "@/shared/lib/onboarding-activation";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { missionControlV2SampleData } from "./sample-data";

function NextRecommendedCaughtUp() {
  return (
    <div
      className={`h-auto rounded-none border border-[var(--north-star-border)] ${altairMcCardPadClass} ${altairSemanticSurfaceClass.success}`}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0 text-altair-success"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-altair-success-foreground">
            You&apos;re all caught up!
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-altair-success-foreground/80">
            Required setup is done — nothing waiting in the onboarding path.
          </p>
        </div>
      </div>
    </div>
  );
}

export function MissionControlV2NextRecommendedCard({
  checklist,
}: {
  checklist?: OnboardingChecklist;
}) {
  const [remainingStepsOpen, setRemainingStepsOpen] = useState(false);
  const sample = missionControlV2SampleData.nextRecommended;

  if (!checklist) {
    return (
      <section className="flex h-auto min-w-0 flex-col gap-3 self-start">
        <SectionHeader title="Next recommended" />
        <div className={`h-auto ${altairMcCardClass} ${altairMcCardPadClass}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-altair-brass/15 text-altair-brass">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-altair-ink-on-paper">
                {sample.headline}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
                {sample.subtext}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const nextStep = getNextOnboardingChecklistItem(checklist);
  const showCaughtUp = checklist.isComplete || !nextStep;
  const remainingSteps = checklist.items.filter(
    (item) => !item.completed && item.id !== nextStep?.id,
  );
  const progressPercent = getOnboardingProgressPercent(checklist);

  return (
    <section className="flex h-auto min-w-0 flex-col gap-3 self-start">
      <SectionHeader title="Next recommended" />
      {showCaughtUp ? (
        <NextRecommendedCaughtUp />
      ) : (
        <div className={`h-auto ${altairMcCardClass} ${altairMcCardPadClass}`}>
          <Link
            href={nextStep.href}
            className="flex items-start gap-3 rounded-md transition-colors hover:bg-altair-brass/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-altair-brass/15 text-altair-brass">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-altair-ink-on-paper">
                {nextStep.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
                {nextStep.description}
              </p>
            </div>
          </Link>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-altair-ink-on-paper-muted">
              <span>{progressPercent}% ready</span>
              <span>
                {checklist.completedCount}/{checklist.totalCount}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-altair-paper-subtle"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Workspace setup progress"
            >
              <div
                className="h-full rounded-full bg-altair-brass transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {remainingSteps.length > 0 ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setRemainingStepsOpen((open) => !open)}
                aria-expanded={remainingStepsOpen}
                className="flex w-full items-center justify-between gap-2 rounded-md px-0.5 py-1 text-left text-[11px] font-semibold text-altair-ink-on-paper-muted transition hover:text-altair-ink-on-paper"
              >
                <span>View remaining steps</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    remainingStepsOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {remainingStepsOpen ? (
                <ul className="mt-1.5 space-y-1">
                  {remainingSteps.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-medium text-altair-ink-on-paper transition hover:bg-altair-brass/5"
                      >
                        <Circle
                          className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {item.title}
                        </span>
                        {item.optional ? (
                          <span className="shrink-0 text-[10px] font-semibold text-altair-ink-on-paper-muted">
                            (optional)
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
