import type { Json } from "@/lib/database/types/enums";

function isRecord(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads whether the user dismissed the dashboard checklist for a company.
 * Stored under profiles.preferences.onboardingDismissed[companyId].
 */
export function isOnboardingDismissedForCompany(
  preferences: Json | null | undefined,
  companyId: string,
): boolean {
  if (!isRecord(preferences)) {
    return false;
  }

  const dismissed = preferences.onboardingDismissed;
  if (!isRecord(dismissed)) {
    return false;
  }

  const value = dismissed[companyId];
  return typeof value === "string" && value.length > 0;
}

export function setOnboardingDismissedInPreferences(
  currentPreferences: Json | null | undefined,
  companyId: string,
  dismissedAt: string | null,
): Json {
  const existing = isRecord(currentPreferences) ? { ...currentPreferences } : {};
  const dismissedRaw = existing.onboardingDismissed;
  const dismissed = isRecord(dismissedRaw) ? { ...dismissedRaw } : {};

  if (dismissedAt) {
    dismissed[companyId] = dismissedAt;
  } else {
    delete dismissed[companyId];
  }

  if (Object.keys(dismissed).length === 0) {
    delete existing.onboardingDismissed;
  } else {
    existing.onboardingDismissed = dismissed;
  }

  return existing;
}
