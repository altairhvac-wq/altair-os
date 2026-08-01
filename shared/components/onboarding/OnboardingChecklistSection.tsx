"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Rocket,
  X,
} from "lucide-react";
import { dismissOnboardingChecklistAction } from "@/app/actions/onboarding";
import {
  altairSemanticSurfaceClass,
  altairSemanticValueClass,
} from "@/shared/design-system/foundation/color-hierarchy";
import { altairSurfaceCardClass } from "@/shared/design-system/shell/surface-hierarchy";
import { getOnboardingProgressPercent } from "@/shared/lib/onboarding-activation";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type OnboardingChecklistSectionProps = {
  checklist: OnboardingChecklist;
  companyId: string;
  userId?: string;
  variant?: "dashboard" | "settings";
  northStar?: boolean;
  /** Server-persisted dismiss; when true on dashboard, section is hidden. */
  dismissed?: boolean;
};

export function OnboardingChecklistSection({
  checklist,
  variant = "dashboard",
  northStar = false,
  dismissed = false,
}: OnboardingChecklistSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localDismissed, setLocalDismissed] = useState(false);

  if (checklist.isComplete) {
    return null;
  }

  if (variant === "dashboard" && (dismissed || localDismissed)) {
    return null;
  }

  const progressPercent = getOnboardingProgressPercent(checklist);

  function handleDismiss() {
    setLocalDismissed(true);
    startTransition(async () => {
      const result = await dismissOnboardingChecklistAction();
      if (result.error) {
        setLocalDismissed(false);
        return;
      }
      router.refresh();
    });
  }

  const title =
    variant === "settings" ? "Workspace setup" : "Setup checklist";
  const description =
    variant === "settings"
      ? "Complete the required steps to get operational. Optional steps can wait."
      : `${checklist.completedCount} of ${checklist.totalCount} required steps done — pick up where you left off.`;

  const isSettingsCompact = variant === "settings";

  return (
    <section
      aria-label="Onboarding checklist"
      className={
        northStar
          ? "min-w-0 max-w-full overflow-x-clip rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]"
          : `${altairSurfaceCardClass} min-w-0 max-w-full overflow-x-clip`
      }
    >
      <div
        className={`flex items-start justify-between gap-2.5 border-b ${
          northStar
            ? "border-[rgba(138,99,36,0.12)] bg-[#F5F0E4]"
            : "border-altair-border bg-altair-paper-subtle"
        } ${
          isSettingsCompact ? "px-3 py-3 sm:px-4" : "px-4 py-4 sm:px-6"
        }`}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${
              northStar
                ? "bg-[#EFE4CB] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)]"
                : "bg-altair-information-surface text-altair-information-foreground ring-1 ring-altair-information/20"
            } ${
              isSettingsCompact ? "h-9 w-9" : "h-11 w-11 rounded-xl"
            }`}
          >
            <Rocket className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                northStar
                  ? "text-[#8A6324]"
                  : "text-altair-information-foreground"
              }`}
            >
              Guided setup
            </p>
            <h2
              className={`font-black tracking-tight ${
                northStar ? "text-[#17130E]" : "text-altair-ink-on-paper"
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
                northStar
                  ? "text-[#6B6255]"
                  : "text-altair-ink-on-paper-secondary"
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
            disabled={isPending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-altair-ink-on-paper-muted transition hover:bg-altair-paper-subtle hover:text-altair-ink-on-paper-secondary disabled:opacity-50"
            aria-label="Dismiss setup checklist"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className={isSettingsCompact ? "px-3 py-2.5 sm:px-4" : "px-4 py-3 sm:px-6"}>
        <div className={isSettingsCompact ? "mb-3" : "mb-4"}>
          <div
            className={`flex items-center justify-between gap-2 text-xs font-semibold ${
              northStar ? "text-[#4F4638]" : "text-altair-ink-on-paper-secondary"
            }`}
          >
            <span>{progressPercent}% complete</span>
            <span>
              {checklist.completedCount}/{checklist.totalCount} steps
            </span>
          </div>
          <div
            className={`mt-2 h-2 overflow-hidden rounded-full ${
              northStar ? "bg-[#EFE4CB]" : "bg-altair-paper-subtle"
            }`}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup progress"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                northStar ? "bg-[#C9A44D]" : "bg-altair-information"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ol className={isSettingsCompact ? "space-y-1.5" : "space-y-2"}>
          {checklist.items.map((item) => (
            <li key={item.id}>
              {item.completed ? (
                <div
                  className={`flex items-start gap-2.5 rounded-lg border ${altairSemanticSurfaceClass.success} ${
                    isSettingsCompact ? "px-2.5 py-2 sm:px-3" : "rounded-xl px-3 py-3 sm:px-4"
                  }`}
                >
                  <CheckCircle2
                    className={`mt-0.5 h-5 w-5 shrink-0 ${altairSemanticValueClass.success}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${altairSemanticValueClass.success}`}
                    >
                      {item.title}
                    </p>
                    <p
                      className={`mt-0.5 text-xs ${altairSemanticValueClass.success} opacity-70`}
                    >
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
                      : "border-altair-border bg-altair-paper-elevated hover:border-altair-information/40 hover:bg-altair-information-surface/40"
                  } ${
                    isSettingsCompact
                      ? "rounded-lg px-2.5 py-2 sm:px-3"
                      : "rounded-xl px-3 py-3 sm:px-4"
                  }`}
                >
                  <Circle
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      northStar
                        ? "text-[#B8AD9E]"
                        : "text-altair-ink-on-paper-muted"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-bold ${
                          northStar
                            ? "text-[#17130E]"
                            : "text-altair-ink-on-paper"
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.optional ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            northStar
                              ? "bg-[#EFE4CB] text-[#6B6255] ring-1 ring-[rgba(138,99,36,0.12)]"
                              : "bg-altair-paper-subtle text-altair-ink-on-paper-muted ring-1 ring-altair-border"
                          }`}
                        >
                          Optional
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-0.5 text-xs leading-relaxed ${
                        northStar
                          ? "text-[#4F4638]"
                          : "text-altair-ink-on-paper-secondary"
                      }`}
                    >
                      {item.description}
                    </p>
                    {item.tip ? (
                      <p
                        className={`mt-1.5 text-xs ${
                          northStar
                            ? "text-[#6B6255]"
                            : "text-altair-ink-on-paper-muted"
                        }`}
                      >
                        {item.tip}
                      </p>
                    ) : null}
                  </div>
                  <ArrowRight
                    className={`mt-1 h-4 w-4 shrink-0 ${
                      northStar
                        ? "text-[#8A6324]"
                        : "text-altair-ink-on-paper-muted"
                    }`}
                    aria-hidden="true"
                  />
                </Link>
              )}
            </li>
          ))}
        </ol>

        <p
          className={`${
            northStar
              ? "text-[#6B6255]"
              : "text-altair-ink-on-paper-muted"
          } ${
            isSettingsCompact ? "mt-3 text-[11px] leading-snug" : "mt-4 text-xs"
          }`}
        >
          When required steps are done, this checklist hides automatically.
        </p>
      </div>
    </section>
  );
}
