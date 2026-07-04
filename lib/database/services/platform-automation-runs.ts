import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  PlatformAutomationRunInsert,
  PlatformAutomationRunRow,
  PlatformAutomationRunStatus,
  PlatformAutomationRunTotals,
} from "@/lib/database/types/platform-automation-runs";
import type { PlatformAutomationRunBrief } from "@/shared/types/platform-reliability";

export const WORKFLOW_REMINDERS_AUTOMATION_KEY = "workflow_reminders";

const ERROR_SUMMARY_MAX_LENGTH = 500;

function sanitizeErrorSummary(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Automation run failed";

  return raw.trim().slice(0, ERROR_SUMMARY_MAX_LENGTH) || "Automation run failed";
}

function mapTotals(totals: PlatformAutomationRunTotals): PlatformAutomationRunInsert["totals"] {
  return totals as PlatformAutomationRunInsert["totals"];
}

export type { PlatformAutomationRunBrief } from "@/shared/types/platform-reliability";

function mapRunBrief(row: PlatformAutomationRunRow): PlatformAutomationRunBrief {
  const totals =
    row.totals && typeof row.totals === "object" && !Array.isArray(row.totals)
      ? (row.totals as PlatformAutomationRunTotals)
      : {};

  return {
    id: row.id,
    automationKey: row.automation_key,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    companyCount: row.company_count,
    totals,
    errorSummary: row.error_summary,
  };
}

export async function recordPlatformAutomationRunStarted(
  automationKey: string,
): Promise<{ runId: string | null; startedAt: string }> {
  const supabase = createServiceRoleClient();
  const startedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("platform_automation_runs")
    .insert({
      automation_key: automationKey,
      status: "started",
      started_at: startedAt,
      totals: {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[platform-automation-runs] failed to record start:", {
      automationKey,
      code: error.code,
      message: error.message,
    });
    return { runId: null, startedAt };
  }

  return { runId: data.id, startedAt };
}

export async function recordPlatformAutomationRunFinished(
  runId: string | null,
  input: {
    automationKey: string;
    startedAt: string;
    status: Extract<PlatformAutomationRunStatus, "succeeded" | "failed">;
    companyCount?: number;
    totals?: PlatformAutomationRunTotals;
    errorSummary?: string | null;
  },
): Promise<void> {
  const finishedAt = new Date();
  const startedAtMs = Date.parse(input.startedAt);
  const durationMs = Number.isNaN(startedAtMs)
    ? null
    : Math.max(0, finishedAt.getTime() - startedAtMs);

  const payload: PlatformAutomationRunInsert = {
    automation_key: input.automationKey,
    status: input.status,
    started_at: input.startedAt,
    finished_at: finishedAt.toISOString(),
    duration_ms: durationMs,
    company_count: input.companyCount ?? null,
    totals: mapTotals(input.totals ?? {}),
    error_summary: input.errorSummary?.trim().slice(0, ERROR_SUMMARY_MAX_LENGTH) ?? null,
  };

  const supabase = createServiceRoleClient();

  if (runId) {
    const { error } = await supabase
      .from("platform_automation_runs")
      .update(payload)
      .eq("id", runId);

    if (error) {
      console.error("[platform-automation-runs] failed to update run:", {
        runId,
        automationKey: input.automationKey,
        code: error.code,
        message: error.message,
      });
    }

    return;
  }

  const { error } = await supabase.from("platform_automation_runs").insert(payload);

  if (error) {
    console.error("[platform-automation-runs] failed to insert finished run:", {
      automationKey: input.automationKey,
      code: error.code,
      message: error.message,
    });
  }
}

export async function fetchLatestPlatformAutomationRun(
  automationKey: string,
): Promise<{ run: PlatformAutomationRunBrief | null; queryable: boolean }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("platform_automation_runs")
    .select(
      "id, automation_key, status, started_at, finished_at, duration_ms, company_count, totals, error_summary",
    )
    .eq("automation_key", automationKey)
    .neq("status", "started")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[platform-automation-runs] latest run query failed:", {
      automationKey,
      code: error.code,
      message: error.message,
    });
    return { run: null, queryable: false };
  }

  if (!data) {
    return { run: null, queryable: true };
  }

  return { run: mapRunBrief(data as PlatformAutomationRunRow), queryable: true };
}

export async function fetchLatestSuccessfulPlatformAutomationRun(
  automationKey: string,
): Promise<{ run: PlatformAutomationRunBrief | null; queryable: boolean }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("platform_automation_runs")
    .select(
      "id, automation_key, status, started_at, finished_at, duration_ms, company_count, totals, error_summary",
    )
    .eq("automation_key", automationKey)
    .eq("status", "succeeded")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[platform-automation-runs] latest success query failed:", {
      automationKey,
      code: error.code,
      message: error.message,
    });
    return { run: null, queryable: false };
  }

  if (!data) {
    return { run: null, queryable: true };
  }

  return { run: mapRunBrief(data as PlatformAutomationRunRow), queryable: true };
}

export { sanitizeErrorSummary };
