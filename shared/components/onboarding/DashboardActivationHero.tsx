"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import {
  ArrowRight,
  Brain,
  Loader2,
  Sparkles,
} from "lucide-react";
import { seedDemoDataAction } from "@/app/actions/demo-data";
import { HorizonHero } from "@/shared/design-system/signature";
import { signatureCockpitSurfaceClass } from "@/shared/design-system/shell/tokens";
import {
  getNextOnboardingChecklistItem,
  ONBOARDING_MONEY_PATH_STEPS,
} from "@/shared/lib/onboarding-activation";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type DashboardActivationHeroProps = {
  checklist: OnboardingChecklist;
  companyId: string;
  demoDataStatus?: DemoDataStatus | null;
  northStar?: boolean;
};

export function DashboardActivationHero({
  checklist,
  companyId,
  demoDataStatus,
  northStar = false,
}: DashboardActivationHeroProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextStep = useMemo(
    () => getNextOnboardingChecklistItem(checklist),
    [checklist],
  );
  const canSeedDemo = Boolean(
    demoDataStatus?.canSetupDemoData && !demoDataStatus.hasDemoData,
  );

  function handleSeedDemo() {
    if (!canSeedDemo) {
      return;
    }

    startTransition(async () => {
      const result = await seedDemoDataAction(companyId);
      if (!result.error) {
        router.refresh();
      }
    });
  }

  const progressPercent = Math.round(
    (checklist.completedCount / checklist.totalCount) * 100,
  );

  const content = (
    <div
      className={
        northStar
          ? "relative overflow-hidden rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-gradient-to-br from-[#17130E] via-[#1F1A14] to-[#14110C] px-4 py-4 sm:px-5 sm:py-5"
          : signatureCockpitSurfaceClass
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Brain
              className={`h-4 w-4 shrink-0 ${
                northStar ? "text-[#C9A44D]" : "text-cyan-700"
              }`}
              aria-hidden="true"
            />
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
                northStar ? "text-[#C9A44D]/90" : "text-cyan-700/90"
              }`}
            >
              Your dashboard is the brain
            </p>
          </div>
          <h1
            className={`mt-2 font-bold tracking-tight ${
              northStar
                ? "text-xl text-white sm:text-2xl"
                : "text-xl text-slate-900 lg:text-[1.35rem]"
            }`}
          >
            Start here — one path to a working workspace
          </h1>
          <p
            className={`mt-2 max-w-2xl text-sm leading-relaxed ${
              northStar ? "text-[#C6BBA8]" : "text-slate-600"
            }`}
          >
            Altair watches jobs, dispatch, and billing together — then surfaces
            what needs attention next. Complete the steps below, or load sample
            data to see the brain in action immediately.
          </p>

          <div className="mt-4">
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                northStar ? "text-[#8A6324]" : "text-slate-500"
              }`}
            >
              The money path
            </p>
            <ol className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {ONBOARDING_MONEY_PATH_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-1.5">
                  <span
                    className={
                      northStar
                        ? "rounded-md bg-[#2A2418] px-2 py-1 text-[#E8DDC2] ring-1 ring-[rgba(201,164,77,0.2)]"
                        : "rounded-md bg-slate-100 px-2 py-1 text-slate-700"
                    }
                  >
                    {step}
                  </span>
                  {index < ONBOARDING_MONEY_PATH_STEPS.length - 1 ? (
                    <ArrowRight
                      className={`h-3 w-3 shrink-0 ${
                        northStar ? "text-[#6B6255]" : "text-slate-400"
                      }`}
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div
          className={`w-full shrink-0 lg:max-w-sm ${
            northStar
              ? "rounded-xl border border-[rgba(201,164,77,0.18)] bg-[#221C14] p-4"
              : "rounded-xl border border-cyan-100 bg-cyan-50/40 p-4"
          }`}
        >
          <p
            className={`text-[10px] font-bold uppercase tracking-widest ${
              northStar ? "text-[#C9A44D]" : "text-cyan-700"
            }`}
          >
            Your next step
          </p>
          {nextStep ? (
            <>
              <p
                className={`mt-1 text-base font-bold ${
                  northStar ? "text-white" : "text-slate-900"
                }`}
              >
                {nextStep.title}
              </p>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  northStar ? "text-[#C6BBA8]" : "text-slate-600"
                }`}
              >
                {nextStep.description}
              </p>
              <Link
                href={nextStep.href}
                className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  northStar
                    ? "bg-[#C9A44D] text-[#17130E] hover:bg-[#D4B05A]"
                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                }`}
              >
                {nextStep.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          ) : null}

          <div className="mt-3">
            <div
              className={`flex items-center justify-between gap-2 text-[11px] font-semibold ${
                northStar ? "text-[#C6BBA8]" : "text-slate-600"
              }`}
            >
              <span>{progressPercent}% workspace ready</span>
              <span>
                {checklist.completedCount}/{checklist.totalCount}
              </span>
            </div>
            <div
              className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${
                northStar ? "bg-[#2A2418]" : "bg-slate-200"
              }`}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Workspace setup progress"
            >
              <div
                className={`h-full rounded-full transition-all ${
                  northStar ? "bg-[#C9A44D]" : "bg-cyan-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {canSeedDemo ? (
            <button
              type="button"
              onClick={handleSeedDemo}
              disabled={isPending}
              className={`mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                northStar
                  ? "border-[rgba(201,164,77,0.25)] bg-transparent text-[#E8DDC2] hover:bg-[#2A2418]"
                  : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
              }`}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Or explore with sample data
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (northStar) {
    return (
      <section aria-label="Workspace activation">{content}</section>
    );
  }

  return (
    <HorizonHero tone="cyan" beamTone="cyan" beamPosition="center" size="cockpit">
      {content}
    </HorizonHero>
  );
}
