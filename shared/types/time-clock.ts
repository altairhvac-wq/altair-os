export type TimeClockShiftStatus = "open" | "closed";

export type TimeClockEntry = {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  clockInAt: string;
  clockOutAt?: string;
  status: TimeClockShiftStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export function formatTimeClockStatus(status: TimeClockShiftStatus): string {
  return status === "open" ? "Clocked in" : "Clocked out";
}

export function getTimeClockStatusStyles(status: TimeClockShiftStatus): string {
  return status === "open"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
    : "bg-slate-100 text-slate-700 ring-slate-500/20";
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDuration(clockInAt: string, clockOutAt?: string): string {
  const endMs = clockOutAt ? new Date(clockOutAt).getTime() : Date.now();
  const totalMinutes = Math.max(
    0,
    Math.floor((endMs - new Date(clockInAt).getTime()) / 60_000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function getElapsedMinutes(clockInAt: string, nowMs = Date.now()): number {
  return Math.max(
    0,
    Math.floor((nowMs - new Date(clockInAt).getTime()) / 60_000),
  );
}

export function canViewCompanyTimeClockEntries(role: string): boolean {
  return role === "owner" || role === "admin";
}
