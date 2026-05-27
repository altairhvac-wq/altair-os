import type { Technician } from "@/shared/types/dispatch";
import type {
  DispatchJobPriority,
  DispatchJobStatus,
} from "@/shared/types/dispatch";

export type ShiftStatus = "clocked_out" | "clocked_in";

export type TechnicianShift = {
  status: ShiftStatus;
  clockInAt?: string;
};

export type TechnicianJob = {
  id: string;
  customerId: string;
  jobNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  jobType: string;
  scheduledDate: string;
  status: DispatchJobStatus;
  priority: DispatchJobPriority;
  description?: string;
  notes?: string;
  completedAt?: string;
};

export type TechnicianDashboardData = {
  technician: Technician;
  shift: TechnicianShift;
  currentJob: TechnicianJob | null;
  upcomingJobs: TechnicianJob[];
  todayJobCount: number;
  completedTodayCount: number;
};

export type TechnicianQuickAction =
  | "navigate"
  | "call"
  | "note"
  | "photo"
  | "complete";

export function formatTechnicianJobTime(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTechnicianJobAddress(job: TechnicianJob): string {
  return `${job.serviceAddress}, ${job.city}, ${job.state} ${job.zip}`;
}

export function formatShiftStatus(status: ShiftStatus): string {
  return status === "clocked_in" ? "On shift" : "Off shift";
}

export function formatJobPriority(priority: DispatchJobPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function getPriorityStyles(
  priority: DispatchJobPriority,
): string {
  const styles: Record<DispatchJobPriority, string> = {
    low: "bg-slate-100 text-slate-600 ring-slate-500/20",
    normal: "bg-blue-50 text-blue-700 ring-blue-600/20",
    high: "bg-amber-50 text-amber-700 ring-amber-600/20",
    urgent: "bg-rose-50 text-rose-700 ring-rose-600/20",
  };
  return styles[priority];
}
