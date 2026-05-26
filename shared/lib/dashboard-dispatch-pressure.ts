import type { DashboardData } from "@/shared/types/dashboard";

export type DispatchPressureSeverity = "healthy" | "warning" | "critical";

export type DispatchPressureDrillDownLink = {
  label: string;
  href: string;
};

export type DispatchPressureSnapshot = {
  severity: DispatchPressureSeverity;
  statusLabel: string;
  headline: string;
  explanation: string;
  recommendedAction: string;
  primaryHref: string;
  metrics: {
    totalJobsToday: number;
    unassignedToday: number;
    stalledJobs: number;
    overloadedTechnicianCount: number;
    pipelineFlowScore: number | null;
    readinessBlockers: number;
    techniciansOnJob: number;
  };
  drillDownLinks: DispatchPressureDrillDownLink[];
};

export type DispatchPressureInput = Pick<
  DashboardData,
  | "operations"
  | "stalledJobs"
  | "technicians"
  | "officeReviewQueue"
  | "operationalHealth"
>;

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function countReadinessBlockers(input: DispatchPressureInput): number {
  return input.officeReviewQueue.summary.items.filter(
    (item) => item.readinessScore <= 50,
  ).length;
}

function resolvePipelineFlowScore(input: DispatchPressureInput): number | null {
  return (
    input.operationalHealth.areaScores.find((area) => area.id === "pipeline_flow")
      ?.score ?? null
  );
}

function resolveWorkflowReadinessScore(input: DispatchPressureInput): number {
  return (
    input.operationalHealth.areaScores.find(
      (area) => area.id === "workflow_readiness",
    )?.score ?? 100
  );
}

function resolveTechniciansOnJob(input: DispatchPressureInput): number {
  return input.technicians.filter(
    (technician) => technician.timeState === "working_job",
  ).length;
}

function resolveSeverity(input: DispatchPressureInput): DispatchPressureSeverity {
  const {
    unassignedToday,
    overloadedTechnicianCount,
  } = input.operations;
  const stalledJobs = input.stalledJobs.stalledCount;
  const readinessBlockers = countReadinessBlockers(input);
  const workflowReadinessScore = resolveWorkflowReadinessScore(input);
  const pipelineFlowScore = resolvePipelineFlowScore(input);

  if (
    unassignedToday >= 3 ||
    stalledJobs >= 5 ||
    readinessBlockers >= 5 ||
    workflowReadinessScore < 50 ||
    (pipelineFlowScore !== null && pipelineFlowScore < 50)
  ) {
    return "critical";
  }

  if (
    unassignedToday > 0 ||
    stalledJobs > 0 ||
    overloadedTechnicianCount > 0 ||
    readinessBlockers > 0 ||
    workflowReadinessScore < 70 ||
    (pipelineFlowScore !== null && pipelineFlowScore < 70)
  ) {
    return "warning";
  }

  return "healthy";
}

function resolveStatusLabel(severity: DispatchPressureSeverity): string {
  switch (severity) {
    case "critical":
      return "High pressure";
    case "warning":
      return "Needs attention";
    default:
      return "Balanced";
  }
}

function resolveHeadline(input: DispatchPressureInput): string {
  const { unassignedToday } = input.operations;
  const stalledJobs = input.stalledJobs.stalledCount;
  const readinessBlockers = countReadinessBlockers(input);
  const workflowReadinessScore = resolveWorkflowReadinessScore(input);

  if (
    unassignedToday === 0 &&
    stalledJobs === 0 &&
    readinessBlockers === 0 &&
    workflowReadinessScore >= 70
  ) {
    return "Dispatch is balanced today";
  }

  if (unassignedToday > 0 && stalledJobs > 0) {
    return `${unassignedToday} ${pluralize(unassignedToday, "job")} need assignment and ${stalledJobs} stalled ${pluralize(stalledJobs, "job")} need follow-up`;
  }

  if (unassignedToday > 0) {
    return `${unassignedToday} ${pluralize(unassignedToday, "job")} need assignment`;
  }

  if (stalledJobs > 0) {
    return `${stalledJobs} stalled ${pluralize(stalledJobs, "job")} may need dispatch follow-up`;
  }

  if (readinessBlockers > 0 || workflowReadinessScore < 70) {
    return "Workflow readiness is creating schedule risk";
  }

  if (input.operations.overloadedTechnicianCount > 0) {
    return `${input.operations.overloadedTechnicianCount} ${pluralize(input.operations.overloadedTechnicianCount, "technician")} may be overloaded today`;
  }

  return "Dispatch needs a quick review";
}

