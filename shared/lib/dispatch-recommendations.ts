import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import type {
  DispatchJob,
  DispatchJobStatus,
  Technician,
  TechnicianStatus,
} from "@/shared/types/dispatch";
import type {
  DispatchRecommendationConfidence,
  DispatchTechnicianRecommendation,
} from "@/shared/types/dispatch-recommendations";
import type { DashboardTechnicianStatus } from "@/shared/types/dashboard";
import type { TechnicianTimeState } from "@/shared/types/time-entry";

const ACTIVE_JOB_STATUSES = new Set<DispatchJobStatus>([
  "scheduled",
  "dispatched",
  "arrived",
  "in_progress",
]);

const TRADE_KEYWORDS: { label: string; patterns: RegExp[] }[] = [
  { label: "HVAC", patterns: [/hvac/i, /\bac\b/i, /heat/i, /cool/i, /refriger/i] },
  { label: "Plumbing", patterns: [/plumb/i, /drain/i, /water heater/i, /sewer/i] },
  { label: "Electrical", patterns: [/electr/i, /wiring/i, /panel/i, /breaker/i] },
  { label: "General Service", patterns: [/general/i, /service call/i, /maintenance/i] },
];

export type DispatchRecommendationInput = {
  job: DispatchJob;
  technicians: Technician[];
  technicianStatuses: DashboardTechnicianStatus[];
  todayJobs: DispatchJob[];
};

type ScoredCandidate = {
  technician: Technician;
  score: number;
  reasonKeys: Set<ReasonKey>;
};

type ReasonKey =
  | "lowest_workload"
  | "trade_match"
  | "available_now"
  | "on_shift"
  | "schedule_window"
  | "same_city"
  | "same_zip";

const REASON_COPY: Record<ReasonKey, string> = {
  lowest_workload: "Lowest workload today",
  trade_match: "Trade/service match",
  available_now: "Available now",
  on_shift: "On shift today",
  schedule_window: "Available during scheduled window",
  same_city: "Works in same service area",
  same_zip: "Closest service area (ZIP)",
};

function isAssignableTechnician(technician: Technician): boolean {
  return technician.role === COMPANY_ROLE_LABELS.technician;
}

function detectTradeLabel(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  for (const trade of TRADE_KEYWORDS) {
    if (trade.patterns.some((pattern) => pattern.test(normalized))) {
      return trade.label;
    }
  }

  return null;
}

function specialtyMatchesJob(
  specialty: string,
  jobType: string,
): boolean {
  const jobTrade = detectTradeLabel(jobType);
  const specialtyTrade = detectTradeLabel(specialty);

  if (!jobTrade || !specialtyTrade) {
    return (
      specialty.toLowerCase().includes("general") ||
      jobType.toLowerCase().includes(specialty.toLowerCase()) ||
      specialty.toLowerCase().includes(jobType.toLowerCase())
    );
  }

  if (jobTrade === specialtyTrade) {
    return true;
  }

  if (
    specialtyTrade === "General Service" ||
    jobTrade === "General Service"
  ) {
    return specialtyTrade === "General Service";
  }

  return false;
}

function countActiveJobsToday(
  technicianId: string,
  todayJobs: DispatchJob[],
): number {
  return todayJobs.filter(
    (job) =>
      job.technicianId === technicianId &&
      ACTIVE_JOB_STATUSES.has(job.status),
  ).length;
}

function getScheduledHour(timestamp: string): number | null {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours();
}

function hasScheduleConflict(
  technicianId: string,
  job: DispatchJob,
  todayJobs: DispatchJob[],
): boolean {
  const targetHour = getScheduledHour(job.scheduledDate);
  if (targetHour == null) {
    return false;
  }

  return todayJobs.some((assigned) => {
    if (
      assigned.id === job.id ||
      assigned.technicianId !== technicianId ||
      !ACTIVE_JOB_STATUSES.has(assigned.status)
    ) {
      return false;
    }

    const hour = getScheduledHour(assigned.scheduledDate);
    return hour != null && Math.abs(hour - targetHour) <= 2;
  });
}

function scoreTechnicianStatus(status: TechnicianStatus): number {
  switch (status) {
    case "available":
      return 30;
    case "on_job":
      return 8;
    case "off_duty":
      return -100;
    default:
      return 0;
  }
}

function scoreTimeState(timeState: TechnicianTimeState | undefined): number {
  switch (timeState) {
    case "clocked_in":
      return 18;
    case "working_job":
      return 4;
    case "on_break":
      return -25;
    case "off_clock":
      return -8;
    default:
      return 0;
  }
}

