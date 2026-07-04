import "server-only";

import type { DbClient } from "@/lib/database/db-client";
import { mapEstimateRowToEstimate } from "@/lib/database/queries/estimates";
import { mapInvoiceRowToInvoice } from "@/lib/database/queries/invoices";
import { mapJobRowToJob } from "@/lib/database/queries/jobs";
import {
  completeWorkflowReminder,
  insertWorkflowReminder,
  listWorkflowRemindersForEvaluation,
  PHASE_1_WORKFLOW_REMINDER_KINDS,
  updateWorkflowReminder,
  workflowReminderIdempotencyKey,
} from "@/lib/database/queries/workflow-reminders";
import {
  isCompletedAwaitingInvoicing,
  resolveCompletedAt,
} from "@/lib/database/services/reports/completed-work-report";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { WorkflowReminderRow } from "@/lib/database/types/core-tables";
import type {
  Json,
  WorkflowReminderKind,
  WorkflowReminderSourceEntityType,
} from "@/lib/database/types/enums";
import {
  mergeEstimateLifecycleTimestampsBatch,
  resolveEstimateLifecycleTimestampsByEstimateId,
} from "@/shared/lib/estimate-lifecycle-timestamps";
import {
  buildStaleSentEstimateEntries,
} from "@/shared/lib/estimate-recovery";
import { selectLeadsNeedingFollowUp } from "@/shared/lib/leads/lead-metrics";
import { formatLeadFollowUpQueueTitle } from "@/shared/lib/leads/lead-status";
import {
  buildUnpaidInvoiceFollowUpEntries,
} from "@/shared/lib/unpaid-invoice-follow-up";
import { resolveCompanyTimeZone } from "@/shared/lib/datetime";
import type { Estimate } from "@/shared/types/estimate";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import { formatLeadName, type Lead } from "@/shared/types/lead";
import {
  computeJobProfitability,
  type JobProfitabilityInputs,
} from "@/shared/types/job-profitability";

export type WorkflowReminderEvaluationError = {
  kind: string;
  message: string;
};

export type WorkflowReminderEvaluationResult = {
  companyId: string;
  evaluatedAt: string;
  created: number;
  updated: number;
  completed: number;
  skipped: number;
  errors: WorkflowReminderEvaluationError[];
};

export type WorkflowReminderBatchEvaluationResult = {
  evaluatedAt: string;
  companyCount: number;
  totals: {
    created: number;
    updated: number;
    completed: number;
    skipped: number;
  };
  companies: WorkflowReminderEvaluationResult[];
  errors: WorkflowReminderEvaluationError[];
};

type EligibleWorkflowReminderCandidate = {
  reminderKind: WorkflowReminderKind;
  sourceEntityType: WorkflowReminderSourceEntityType;
  sourceEntityId: string;
  title: string;
  message: string | null;
  metadata: Json;
  triggeredAt: string;
};

type EvaluationContext = {
  companyId: string;
  evaluatedAt: Date;
  evaluatedAtIso: string;
  timeZone: string;
  client: DbClient;
};

type UpsertOutcome = "created" | "updated" | "skipped";

function resolvePrivilegedDbClient(client?: DbClient): DbClient {
  return client ?? createServiceRoleClient();
}

function toIsoTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function stableJson(value: Json): string {
  const normalize = (input: Json): Json => {
    if (input == null || typeof input !== "object") {
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((entry) => normalize(entry as Json));
    }

    const record = input as Record<string, Json | undefined>;
    const sortedEntries = Object.keys(record)
      .sort()
      .map((key) => [key, normalize(record[key] as Json)] as const);

    return Object.fromEntries(sortedEntries);
  };

  return JSON.stringify(normalize(value));
}

function candidateNeedsUpdate(
  existing: WorkflowReminderRow,
  candidate: EligibleWorkflowReminderCandidate,
): boolean {
  return (
    existing.title !== candidate.title ||
    existing.message !== candidate.message ||
    stableJson(existing.metadata) !== stableJson(candidate.metadata)
  );
}

function indexRemindersByKey(
  reminders: WorkflowReminderRow[],
): Map<string, WorkflowReminderRow> {
  const map = new Map<string, WorkflowReminderRow>();

  for (const reminder of reminders) {
    map.set(
      workflowReminderIdempotencyKey({
        reminderKind: reminder.reminder_kind,
        sourceEntityType: reminder.source_entity_type,
        sourceEntityId: reminder.source_entity_id,
      }),
      reminder,
    );
  }

  return map;
}