function resolveExplanation(input: DispatchPressureInput): string {
  const {
    totalJobsToday,
    unassignedToday,
    overloadedTechnicianCount,
  } = input.operations;
  const stalledJobs = input.stalledJobs.stalledCount;
  const readinessBlockers = countReadinessBlockers(input);
  const pipelineFlowScore = resolvePipelineFlowScore(input);
  const techniciansOnJob = resolveTechniciansOnJob(input);

  if (
    unassignedToday === 0 &&
    stalledJobs === 0 &&
    readinessBlockers === 0 &&
    overloadedTechnicianCount === 0
  ) {
    return `${totalJobsToday} ${pluralize(totalJobsToday, "job")} on today's board with no unassigned work, stalled field jobs, or readiness blockers slowing dispatch.`;
  }

  const parts: string[] = [];

  if (totalJobsToday > 0) {
    parts.push(
      `${totalJobsToday} ${pluralize(totalJobsToday, "job")} scheduled today`,
    );
  }

  if (unassignedToday > 0) {
    parts.push(
      `${unassignedToday} still ${unassignedToday === 1 ? "needs" : "need"} a technician`,
    );
  }

  if (stalledJobs > 0) {
    parts.push(
      `${stalledJobs} stalled ${pluralize(stalledJobs, "job")} with ${input.stalledJobs.inactivityThresholdDays}+ days of inactivity`,
    );
  }

  if (overloadedTechnicianCount > 0) {
    parts.push(
      `${overloadedTechnicianCount} ${pluralize(overloadedTechnicianCount, "technician")} carrying multiple active jobs`,
    );
  } else if (techniciansOnJob > 0) {
    parts.push(`${techniciansOnJob} ${pluralize(techniciansOnJob, "technician")} actively on a job`);
  }

  if (readinessBlockers > 0) {
    parts.push(
      `${readinessBlockers} queue ${pluralize(readinessBlockers, "item")} with workflow blockers`,
    );
  }

  if (pipelineFlowScore !== null && pipelineFlowScore < 70) {
    parts.push(`pipeline flow health is ${pipelineFlowScore}/100`);
  }

  return `${parts.join("; ")} — review dispatch before workload stacks up.`;
}

function resolveRecommendedAction(input: DispatchPressureInput): string {
  const { unassignedToday, overloadedTechnicianCount } = input.operations;
  const stalledJobs = input.stalledJobs.stalledCount;
  const readinessBlockers = countReadinessBlockers(input);

  if (
    unassignedToday === 0 &&
    stalledJobs === 0 &&
    readinessBlockers === 0 &&
    overloadedTechnicianCount === 0
  ) {
    return "Monitor the dispatch board as schedules change — field workload looks balanced right now.";
  }

  if (unassignedToday > 0) {
    return "Open dispatch and assign today's unassigned jobs before the schedule slips.";
  }

  if (stalledJobs > 0) {
    return "Review stalled jobs and coordinate dispatch or technician follow-up.";
  }

  if (readinessBlockers > 0) {
    return "Clear workflow readiness blockers before adding more field work to the board.";
  }

  if (overloadedTechnicianCount > 0) {
    return "Rebalance today's assignments so overloaded technicians are not carrying too many active jobs.";
  }

  return "Review today's dispatch board and confirm technicians are matched to the schedule.";
}

function resolvePrimaryHref(input: DispatchPressureInput): string {
  const { unassignedToday, overloadedTechnicianCount } = input.operations;
  const stalledJobs = input.stalledJobs.stalledCount;
  const readinessBlockers = countReadinessBlockers(input);

  if (unassignedToday > 0 || overloadedTechnicianCount > 0) {
    return "/dispatch";
  }

  if (stalledJobs > 0) {
    return "/reports?queue=stalled";
  }

  if (readinessBlockers > 0) {
    return "/reports?queue=attention";
  }

  return "/dispatch";
}

function resolveDrillDownLinks(
  input: DispatchPressureInput,
): DispatchPressureDrillDownLink[] {
  const links: DispatchPressureDrillDownLink[] = [];

  if (input.operations.unassignedToday > 0 || input.operations.totalJobsToday > 0) {
    links.push({ label: "Dispatch board", href: "/dispatch" });
  }

  if (input.stalledJobs.stalledCount > 0) {
    links.push({ label: "Stalled jobs", href: "/reports?queue=stalled" });
  }

  if (countReadinessBlockers(input) > 0) {
    links.push({
      label: "Readiness blockers",
      href: "/reports?queue=attention",
    });
  }

  links.push({ label: "All jobs", href: "/jobs" });
  links.push({ label: "Operational reports", href: "/reports" });

  return links;
}

/**
 * Derives a read-only dispatch pressure snapshot from dashboard rollups already
 * loaded by getDashboardData — no extra fetches or dispatch lifecycle logic.
 */
export function buildDispatchPressureSnapshot(
  input: DispatchPressureInput,
): DispatchPressureSnapshot {
  const severity = resolveSeverity(input);

  return {
    severity,
    statusLabel: resolveStatusLabel(severity),
    headline: resolveHeadline(input),
    explanation: resolveExplanation(input),
    recommendedAction: resolveRecommendedAction(input),
    primaryHref: resolvePrimaryHref(input),
    metrics: {
      totalJobsToday: input.operations.totalJobsToday,
      unassignedToday: input.operations.unassignedToday,
      stalledJobs: input.stalledJobs.stalledCount,
      overloadedTechnicianCount: input.operations.overloadedTechnicianCount,
      pipelineFlowScore: resolvePipelineFlowScore(input),
      readinessBlockers: countReadinessBlockers(input),
      techniciansOnJob: resolveTechniciansOnJob(input),
    },
    drillDownLinks: resolveDrillDownLinks(input),
  };
}

export function hasDispatchPressure(input: DispatchPressureInput): boolean {
  return buildDispatchPressureSnapshot(input).severity !== "healthy";
}
