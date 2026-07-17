"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Settings2 } from "lucide-react";
import { resumeOnboardingChecklistAction } from "@/app/actions/onboarding";
import { shouldShowOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import type { OnboardingChecklist } from "@/shared/types/onboarding";

type OnboardingDismissedRecoveryBannerProps = {
  checklist: OnboardingChecklist;
  companyId: string;
  userId?: string;
  northStar?: boolean;
  dismissed?: boolean;
};

export function OnboardingDismissedRecoveryBanner({
  checklist,
  northStar = false,
  dismissed = false,
}: OnboardingDismissedRecoveryBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!dismissed || !shouldShowOnboardingChecklist(checklist)) {
    return null;
  }

  function handleResume() {
    startTransition(async () => {
      const result = await resumeOnboardingChecklistAction();
      if (!result.error) {
        router.refresh();
      }
    });
  }

  return (
    <section
      aria-label="Resume workspace setup"
      className={
        northStar
          ? "flex min-w-0 flex-col gap-2.5 rounded-lg border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] px-3 py-2.5 sm:flex-row sm:items-start"
          : "admin-card flex min-w-0 flex-col gap-2.5 px-3 py-2.5 sm:flex-row sm:items-start sm:px-4"
      }
    >
      <Settings2
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          northStar ? "text-[#8A6324]" : "text-slate-500"
        }`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${
            northStar ? "text-[#17130E]" : "text-slate-900"
          }`}
        >
          Setup checklist hidden
        </p>
        <p
          className={`mt-0.5 text-xs ${
            northStar ? "text-[#6B6255]" : "text-slate-600"
          }`}
        >
          {checklist.completedCount} of {checklist.totalCount} required steps
          done — resume anytime.
        </p>
      </div>
      <button
        type="button"
        onClick={handleResume}
        disabled={isPending}
        className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
          northStar
            ? "bg-[#EFE4CB] text-[#8A6324] hover:bg-[#E5D9BE]"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {isPending ? "Resuming…" : "Resume setup"}
      </button>
    </section>
  );
}
