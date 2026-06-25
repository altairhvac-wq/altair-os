import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowReminderRow } from "@/lib/database/types/core-tables";
import type {
  WorkflowReminderKind,
  WorkflowReminderStatus,
} from "@/lib/database/types/enums";

export type WorkflowReminderCounts = {
  active: number;
  snoozed: number;
  completed: number;
  dismissed: number;
};

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
