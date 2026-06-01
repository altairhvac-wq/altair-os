import { formatTimeInTimeZone, getCompanyTimeZone } from "@/shared/lib/datetime";

export const TECHNICIAN_PULL_REFRESH_EVENT = "altair:technician-pull-refresh";

export function notifyTechnicianPullRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(TECHNICIAN_PULL_REFRESH_EVENT));
}

export function formatTechnicianLastUpdated(
  updatedAt: Date,
  now = new Date(),
): string {
  const diffMs = Math.max(0, now.getTime() - updatedAt.getTime());

  if (diffMs < 15_000) {
    return "Updated just now";
  }

  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) {
    return `Updated ${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `Updated ${minutes}m ago`;
  }

  return `Updated at ${formatTimeInTimeZone(updatedAt, getCompanyTimeZone())}`;
}
