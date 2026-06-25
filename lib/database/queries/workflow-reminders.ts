import "server-only";

import { cache } from "react";
import type { DbClient } from "@/lib/database/db-client";
import { mapDatabaseError } from "@/lib/database/errors";
import { createClient } from "@/lib/supabase/server";
import type {
  WorkflowReminderInsert,
  WorkflowReminderRow,
  WorkflowReminderUpdate,
} from "@/lib/database/types/core-tables";
import type {
  WorkflowReminderKind,
  WorkflowReminderSourceEntityType,
  WorkflowReminderStatus,
} from "@/lib/database/types/enums";

export type WorkflowReminderCounts = {
  active: number;
  snoozed: number;
  completed: number;
  dismissed: number;
};

export const PHASE_1_WORKFLOW_REMINDER_KINDS = [
  "unpaid_invoice_7d",
  "stale_estimate_7d",
  "lead_follow_up_due",
  "ready_to_invoice",
] as const satisfies readonly WorkflowReminderKind[];

export function workflowReminderIdempotencyKey(input: {
  reminderKind: WorkflowReminderKind;
  sourceEntityType: WorkflowReminderSourceEntityType;
  sourceEntityId: string;
}): string {
  return `${input.reminderKind}:${input.sourceEntityType}:${input.sourceEntityId}`;
}

export const listActiveWorkflowRemindersForCompany = cache(
  async function listActiveWorkflowRemindersForCompany(
    companyId: string,
    options?: { limit?: number; kinds?: readonly WorkflowReminderKind[] },
  ): Promise<WorkflowReminderRow[]> {
    const supabase = await createClient();
    const limit = options?.limit ?? 100;

    let query = supabase
      .from("workflow_reminders")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("triggered_at", { ascending: false })
      .limit(limit);

    if (options?.kinds && options.kinds.length > 0) {
      query = query.in("reminder_kind", [...options.kinds]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[listActiveWorkflowRemindersForCompany] query failed:", {
        companyId,
        error,
      });
      return [];
    }

    return (data ?? []) as WorkflowReminderRow[];
  },
);

export const listWorkflowRemindersForCompany = cache(
  async function listWorkflowRemindersForCompany(
    companyId: string,
    options?: {
      limit?: number;
      statuses?: readonly WorkflowReminderStatus[];
      kinds?: readonly WorkflowReminderKind[];
    },
  ): Promise<WorkflowReminderRow[]> {
    const supabase = await createClient();
    const limit = options?.limit ?? 100;

    let query = supabase
      .from("workflow_reminders")
      .select("*")
      .eq("company_id", companyId)
      .order("triggered_at", { ascending: false })
      .limit(limit);

    if (options?.statuses && options.statuses.length > 0) {
      query = query.in("status", [...options.statuses]);
    }

    if (options?.kinds && options.kinds.length > 0) {
      query = query.in("reminder_kind", [...options.kinds]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[listWorkflowRemindersForCompany] query failed:", {
        companyId,
        error,
      });
      return [];
    }

    return (data ?? []) as WorkflowReminderRow[];
  },
);

export const getWorkflowReminderCountsForCompany = cache(
  async function getWorkflowReminderCountsForCompany(
    companyId: string,
  ): Promise<WorkflowReminderCounts> {
    const supabase = await createClient();
    const empty: WorkflowReminderCounts = {
      active: 0,
      snoozed: 0,
      completed: 0,
      dismissed: 0,
    };

    const { data, error } = await supabase
      .from("workflow_reminders")
      .select("status")
      .eq("company_id", companyId);

    if (error) {
      console.error("[getWorkflowReminderCountsForCompany] query failed:", {
        companyId,
        error,
      });
      return empty;
    }

    const counts = { ...empty };

    for (const row of data ?? []) {
      const status = row.status as WorkflowReminderStatus;
      if (status === "active") counts.active += 1;
      else if (status === "snoozed") counts.snoozed += 1;
      else if (status === "completed") counts.completed += 1;
      else if (status === "dismissed") counts.dismissed += 1;
    }

    return counts;
  },
);

export async function listWorkflowRemindersForEvaluation(
  companyId: string,
  client: DbClient,
  kinds: readonly WorkflowReminderKind[] = PHASE_1_WORKFLOW_REMINDER_KINDS,
): Promise<WorkflowReminderRow[]> {
  const { data, error } = await client
    .from("workflow_reminders")
    .select("*")
    .eq("company_id", companyId)
    .in("reminder_kind", [...kinds]);

  if (error) {
    console.error("[listWorkflowRemindersForEvaluation] query failed:", {
      companyId,
      error,
    });
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []) as WorkflowReminderRow[];
}

