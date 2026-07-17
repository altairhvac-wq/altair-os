import type { DemoDataStatus } from "@/shared/types/demo-data";
import type {
  OnboardingChecklist,
  OnboardingChecklistItem,
} from "@/shared/types/onboarding";
import { shouldShowOnboardingChecklist } from "@/shared/lib/onboarding-checklist";

export const ONBOARDING_MONEY_PATH_STEPS = [
  "Customer",
  "Job",
  "Estimate",
  "Invoice",
  "Payment",
] as const;

/** @deprecated Prefer server-persisted dismiss via profiles.preferences. */
export function getOnboardingDismissStorageKey(
  companyId: string,
  userId?: string,
): string {
  return userId
    ? `altair-onboarding-dismissed:${companyId}:${userId}`
    : `altair-onboarding-dismissed:${companyId}`;
}

export function getNextOnboardingChecklistItem(
  checklist: OnboardingChecklist,
): OnboardingChecklistItem | null {
  const incompleteRequired = checklist.items.find(
    (item) => !item.completed && !item.optional,
  );
  if (incompleteRequired) {
    return incompleteRequired;
  }

  return checklist.items.find((item) => !item.completed) ?? null;
}

export function getOnboardingProgressPercent(checklist: OnboardingChecklist): number {
  if (checklist.totalCount <= 0) {
    return 100;
  }

  return Math.round((checklist.completedCount / checklist.totalCount) * 100);
}

/**
 * True while required setup is incomplete and sample data is not loaded.
 * Used to emphasize the onboarding hub — Mission Control stays visible.
 */
export function isDashboardActivationMode(
  checklist: OnboardingChecklist | undefined,
  demoDataStatus?: DemoDataStatus | null,
): boolean {
  if (!checklist || !shouldShowOnboardingChecklist(checklist)) {
    return false;
  }

  if (demoDataStatus?.hasDemoData) {
    return false;
  }

  return true;
}

export function shouldHideDashboardDemoSeedCard(
  checklist: OnboardingChecklist | undefined,
  demoDataStatus?: DemoDataStatus | null,
): boolean {
  return isDashboardActivationMode(checklist, demoDataStatus);
}

export function buildOnboardingWelcomeCopy(
  firstName: string,
  nextStep: OnboardingChecklistItem | null,
  checklist: OnboardingChecklist,
): { title: string; subtitle: string } {
  if (checklist.isComplete) {
    return {
      title: `You're set, ${firstName}.`,
      subtitle: "Mission complete — Altair is ready for day-to-day operations.",
    };
  }

  if (!nextStep) {
    return {
      title: `Welcome, ${firstName}.`,
      subtitle: "Your workspace is ready. Finish the remaining optional steps when you need them.",
    };
  }

  if (nextStep.id === "add-customer") {
    return {
      title: `Welcome, ${firstName}.`,
      subtitle:
        "Your workspace is ready. Today we'll help you add your first customer and get work scheduled.",
    };
  }

  if (nextStep.id === "create-job") {
    return {
      title: `Welcome back, ${firstName}.`,
      subtitle:
        "Customer is in — next, schedule your first job so dispatch and billing can start.",
    };
  }

  return {
    title: `Welcome back, ${firstName}.`,
    subtitle: `Next up: ${nextStep.title.toLowerCase()}.`,
  };
}

export function getFirstNameFromDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "there";
  }

  const first = trimmed.split(/\s+/)[0];
  return first || "there";
}
