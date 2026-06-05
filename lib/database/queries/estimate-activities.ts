import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  EstimateActivityInsert,
  EstimateActivityRow,
} from "@/lib/database/types/core-tables";
import type { EstimateActivityType } from "@/lib/database/types/enums";
import {
  resolveEstimateLifecycleTimestampsByEstimateId,
  type EstimateLifecycleTimestamps,
} from "@/shared/lib/estimate-lifecycle-timestamps";
import type {
  EstimateActivity,
  EstimateActivityMetadata,
} from "@/shared/types/estimate-activity";
import type { EstimateStatus } from "@/shared/types/estimate";

import {
  resolveActivityActorName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type EstimateActivityRowWithActor = EstimateActivityRow & {
  actor: ProfileSummary | null;
};

function mapMetadata(
  value: EstimateActivityRow["metadata"],
): EstimateActivityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as EstimateActivityMetadata;
}

function mapEstimateActivityRow(
  row: EstimateActivityRowWithActor,
): EstimateActivity {
  const metadata = mapMetadata(row.metadata);

  return {
    id: row.id,
    estimateId: row.estimate_id,
    eventType: row.event_type,
    metadata,
    actorId: row.actor_id ?? undefined,
    actorName: resolveActivityActorName({
      profile: row.actor,
      actorId: row.actor_id,
      metadata,
    }),
    createdAt: row.created_at,
  };
}

export function resolveEstimateStatusEventType(
  toStatus: EstimateStatus,
): EstimateActivityType {
  switch (toStatus) {
    case "sent":
      return "estimate_sent";
    case "approved":
      return "estimate_approved";
    case "declined":
      return "estimate_declined";
    case "cancelled":
      return "estimate_cancelled";
    case "converted":
      return "estimate_converted";
    default:
      return "status_changed";
  }
}

export async function recordEstimateActivity(
  input: EstimateActivityInsert,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("estimate_activities").insert({
    company_id: input.company_id,
    estimate_id: input.estimate_id,
    actor_id: input.actor_id ?? null,
    event_type: input.event_type,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordEstimateActivity] insert failed:", {
      companyId: input.company_id,
      estimateId: input.estimate_id,
      eventType: input.event_type,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function listEstimateActivitiesForEstimate(
  companyId: string,
  estimateId: string,
): Promise<EstimateActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimate_activities")
    .select(
      `
      *,
      actor:profiles!estimate_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .eq("estimate_id", estimateId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listEstimateActivitiesForEstimate] query failed:", {
      companyId,
      estimateId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as EstimateActivityRowWithActor[]).map(
    mapEstimateActivityRow,
  );
}

const LIFECYCLE_TIMESTAMP_EVENT_TYPES = [
  "estimate_sent",
  "estimate_approved",
] as const satisfies readonly EstimateActivityType[];

export async function batchResolveEstimateLifecycleTimestamps(
  companyId: string,
  estimateIds: string[],
): Promise<Map<string, EstimateLifecycleTimestamps>> {
  if (estimateIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimate_activities")
    .select("estimate_id, event_type, created_at")
    .eq("company_id", companyId)
    .in("estimate_id", estimateIds)
    .in("event_type", [...LIFECYCLE_TIMESTAMP_EVENT_TYPES])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[batchResolveEstimateLifecycleTimestamps] query failed:", {
      companyId,
      estimateCount: estimateIds.length,
      code: error.code,
      message: error.message,
    });
    return new Map();
  }

  return resolveEstimateLifecycleTimestampsByEstimateId(
    (data ?? []).map((row) => ({
      estimateId: row.estimate_id,
      eventType: row.event_type as EstimateActivityType,
      createdAt: row.created_at,
    })),
  );
}