export async function insertWorkflowReminder(
  client: DbClient,
  row: WorkflowReminderInsert,
): Promise<{ reminder: WorkflowReminderRow | null; error: string | null }> {
  const { data, error } = await client
    .from("workflow_reminders")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    console.error("[insertWorkflowReminder] insert failed:", {
      companyId: row.company_id,
      reminderKind: row.reminder_kind,
      sourceEntityId: row.source_entity_id,
      error,
    });
    return { reminder: null, error: mapDatabaseError(error) };
  }

  return { reminder: data as WorkflowReminderRow, error: null };
}

export async function updateWorkflowReminder(
  client: DbClient,
  companyId: string,
  reminderId: string,
  update: WorkflowReminderUpdate,
): Promise<{ reminder: WorkflowReminderRow | null; error: string | null }> {
  const { data, error } = await client
    .from("workflow_reminders")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", reminderId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[updateWorkflowReminder] update failed:", {
      companyId,
      reminderId,
      error,
    });
    return { reminder: null, error: mapDatabaseError(error) };
  }

  return { reminder: (data as WorkflowReminderRow | null) ?? null, error: null };
}

export async function completeWorkflowReminder(
  client: DbClient,
  companyId: string,
  reminderId: string,
  completedAt: string,
): Promise<{ reminder: WorkflowReminderRow | null; error: string | null }> {
  return updateWorkflowReminder(client, companyId, reminderId, {
    status: "completed",
    completed_at: completedAt,
    completed_by: null,
    snoozed_until: null,
  });
}

export async function getWorkflowReminderById(
  companyId: string,
  reminderId: string,
): Promise<WorkflowReminderRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workflow_reminders")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", reminderId)
    .maybeSingle();

  if (error) {
    console.error("[getWorkflowReminderById] query failed:", {
      companyId,
      reminderId,
      error,
    });
    return null;
  }

  return (data as WorkflowReminderRow | null) ?? null;
}

export type DashboardWorkflowRemindersLoadResult = {
  reminders: WorkflowReminderRow[];
  totalActiveCount: number;
};

export const DASHBOARD_WORKFLOW_REMINDERS_LIMIT = 8;

export const getDashboardWorkflowRemindersForCompany = cache(
  async function getDashboardWorkflowRemindersForCompany(
    companyId: string,
    options?: { limit?: number },
  ): Promise<DashboardWorkflowRemindersLoadResult> {
    const limit = options?.limit ?? DASHBOARD_WORKFLOW_REMINDERS_LIMIT;
    const supabase = await createClient();

    const { data, error, count } = await supabase
      .from("workflow_reminders")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("triggered_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[getDashboardWorkflowRemindersForCompany] query failed:", {
        companyId,
        error,
      });
      return { reminders: [], totalActiveCount: 0 };
    }

    return {
      reminders: (data ?? []) as WorkflowReminderRow[],
      totalActiveCount: count ?? 0,
    };
  },
);

export async function snoozeWorkflowReminder(
  companyId: string,
  reminderId: string,
  snoozedUntil: string,
): Promise<{ reminder: WorkflowReminderRow | null; error: string | null }> {
  const supabase = await createClient();
  return updateWorkflowReminder(supabase, companyId, reminderId, {
    status: "snoozed",
    snoozed_until: snoozedUntil,
  });
}

export async function dismissWorkflowReminder(
  companyId: string,
  reminderId: string,
  userId: string,
  dismissedAt: string,
): Promise<{ reminder: WorkflowReminderRow | null; error: string | null }> {
  const supabase = await createClient();
  return updateWorkflowReminder(supabase, companyId, reminderId, {
    status: "dismissed",
    dismissed_at: dismissedAt,
    dismissed_by: userId,
    snoozed_until: null,
  });
}

export async function completeWorkflowReminderByUser(
  companyId: string,
  reminderId: string,
  userId: string,
  completedAt: string,
): Promise<{ reminder: WorkflowReminderRow | null; error: string | null }> {
  const supabase = await createClient();
  return updateWorkflowReminder(supabase, companyId, reminderId, {
    status: "completed",
    completed_at: completedAt,
    completed_by: userId,
    snoozed_until: null,
  });
}
