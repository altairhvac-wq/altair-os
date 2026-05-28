"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Rocket,
  X,
} from "lucide-react";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type OnboardingChecklistSectionProps = {
  checklist: OnboardingChecklist;
  companyId: string;
  userId?: string;
  variant?: "dashboard" | "settings";
};

function getDismissStorageKey(companyId: string, userId?: string): string {
  return userId
    ? `altair-onboarding-dismissed:${companyId}:${userId}`
    : `altair-onboarding-dismissed:${companyId}`;
}

export function OnboardingChecklistSection({
  checklist,
  companyId,
  userId,
  variant = "dashboard",
}: OnboardingChecklistSectionProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      getDismissStorageKey(companyId, userId),
    );
    setDismissed(stored === "true");
    setHydrated(true);
  }, [companyId, userId]);

  if (!hydrated || dismissed || checklist.isComplete) {
    return null;
  }

  const progressPercent = Math.round(
    (checklist.completedCount / checklist.totalCount) * 100,
  );

  function handleDismiss() {
    window.localStorage.setItem(
      getDismissStorageKey(companyId, userId),
      "true",
    );
    setDismissed(true);
  }

  const title =
    variant === "settings" ? "Workspace setup" : "Get your workspace ready";
  const description =
    variant === "settings"
      ? "Complete the required steps below to get your company operational for beta. Optional steps can wait."
      : `${checklist.completedCount} of ${checklist.totalCount} required steps done — finish the rest to start dispatching work.`;

  return (
    <section className="admin-card min-w-0 max-w-full overflow-x-clip">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-cyan-50/80 to-white px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <Rocket className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600/90">
              Beta setup
            </p>
            <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">{description}</p>
          </div>
        </div>
        {variant === "dashboard" ? (
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss setup checklist"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="px-4 py-3 sm:px-6">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
            <span>{progressPercent}% complete</span>
            <span>
              {checklist.completedCount}/{checklist.totalCount} steps
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup progress"
          >
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ul className="space-y-2">
          {checklist.items.map((item) => (
            <li key={item.id}>
              {item.completed ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-3 sm:px-4">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-800/70">
                      Complete
                    </p>
                  </div>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-cyan-200 hover:bg-cyan-50/30 sm:px-4"
                >
                  <Circle
                    className="mt-0.5 h-5 w-5 shrink-0 text-slate-300"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {item.title}
                      </p>
                      {item.optional ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Optional
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                    {item.tip ? (
                      <p className="mt-1.5 text-xs text-slate-500">{item.tip}</p>
                    ) : null}
                  </div>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-slate-500">
          When required steps are done, this checklist hides automatically. Optional
          team and billing setup can be finished anytime in Settings.
        </p>
      </div>
    </section>
  );
}
