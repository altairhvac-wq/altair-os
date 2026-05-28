import type { OwnerViewMode } from "@/shared/lib/owner-view-mode";

const STORAGE_KEY_PREFIX = "altair:owner-view-mode:v1:";

const VALID_VIEW_MODES: OwnerViewMode[] = [
  "owner_admin",
  "technician",
  "dispatch",
];

function storageKey(companyId: string) {
  return `${STORAGE_KEY_PREFIX}${companyId}`;
}

export function parseOwnerViewMode(
  value: string | undefined | null,
): OwnerViewMode {
  if (
    value != null &&
    (VALID_VIEW_MODES as readonly string[]).includes(value)
  ) {
    return value as OwnerViewMode;
  }

  return "owner_admin";
}

export function loadOwnerViewMode(companyId: string): OwnerViewMode {
  if (typeof window === "undefined") {
    return "owner_admin";
  }

  try {
    const raw = window.localStorage.getItem(storageKey(companyId));
    return parseOwnerViewMode(raw);
  } catch {
    return "owner_admin";
  }
}

export function persistOwnerViewMode(
  companyId: string,
  viewMode: OwnerViewMode,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(companyId), viewMode);
  } catch {
    // Quota or privacy mode — preference memory is best-effort only.
  }
}
