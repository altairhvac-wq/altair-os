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
import { getOnboardingDismissStorageKey } from "@/shared/lib/onboarding-activation";

type OnboardingChecklistSectionProps = {
  checklist: OnboardingChecklist;
  companyId: string;
  userId?: string;
  variant?: "dashboard" | "settings";
  northStar?: boolean;
};

function getDismissStorageKey(companyId: string, userId?: string): string {
  return getOnboardingDismissStorageKey(companyId, userId);
}

export function OnboardingChecklistSection({
  checklist,
  companyId,
  userId,
  variant = "dashboard",
  northStar = false,
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
      : `${checklist.completedCount} of ${checklist.totalCount} required steps done — your next action is highlighted above.`;

  const isSettingsCompact = variant === "settings";

  return (
    <section
      className={
        northStar
          ? "min-w-0 max-w-full overflow-x-clip rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]"
          : "admin-card min-w-0 max-w-full overflow-x-clip"
      }
    >
      <div
        className={`flex items-start justify-between gap-2.5 border-b ${
          northStar
            ? "border-[rgba(138,99,36,0.12)] bg-[#F5F0E4]"
            : "border-slate-100 bg-gradient-to-r from-cyan-50/80 to-white"
        } ${
          isSettingsCompact ? "px-3 py-3 sm:px-4" : "px-4 py-4 sm:px-6"
        }`}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${
              northStar
                ? "bg-[#EFE4CB] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)]"
                : "bg-cyan-100 text-cyan-700"
            } ${
              isSettingsCompact ? "h-9 w-9" : "h-11 w-11 rounded-xl"
            }`}
          >
            <Rocket className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                northStar ? "text-[#8A6324]" : "text-cyan-600/90"
              }`}
            >
              Beta setup
            </p>
            <h2
              className={`font-black tracking-tight ${
                northStar ? "text-[#17130E]" : "text-slate-900"
              } ${
                isSettingsCompact
                  ? "text-sm sm:text-base"
                  : "text-base sm:text-lg"
              }`}
            >
              {title}
            </h2>
            <p
              className={`${
                northStar ? "text-[#6B6255]" : "text-slate-600"
              } ${
                isSettingsCompact
                  ? "mt-0.5 text-xs leading-snug"
                  : "mt-1 text-xs sm:text-sm"
              }`}
            >
              {description}
            </p>
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

      <div className={isSettingsCompact ? "px-3 py-2.5 sm:px-4" : "px-4 py-3 sm:px-6"}>
        <div className={isSettingsCompact ? "mb-3" : "mb-4"}>
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#4F4638]">
            <span>{progressPercent}% complete</span>
            <span>
              {checklist.completedCount}/{checklist.totalCount} steps
            </span>
          </div>
          <div
            className={`mt-2 h-2 overflow-hidden rounded-full ${
              northStar ? "bg-[#EFE4CB]" : "bg-slate-100"
            }`}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup progress"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                northStar ? "bg-[#C9A44D]" : "bg-cyan-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ul className={isSettingsCompact ? "space-y-1.5" : "space-y-2"}>
          {checklist.items.map((item) => (
            <li key={item.id}>
              {item.completed ? (
                <div
                  className={`flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/40 ${
                    isSettingsCompact ? "px-2.5 py-2 sm:px-3" : "rounded-xl px-3 py-3 sm:px-4"
                  }`}
                >
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
                  className={`flex items-start gap-2.5 border transition ${
                    northStar
                      ? "border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD]"
                      : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/30"
                  } ${
                    isSettingsCompact
                      ? "rounded-lg px-2.5 py-2 sm:px-3"
                      : "rounded-xl px-3 py-3 sm:px-4"
                  }`}
                >
                  <Circle
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      northStar ? "text-[#B8AD9E]" : "text-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-bold ${
                          northStar ? "text-[#17130E]" : "text-slate-900"
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.optional ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            northStar
                              ? "bg-[#EFE4CB] text-[#6B6255] ring-1 ring-[rgba(138,99,36,0.12)]"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          Optional
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-0.5 text-xs leading-relaxed ${
                        northStar ? "text-[#4F4638]" : "text-slate-600"
                      }`}
                    >
                      {item.description}
                    </p>
                    {item.tip ? (
                      <p
                        className={`mt-1.5 text-xs ${
                          northStar ? "text-[#6B6255]" : "text-slate-500"
                        }`}
                      >
                        {item.tip}
                      </p>
                    ) : null}
                  </div>
                  <ArrowRight
                    className={`mt-1 h-4 w-4 shrink-0 ${
                      northStar ? "text-[#8A6324]" : "text-slate-400"
                    }`}
                    aria-hidden="true"
                  />
                </Link>
              )}
            </li>
          ))}
        </ul>

        <p
          className={`${
            northStar ? "text-[#6B6255]" : "text-slate-500"
          } ${
            isSettingsCompact ? "mt-3 text-[11px] leading-snug" : "mt-4 text-xs"
          }`}
        >
          When required steps are done, this checklist hides automatically. Optional
          team and billing setup can be finished anytime in Settings.
        </p>
      </div>
    </section>
  );
}
