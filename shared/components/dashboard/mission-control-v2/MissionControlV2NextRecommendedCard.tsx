"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Sparkles } from "lucide-react";
import {
  SectionHeader,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import {
  getNextOnboardingChecklistItem,
  getOnboardingProgressPercent,
} from "@/shared/lib/onboarding-activation";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { missionControlV2SampleData } from "./sample-data";

/** Soft light-card shell matching Dashboard exception / info cards. */
const NEXT_RECOMMENDED_CARD_CLASS =
  "rounded-[var(--radius-panel)] border border-altair-border/40 bg-altair-paper shadow-sm";

/** Optimized asset — solid olive fallback keeps the card complete if it fails. */
const CAUGHT_UP_ILLUSTRATION_SRC =
  "/images/dashboard/next-recommended-caught-up.webp";

function NextRecommendedCaughtUp() {
  const [showIllustration, setShowIllustration] = useState(true);

  return (
    <div
      className={`relative isolate min-h-[9.75rem] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--north-star-plate-border)]/50 bg-[var(--north-star-caught-up-fill)] shadow-sm ${altairMcCardPadClass}`}
    >
      {showIllustration ? (
        <Image
          src={CAUGHT_UP_ILLUSTRATION_SRC}
          alt=""
          width={688}
          height={384}
          aria-hidden="true"
          sizes="(max-width: 640px) 80vw, 420px"
          className="pointer-events-none absolute -bottom-8 -right-10 h-[135%] w-auto max-w-none select-none sm:-bottom-6 sm:-right-4 sm:h-[145%]"
          onError={() => setShowIllustration(false)}
        />
      ) : null}
      {/* Left scrim: readable copy over the art; solid fill remains if image is gone. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[72%] bg-gradient-to-r from-[var(--north-star-caught-up-fill)] via-[var(--north-star-caught-up-fill)]/90 to-transparent"
      />
      <div className="relative z-[2] flex max-w-[min(100%,17.5rem)] items-start gap-3 sm:max-w-[19rem]">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-success text-white">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--north-star-section-title)]">
            You&apos;re all caught up!
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--north-star-section-secondary)]">
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
        <div className={`h-auto ${NEXT_RECOMMENDED_CARD_CLASS} ${altairMcCardPadClass}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-brass text-white">
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
        <div className={`h-auto ${NEXT_RECOMMENDED_CARD_CLASS} ${altairMcCardPadClass}`}>
          <Link
            href={nextStep.href}
            className="flex items-start gap-3 rounded-lg transition-colors hover:bg-altair-brass/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-brass text-white">
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