async function loadCompanyTimeZone(
  client: DbClient,
  companyId: string,
): Promise<string> {
  const { data, error } = await client
    .from("companies")
    .select("timezone")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[evaluateWorkflowRemindersForCompany] company timezone lookup failed:", {
      companyId,
      error,
    });
  }

  return resolveCompanyTimeZone(data?.timezone);
}

async function loadInvoicesForEvaluation(
  client: DbClient,
  companyId: string,
): Promise<Invoice[]> {
  const { data, error } = await client
    .from("invoices")
    .select(
      `
      *,
      customers(name, email),
      jobs(job_number),
      estimates(estimate_number),
      invoice_line_items(id)
    `,
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapInvoiceRowToInvoice(
      row as Parameters<typeof mapInvoiceRowToInvoice>[0],
    ),
  );
}

async function loadEstimatesForEvaluation(
  client: DbClient,
  companyId: string,
): Promise<Estimate[]> {
  const { data, error } = await client
    .from("estimates")
    .select(
      `
      *,
      customers(name, email),
      jobs(job_number),
      estimate_line_items(id)
    `,
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const estimates = (data ?? []).map((row) =>
    mapEstimateRowToEstimate(
      row as Parameters<typeof mapEstimateRowToEstimate>[0],
    ),
  );

  if (estimates.length === 0) {
    return estimates;
  }

  const { data: activityRows, error: activityError } = await client
    .from("estimate_activities")
    .select("estimate_id, event_type, created_at")
    .eq("company_id", companyId)
    .in("estimate_id", estimates.map((estimate) => estimate.id))
    .in("event_type", ["estimate_sent", "estimate_approved"]);

  if (activityError) {
    throw new Error(activityError.message);
  }

  const timestampsByEstimateId = resolveEstimateLifecycleTimestampsByEstimateId(
    (activityRows ?? []).map((row) => ({
      estimateId: row.estimate_id,
      eventType: row.event_type as "estimate_sent" | "estimate_approved",
      createdAt: row.created_at,
    })),
  );

  return mergeEstimateLifecycleTimestampsBatch(estimates, timestampsByEstimateId);
}

async function loadLeadsForEvaluation(
  client: DbClient,
  companyId: string,
): Promise<Lead[]> {
  const { data, error } = await client
    .from("leads")
    .select("*")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    companyName: row.company_name ?? undefined,
    email: row.email,
    phone: row.phone,
    source: row.source,
    status: row.status,
    notes: row.notes ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    nextFollowUpAt: row.next_follow_up_at ?? undefined,
    convertedCustomerId: row.converted_customer_id ?? undefined,
    wonAt: row.won_at ?? undefined,
    lostAt: row.lost_at ?? undefined,
    lostReason: row.lost_reason ?? undefined,
    assignedUserId: row.assigned_user_id ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
  }));
}

