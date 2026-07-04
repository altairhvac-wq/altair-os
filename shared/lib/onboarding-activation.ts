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