function buildReasons(reasonKeys: Set<ReasonKey>): string[] {
  const priority: ReasonKey[] = [
    "lowest_workload",
    "trade_match",
    "available_now",
    "schedule_window",
    "on_shift",
    "same_zip",
    "same_city",
  ];

  const reasons = priority
    .filter((key) => reasonKeys.has(key))
    .map((key) => REASON_COPY[key]);

  return reasons.slice(0, 4);
}

function resolveConfidence(
  topScore: number,
  secondScore: number | null,
): DispatchRecommendationConfidence {
  if (topScore < 25) {
    return "low";
  }

  const gap = secondScore == null ? 40 : topScore - secondScore;

  if (topScore >= 70 && gap >= 18) {
    return "high";
  }

  if (topScore >= 45 && gap >= 10) {
    return "medium";
  }

  return "low";
}

function formatTradeReason(specialty: string, jobType: string): string {
  const trade = detectTradeLabel(jobType) ?? detectTradeLabel(specialty);
  if (trade && trade !== "General Service") {
    return `${trade} qualified`;
  }

  return REASON_COPY.trade_match;
}

export function recommendTechnicianForJob(
  input: DispatchRecommendationInput,
): DispatchTechnicianRecommendation | null {
  const { job, technicians, technicianStatuses, todayJobs } = input;
  const statusById = new Map(
    technicianStatuses.map((status) => [status.id, status]),
  );

  const assignable = technicians.filter(isAssignableTechnician);
  if (assignable.length === 0) {
    return null;
  }

  const workloads = assignable.map((technician) =>
    countActiveJobsToday(technician.id, todayJobs),
  );
  const minWorkload = Math.min(...workloads);

  const scored: ScoredCandidate[] = assignable.map((technician) => {
    const reasonKeys = new Set<ReasonKey>();
    let score = 0;

    const workload = countActiveJobsToday(technician.id, todayJobs);
    const workloadScore = Math.max(0, 40 - workload * 12);
    score += workloadScore;
    if (workload === minWorkload) {
      reasonKeys.add("lowest_workload");
    }

    if (specialtyMatchesJob(technician.specialty, job.jobType)) {
      score += 22;
      reasonKeys.add("trade_match");
    }

    const statusScore = scoreTechnicianStatus(technician.status);
    score += statusScore;
    if (technician.status === "available") {
      reasonKeys.add("available_now");
    }

    const timeState = statusById.get(technician.id)?.timeState;
    score += scoreTimeState(timeState);
    if (timeState === "clocked_in" || timeState === "working_job") {
      reasonKeys.add("on_shift");
    }

    if (!hasScheduleConflict(technician.id, job, todayJobs)) {
      score += 16;
      reasonKeys.add("schedule_window");
    } else {
      score -= 20;
    }

    const assignedToday = todayJobs.filter(
      (assigned) => assigned.technicianId === technician.id,
    );
    if (
      assignedToday.some(
        (assigned) =>
          assigned.city.trim().toLowerCase() === job.city.trim().toLowerCase(),
      )
    ) {
      score += 8;
      reasonKeys.add("same_city");
    }

    if (
      assignedToday.some(
        (assigned) => assigned.zip.trim() === job.zip.trim(),
      )
    ) {
      score += 12;
      reasonKeys.add("same_zip");
    }

    if (job.priority === "urgent" || job.priority === "high") {
      if (technician.status === "available") {
        score += 6;
      }
    }

    return { technician, score, reasonKeys };
  });

  const ranked = [...scored].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.technician.name.localeCompare(right.technician.name);
  });

  const top = ranked[0];
  if (!top || top.score < 0) {
    return null;
  }

  const second = ranked[1]?.score ?? null;
  const confidence = resolveConfidence(top.score, second);
  const reasons = buildReasons(top.reasonKeys);

  if (reasons.includes(REASON_COPY.trade_match)) {
    const tradeIndex = reasons.indexOf(REASON_COPY.trade_match);
    reasons[tradeIndex] = formatTradeReason(
      top.technician.specialty,
      job.jobType,
    );
  }

  if (reasons.length === 0) {
    reasons.push("Best match among available technicians");
  }

  return {
    technicianId: top.technician.id,
    technicianName: top.technician.name,
    confidence,
    reasons,
  };
}

export function formatDispatchRecommendationConfidence(
  confidence: DispatchRecommendationConfidence,
): string {
  switch (confidence) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Low";
  }
}