async function loadJobsForEvaluation(
  client: DbClient,
  companyId: string,
): Promise<Job[]> {
  const { data, error } = await client
    .from("jobs")
    .select(
      `
      *,
      customers(name),
      assigned_technician:profiles!jobs_assigned_technician_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("scheduled_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapJobRowToJob(row as Parameters<typeof mapJobRowToJob>[0]),
  );
}

function groupByJobId<T extends { jobId?: string }>(
  items: T[],
  jobIds: Set<string>,
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    if (!item.jobId || !jobIds.has(item.jobId)) {
      continue;
    }

    const existing = map.get(item.jobId);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.jobId, [item]);
    }
  }

  return map;
}

async function loadOperationalDatasetsForEvaluation(
  client: DbClient,
  companyId: string,
): Promise<{
  jobs: Job[];
  invoices: Invoice[];
}> {
  const [jobs, invoices] = await Promise.all([
    loadJobsForEvaluation(client, companyId),
    loadInvoicesForEvaluation(client, companyId),
  ]);

  return { jobs, invoices };
}

function buildUnpaidInvoiceCandidates(
  invoices: Invoice[],
  reference: Date,
  evaluatedAtIso: string,
): EligibleWorkflowReminderCandidate[] {
  return buildUnpaidInvoiceFollowUpEntries(invoices, reference).map((entry) => ({
    reminderKind: "unpaid_invoice_7d",
    sourceEntityType: "invoice",
    sourceEntityId: entry.invoiceId,
    title: "Invoice unpaid 7 days — follow up",
    message: `${entry.invoiceNumber} · ${entry.customerName} · $${entry.balanceDue.toFixed(2)} balance due`,
    metadata: {
      invoiceNumber: entry.invoiceNumber,
      customerName: entry.customerName,
      balanceDue: entry.balanceDue,
      daysUnpaid: entry.daysUnpaid,
      status: entry.status,
    },
    triggeredAt: evaluatedAtIso,
  }));
}

function buildStaleEstimateCandidates(
  estimates: Estimate[],
  reference: Date,
  evaluatedAtIso: string,
): EligibleWorkflowReminderCandidate[] {
  return buildStaleSentEstimateEntries(estimates, reference).map((entry) => ({
    reminderKind: "stale_estimate_7d",
    sourceEntityType: "estimate",
    sourceEntityId: entry.estimateId,
    title: "Estimate sent 7 days ago — follow up",
    message: `${entry.estimateNumber} · ${entry.customerName}`,
    metadata: {
      estimateNumber: entry.estimateNumber,
      customerName: entry.customerName,
      daysSinceSent: entry.daysSinceSent,
      total: entry.total,
      status: entry.status,
    },
    triggeredAt: evaluatedAtIso,
  }));
}

function buildLeadFollowUpCandidates(
  leads: Lead[],
  reference: Date,
  timeZone: string,
  evaluatedAtIso: string,
): EligibleWorkflowReminderCandidate[] {
  return selectLeadsNeedingFollowUp(leads, { reference, timeZone }).map(
    (lead) => ({
      reminderKind: "lead_follow_up_due",
      sourceEntityType: "lead",
      sourceEntityId: lead.id,
      title: "Lead follow-up due",
      message: formatLeadFollowUpQueueTitle(lead),
      metadata: {
        leadName: formatLeadName(lead),
        nextFollowUpAt: lead.nextFollowUpAt,
        status: lead.status,
      },
      triggeredAt: evaluatedAtIso,
    }),
  );
}

function buildReadyToInvoiceCandidates(
  datasets: Awaited<ReturnType<typeof loadOperationalDatasetsForEvaluation>>,
  reference: Date,
  evaluatedAtIso: string,
): EligibleWorkflowReminderCandidate[] {
  const jobIds = new Set(datasets.jobs.map((job) => job.id));
  const invoicesByJob = groupByJobId(datasets.invoices, jobIds);

  const candidates: EligibleWorkflowReminderCandidate[] = [];

  for (const job of datasets.jobs) {
    const inputs: JobProfitabilityInputs = {
      invoices: (invoicesByJob.get(job.id) ?? []) as Invoice[],
      estimates: [],
      expenses: [],
      materials: [],
      laborEntries: [],
    };

    const snapshot = computeJobProfitability(inputs);

    if (!isCompletedAwaitingInvoicing(job, snapshot)) {
      continue;
    }

    const completedAt = resolveCompletedAt(job);
    const daysSinceCompletion = Math.max(
      0,
      Math.floor(
        (reference.getTime() - new Date(completedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    candidates.push({
      reminderKind: "ready_to_invoice",
      sourceEntityType: "job",
      sourceEntityId: job.id,
      title: "Job completed — send invoice",
      message: `${job.jobNumber?.trim() || "Job"} · ${job.customerName?.trim() || "Unknown customer"}`,
      metadata: {
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        daysSinceCompletion,
        completedAt: job.completedAt,
      },
      triggeredAt: evaluatedAtIso,
    });
  }

  return candidates;
}

async function collectEligibleCandidates(
  context: EvaluationContext,
  errors: WorkflowReminderEvaluationError[],
): Promise<EligibleWorkflowReminderCandidate[]> {
  const { companyId, client, evaluatedAt, evaluatedAtIso, timeZone } = context;
  const candidates: EligibleWorkflowReminderCandidate[] = [];

  const datasetsPromise = loadOperationalDatasetsForEvaluation(client, companyId);

  try {
    const invoices = await loadInvoicesForEvaluation(client, companyId);
    candidates.push(
      ...buildUnpaidInvoiceCandidates(invoices, evaluatedAt, evaluatedAtIso),
    );
  } catch (error) {
    errors.push({
      kind: "unpaid_invoice_7d",
      message: error instanceof Error ? error.message : "Invoice evaluation failed",
    });
  }

  try {
    const estimates = await loadEstimatesForEvaluation(client, companyId);
    candidates.push(
      ...buildStaleEstimateCandidates(estimates, evaluatedAt, evaluatedAtIso),
    );
  } catch (error) {
    errors.push({
      kind: "stale_estimate_7d",
      message: error instanceof Error ? error.message : "Estimate evaluation failed",
    });
  }

  try {
    const leads = await loadLeadsForEvaluation(client, companyId);
    candidates.push(
      ...buildLeadFollowUpCandidates(leads, evaluatedAt, timeZone, evaluatedAtIso),
    );
  } catch (error) {
    errors.push({
      kind: "lead_follow_up_due",
      message: error instanceof Error ? error.message : "Lead evaluation failed",
    });
  }

  try {
    const datasets = await datasetsPromise;
    candidates.push(
      ...buildReadyToInvoiceCandidates(datasets, evaluatedAt, evaluatedAtIso),
    );
  } catch (error) {
    errors.push({
      kind: "ready_to_invoice",
      message: error instanceof Error ? error.message : "Ready-to-invoice evaluation failed",
    });
  }

  return candidates;
}

async function upsertEligibleReminder(
  context: EvaluationContext,
  existing: WorkflowReminderRow | undefined,
  candidate: EligibleWorkflowReminderCandidate,
): Promise<UpsertOutcome> {
  const { companyId, client, evaluatedAt } = context;

  if (!existing) {
    const { error } = await insertWorkflowReminder(client, {
      company_id: companyId,
      reminder_kind: candidate.reminderKind,
      source_entity_type: candidate.sourceEntityType,
      source_entity_id: candidate.sourceEntityId,
      status: "active",
      title: candidate.title,
      message: candidate.message,
      metadata: candidate.metadata,
      triggered_at: candidate.triggeredAt,
    });

    if (error) {
      throw new Error(error);
    }

    return "created";
  }

  if (existing.status === "dismissed") {
    return "skipped";
  }

  if (existing.status === "completed") {
    // Phase 1.1: do not auto-reopen completed reminders when a source becomes eligible again.
    return "skipped";
  }

  if (existing.status === "snoozed") {
    const snoozedUntilMs = existing.snoozed_until
      ? Date.parse(existing.snoozed_until)
      : Number.POSITIVE_INFINITY;

    if (Number.isFinite(snoozedUntilMs) && snoozedUntilMs > evaluatedAt.getTime()) {
      return "skipped";
    }

    const { error } = await updateWorkflowReminder(client, companyId, existing.id, {
      status: "active",
      title: candidate.title,
      message: candidate.message,
      metadata: candidate.metadata,
      triggered_at: candidate.triggeredAt,
      snoozed_until: null,
    });

    if (error) {
      throw new Error(error);
    }

    return "updated";
  }

  if (!candidateNeedsUpdate(existing, candidate)) {
    return "skipped";
  }

  const { error } = await updateWorkflowReminder(client, companyId, existing.id, {
    title: candidate.title,
    message: candidate.message,
    metadata: candidate.metadata,
  });

  if (error) {
    throw new Error(error);
  }

  return "updated";
}

async function autoCompleteInactiveReminders(
  context: EvaluationContext,
  existingReminders: WorkflowReminderRow[],
  eligibleKeys: Set<string>,
): Promise<number> {
  const { companyId, client, evaluatedAtIso } = context;
  let completed = 0;

  for (const reminder of existingReminders) {
    if (reminder.status !== "active" && reminder.status !== "snoozed") {
      continue;
    }

    const key = workflowReminderIdempotencyKey({
      reminderKind: reminder.reminder_kind,
      sourceEntityType: reminder.source_entity_type,
      sourceEntityId: reminder.source_entity_id,
    });

    if (eligibleKeys.has(key)) {
      continue;
    }

    const { error } = await completeWorkflowReminder(
      client,
      companyId,
      reminder.id,
      evaluatedAtIso,
    );

    if (error) {
      throw new Error(error);
    }

    completed += 1;
  }

  return completed;
}

/**
 * Idempotent Phase 1 workflow reminder evaluation for one company tenant.
 * Uses the service role client by default so future cron can call it safely.
 * Writes only to `workflow_reminders`.
 */
export async function evaluateWorkflowRemindersForCompany(input: {
  companyId: string;
  evaluatedAt?: string | Date;
  client?: DbClient;
}): Promise<WorkflowReminderEvaluationResult> {
  const companyId = input.companyId.trim();
  const evaluatedAt =
    input.evaluatedAt != null ? new Date(toIsoTimestamp(input.evaluatedAt)) : new Date();
  const evaluatedAtIso = evaluatedAt.toISOString();

  const emptyResult: WorkflowReminderEvaluationResult = {
    companyId,
    evaluatedAt: evaluatedAtIso,
    created: 0,
    updated: 0,
    completed: 0,
    skipped: 0,
    errors: [],
  };

  if (!companyId) {
    return {
      ...emptyResult,
      errors: [{ kind: "input", message: "companyId is required" }],
    };
  }

  let client: DbClient;

  try {
    client = resolvePrivilegedDbClient(input.client);
  } catch (error) {
    return {
      ...emptyResult,
      errors: [
        {
          kind: "client",
          message:
            error instanceof Error
              ? error.message
              : "Service role client unavailable",
        },
      ],
    };
  }

  const result: WorkflowReminderEvaluationResult = {
    ...emptyResult,
  };

  try {
    const timeZone = await loadCompanyTimeZone(client, companyId);
    const context: EvaluationContext = {
      companyId,
      evaluatedAt,
      evaluatedAtIso,
      timeZone,
      client,
    };

    const [existingReminders, eligibleCandidates] = await Promise.all([
      listWorkflowRemindersForEvaluation(companyId, client, PHASE_1_WORKFLOW_REMINDER_KINDS),
      collectEligibleCandidates(context, result.errors),
    ]);

    const remindersByKey = indexRemindersByKey(existingReminders);
    const eligibleKeys = new Set<string>();

    for (const candidate of eligibleCandidates) {
      const key = workflowReminderIdempotencyKey({
        reminderKind: candidate.reminderKind,
        sourceEntityType: candidate.sourceEntityType,
        sourceEntityId: candidate.sourceEntityId,
      });

      eligibleKeys.add(key);

      try {
        const outcome = await upsertEligibleReminder(
          context,
          remindersByKey.get(key),
          candidate,
        );

        if (outcome === "created") {
          result.created += 1;
        } else if (outcome === "updated") {
          result.updated += 1;
        } else {
          result.skipped += 1;
        }
      } catch (error) {
        result.errors.push({
          kind: candidate.reminderKind,
          message:
            error instanceof Error ? error.message : "Reminder upsert failed",
        });
      }
    }

    try {
      result.completed = await autoCompleteInactiveReminders(
        context,
        existingReminders,
        eligibleKeys,
      );
    } catch (error) {
      result.errors.push({
        kind: "auto_complete",
        message:
          error instanceof Error ? error.message : "Auto-complete pass failed",
      });
    }
  } catch (error) {
    result.errors.push({
      kind: "evaluation",
      message: error instanceof Error ? error.message : "Evaluation failed",
    });
  }

  return result;
}

async function listCompanyIdsForReminderEvaluation(
  client: DbClient,
): Promise<string[]> {
  const { data, error } = await client
    .from("companies")
    .select("id")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.id);
}

/**
 * Idempotent Phase 1 workflow reminder evaluation for every company tenant.
 * Intended for scheduled cron execution via service role.
 */
export async function evaluateWorkflowRemindersForAllCompanies(input?: {
  evaluatedAt?: string | Date;
  client?: DbClient;
}): Promise<WorkflowReminderBatchEvaluationResult> {
  const evaluatedAt =
    input?.evaluatedAt != null
      ? new Date(toIsoTimestamp(input.evaluatedAt))
      : new Date();
  const evaluatedAtIso = evaluatedAt.toISOString();

  const emptyBatchResult: WorkflowReminderBatchEvaluationResult = {
    evaluatedAt: evaluatedAtIso,
    companyCount: 0,
    totals: {
      created: 0,
      updated: 0,
      completed: 0,
      skipped: 0,
    },
    companies: [],
    errors: [],
  };

  let client: DbClient;

  try {
    client = resolvePrivilegedDbClient(input?.client);
  } catch (error) {
    return {
      ...emptyBatchResult,
      errors: [
        {
          kind: "client",
          message:
            error instanceof Error
              ? error.message
              : "Service role client unavailable",
        },
      ],
    };
  }

  let companyIds: string[];

  try {
    companyIds = await listCompanyIdsForReminderEvaluation(client);
  } catch (error) {
    return {
      ...emptyBatchResult,
      errors: [
        {
          kind: "companies",
          message:
            error instanceof Error ? error.message : "Company lookup failed",
        },
      ],
    };
  }

  const companies: WorkflowReminderEvaluationResult[] = [];
  const totals = {
    created: 0,
    updated: 0,
    completed: 0,
    skipped: 0,
  };

  for (const companyId of companyIds) {
    const result = await evaluateWorkflowRemindersForCompany({
      companyId,
      evaluatedAt,
      client,
    });

    companies.push(result);
    totals.created += result.created;
    totals.updated += result.updated;
    totals.completed += result.completed;
    totals.skipped += result.skipped;
  }

  return {
    evaluatedAt: evaluatedAtIso,
    companyCount: companyIds.length,
    totals,
    companies,
    errors: companies.flatMap((result) => result.errors),
  };
}
