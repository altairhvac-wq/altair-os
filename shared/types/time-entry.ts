export type TimeEntryStatus = "active" | "pending" | "approved" | "rejected";

export type TimeEntry = {
  id: string;
  entryNumber: string;
  technician: string;
  clockInAt: string;
  clockOutAt?: string;
  totalHours?: number;
  jobId?: string;
  jobNumber?: string;
  customerName?: string;
  isOvertime: boolean;
  status: TimeEntryStatus;
  notes?: string;
  createdAt: string;
};

export type ActiveTechnicianSession = {
  technician: string;
  clockInAt: string;
  jobNumber?: string;
  customerName?: string;
};

export type TimeEntryFormData = {
  technician: string;
  clockInAt: string;
  clockOutAt: string;
  jobNumber: string;
  customerName: string;
  isOvertime: boolean;
  status: TimeEntryStatus;
  notes: string;
};

export const TIME_ENTRY_STATUS_OPTIONS: {
  value: TimeEntryStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function formatTimeEntryStatus(status: TimeEntryStatus): string {
  return (
    TIME_ENTRY_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function calculateHours(clockInAt: string, clockOutAt: string): number {
  const start = new Date(clockInAt).getTime();
  const end = new Date(clockOutAt).getTime();
  const hours = (end - start) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole}h`;
  return `${whole}h ${minutes}m`;
}

export function getElapsedHours(clockInAt: string): number {
  const start = new Date(clockInAt).getTime();
  const now = Date.now();
  const hours = (now - start) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

export function getWeeklySummary(entries: TimeEntry[]) {
  const totalHours = entries
    .filter((entry) => entry.totalHours != null)
    .reduce((sum, entry) => sum + (entry.totalHours ?? 0), 0);

  const activeTechnicians = new Set(
    entries.filter((entry) => entry.status === "active").map((e) => e.technician),
  ).size;

  const overtimeEntries = entries.filter((entry) => entry.isOvertime).length;

  const pendingApprovals = entries.filter(
    (entry) => entry.status === "pending",
  ).length;

  return { totalHours, activeTechnicians, overtimeEntries, pendingApprovals };
}
