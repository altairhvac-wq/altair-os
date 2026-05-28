import { recordTimeActivity } from "@/lib/database/queries/time-activities";
import type { Json } from "@/lib/database/types/enums";
import type { TimeEntry } from "@/shared/types/time-entry";

function buildTimeActivityMetadata(entry: TimeEntry): Json {
  return {
    time_entry_id: entry.id,
    entry_type: entry.entryType,
    started_at: entry.startedAt,
    ended_at: entry.endedAt,
    duration_minutes: entry.durationMinutes,
    job_id: entry.jobId,
    job_number: entry.jobNumber,
    technician_id: entry.technicianId,
  };
}

async function recordTimeEntryActivity(input: {
  companyId: string;
  actorId: string;
  entry: TimeEntry;
  eventType:
    | "technician_clocked_in"
    | "technician_clocked_out"
    | "break_started"
    | "break_ended"
    | "job_labor_started"
    | "job_labor_ended";
  metadata?: Json;
}): Promise<void> {
  const { error } = await recordTimeActivity({
    company_id: input.companyId,
    time_entry_id: input.entry.id,
    technician_id: input.entry.technicianId,
    job_id: input.entry.jobId ?? null,
    actor_id: input.actorId,
    event_type: input.eventType,
    metadata: input.metadata ?? buildTimeActivityMetadata(input.entry),
  });

  if (error) {
    console.error("[recordTimeEntryActivity] failed:", {
      timeEntryId: input.entry.id,
      eventType: input.eventType,
      error,
    });
  }
}

export async function recordTechnicianClockedInActivity(input: {
  companyId: string;
  actorId: string;
  entry: TimeEntry;
}): Promise<void> {
  await recordTimeEntryActivity({
    ...input,
    eventType: "technician_clocked_in",
  });
}

export async function recordTechnicianClockedOutActivity(input: {
  companyId: string;
  actorId: string;
  entry: TimeEntry;
}): Promise<void> {
  await recordTimeEntryActivity({
    ...input,
    eventType: "technician_clocked_out",
  });
}

export async function recordBreakStartedActivity(input: {
  companyId: string;
  actorId: string;
  entry: TimeEntry;
}): Promise<void> {
  await recordTimeEntryActivity({
    ...input,
    eventType: "break_started",
  });
}

export async function recordBreakEndedActivity(input: {
  companyId: string;
  actorId: string;
  entry: TimeEntry;
}): Promise<void> {
  await recordTimeEntryActivity({
    ...input,
    eventType: "break_ended",
  });
}

export async function recordJobLaborStartedActivity(input: {
  companyId: string;
  actorId: string;
  entry: TimeEntry;
}): Promise<void> {
  await recordTimeEntryActivity({
    ...input,
    eventType: "job_labor_started",
  });
}

export async function recordJobLaborEndedActivity(input: {
  companyId: string;
  actorId: string;
  entry: TimeEntry;
  extraMetadata?: Json;
}): Promise<void> {
  const { extraMetadata, ...rest } = input;
  const baseMetadata = buildTimeActivityMetadata(input.entry);
  let metadata: Json = baseMetadata;

  if (
    extraMetadata &&
    typeof baseMetadata === "object" &&
    baseMetadata !== null &&
    !Array.isArray(baseMetadata) &&
    typeof extraMetadata === "object" &&
    extraMetadata !== null &&
    !Array.isArray(extraMetadata)
  ) {
    metadata = { ...baseMetadata, ...extraMetadata };
  }

  await recordTimeEntryActivity({
    ...rest,
    eventType: "job_labor_ended",
    metadata,
  });
}
