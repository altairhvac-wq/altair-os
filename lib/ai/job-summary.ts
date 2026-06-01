import "server-only";

import {
  JOB_SUMMARY_ACTIVITY_LIMIT,
  JOB_SUMMARY_CONTEXT_MAX_CHARS,
  JOB_SUMMARY_FIELD_MAX_CHARS,
  trimAiContextText,
  trimAiText,
} from "@/lib/ai/limits";
import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import {
  formatOperationalActivityDetailsForAccess,
  formatOperationalActivityLabelForAccess,
  formatOperationalActivityTimestamp,
} from "@/shared/types/operational-activity";
import { formatEstimateStatus } from "@/shared/types/estimate";
import { formatInvoiceStatus } from "@/shared/types/invoice";
import {
  formatJobStatus,
  formatScheduledDate,
  formatScheduledTime,
  type JobPriority,
} from "@/shared/types/job";
import type { JobSummaryDraftInput } from "@/shared/types/job-ai";

export const JOB_SUMMARY_AI_FEATURE = "job-summary";

export const INSUFFICIENT_JOB_SUMMARY_CONTEXT_MESSAGE =
  "There is not enough job information to summarize yet.";

const JOB_SUMMARY_PROMPT = `You summarize field service jobs for internal office and technician review at a trades company (HVAC, electrical, plumbing, or general service).

Output requirements:
- 4–7 short bullet points or brief labeled sections in plain text
- Professional, concise, and factual
- Use bullet characters (•) for list items
- End with one cautious suggested next step on its own line, prefixed exactly with "Suggested next step:"

Include when available in the context:
- Customer and job context (name, job number, service location, job type)
- Current job status and priority
- Scheduled date/time
- Assigned technician
- Job description and internal notes
- Completion notes and follow-up notes
- Recent activity highlights
- Estimate status (if provided)
- Invoice and payment status (if provided)

Rules:
- Use only facts from the context below — do not invent details, dates, amounts, or outcomes
- If a field is missing from the context, say it is not available rather than guessing
- Do not say "AI thinks", "I believe", or similar phrasing
- Do not make guarantees about completion, payment, or customer response
- Do not tell the user to take actions that the data does not support
- The suggested next step must be cautious and conditional, such as reviewing notes or confirming status before invoicing
- Do not write customer-facing email or SMS language unless completion notes explicitly require relaying them
- Do not expose internal database IDs — job numbers and estimate/invoice numbers shown in context are fine
- Plain text only — no markdown headings, no salutation`;

const RECENT_ACTIVITY_LIMIT = JOB_SUMMARY_ACTIVITY_LIMIT;

function formatJobPriorityLabel(priority: JobPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function hasIdentifiableJob(input: JobSummaryDraftInput): boolean {
  const job = input.job;
  return Boolean(
    job.status &&
      (job.jobNumber?.trim() || job.customerName?.trim()),
  );
}

function hasSupplementalContext(input: JobSummaryDraftInput): boolean {
  const job = input.job;

  return Boolean(
    job.description?.trim() ||
      job.notes?.trim() ||
      job.completionNotes?.trim() ||
      job.followUpNotes?.trim() ||
      job.assignedTechnicianId ||
      job.scheduledDate ||
      input.recentActivities.length > 0 ||
      input.estimates.length > 0 ||
      input.invoices.length > 0,
  );
}

export function hasUsefulJobSummaryContext(input: JobSummaryDraftInput): boolean {
  return hasIdentifiableJob(input) && hasSupplementalContext(input);
}

function formatRecentActivities(input: JobSummaryDraftInput): string | null {
  const activities = input.recentActivities.slice(0, RECENT_ACTIVITY_LIMIT);

  if (activities.length === 0) {
    return null;
  }

  return activities
    .map((activity) => {
      const label = formatOperationalActivityLabelForAccess(
        activity,
        input.includeBillingDetails,
      );
      const details = formatOperationalActivityDetailsForAccess(
        activity,
        input.includeBillingDetails,
      );
      const timestamp = formatOperationalActivityTimestamp(activity.createdAt);
      const line = details ? `${label}: ${details}` : label;
      return `- ${timestamp} · ${line}`;
    })
    .join("\n");
}

function formatEstimateSummaries(input: JobSummaryDraftInput): string | null {
  if (input.estimates.length === 0) {
    return null;
  }

  return input.estimates
    .map(
      (estimate) =>
        `- ${estimate.estimateNumber}: ${formatEstimateStatus(estimate.status)}`,
    )
    .join("\n");
}

function formatInvoiceSummaries(input: JobSummaryDraftInput): string | null {
  if (!input.includeBillingDetails || input.invoices.length === 0) {
    return null;
  }

  return input.invoices
    .map((invoice) => {
      const balance =
        invoice.balanceDue > 0
          ? ` · balance due $${invoice.balanceDue.toFixed(2)}`
          : invoice.amountPaid > 0
            ? ` · paid $${invoice.amountPaid.toFixed(2)}`
            : "";
      return `- ${invoice.invoiceNumber}: ${formatInvoiceStatus(invoice.status)}${balance}`;
    })
    .join("\n");
}

function trimJobTextField(value: string | undefined | null): string | undefined {
  const trimmed = trimAiText(value, JOB_SUMMARY_FIELD_MAX_CHARS);
  return trimmed || undefined;
}

function applyJobSummaryInputLimits(
  input: JobSummaryDraftInput,
): JobSummaryDraftInput {
  const { job } = input;
  const limitedJob = {
    ...job,
    description: trimJobTextField(job.description) ?? job.description,
    notes: trimJobTextField(job.notes) ?? job.notes,
    completionNotes:
      trimJobTextField(job.completionNotes) ?? job.completionNotes,
    followUpNotes: trimJobTextField(job.followUpNotes) ?? job.followUpNotes,
  };

  return {
    ...input,
    job: limitedJob,
    recentActivities: input.recentActivities.slice(0, RECENT_ACTIVITY_LIMIT),
  };
}

export function formatJobSummaryContext(input: JobSummaryDraftInput): string {
  const { job } = input;
  const sections: string[] = [];

  if (job.customerName?.trim()) {
    sections.push(`Customer: ${job.customerName.trim()}`);
  }

  if (job.jobNumber?.trim()) {
    sections.push(`Job number: ${job.jobNumber.trim()}`);
  }

  if (job.jobType?.trim()) {
    sections.push(`Job type: ${job.jobType.trim()}`);
  }

  sections.push(`Status: ${formatJobStatus(job.status)}`);
  sections.push(`Priority: ${formatJobPriorityLabel(job.priority)}`);

  if (job.scheduledDate?.trim()) {
    sections.push(
      `Scheduled: ${formatScheduledDate(job.scheduledDate)} at ${formatScheduledTime(job.scheduledDate)}`,
    );
  } else {
    sections.push("Scheduled: not available");
  }

  if (job.assignedTechnician?.trim()) {
    sections.push(`Assigned technician: ${job.assignedTechnician.trim()}`);
  } else {
    sections.push("Assigned technician: not assigned");
  }

  const serviceLocation = [job.serviceAddress, job.city, job.state, job.zip]
    .filter((part) => part?.trim())
    .join(", ");
  if (serviceLocation) {
    sections.push(`Service location: ${serviceLocation}`);
  }

  const description = job.description?.trim();
  sections.push(
    description
      ? `Job description:\n${description}`
      : "Job description: not available",
  );

  const notes = job.notes?.trim();
  sections.push(
    notes ? `Internal notes:\n${notes}` : "Internal notes: not available",
  );

  const completionNotes = job.completionNotes?.trim();
  sections.push(
    completionNotes
      ? `Completion notes:\n${completionNotes}`
      : "Completion notes: not available",
  );

  const followUpNotes = job.followUpNotes?.trim();
  sections.push(
    followUpNotes
      ? `Follow-up notes:\n${followUpNotes}`
      : "Follow-up notes: not available",
  );

  const recentActivities = formatRecentActivities(input);
  sections.push(
    recentActivities
      ? `Recent activities:\n${recentActivities}`
      : "Recent activities: none recorded",
  );

  const estimates = formatEstimateSummaries(input);
  sections.push(
    estimates ? `Estimates:\n${estimates}` : "Estimates: none on file",
  );

  if (input.includeBillingDetails) {
    const invoices = formatInvoiceSummaries(input);
    sections.push(
      invoices ? `Invoices:\n${invoices}` : "Invoices: none on file",
    );
  } else {
    sections.push("Invoices: not available for this user");
  }

  const context = sections.join("\n\n");
  return trimAiContextText(context, JOB_SUMMARY_CONTEXT_MAX_CHARS);
}

export type JobSummaryDraftPreparation =
  | { kind: "static"; draftText: string }
  | { kind: "request"; request: GenerateDraftTextRequest };

export function prepareJobSummaryDraft(
  input: JobSummaryDraftInput,
  companyId: string,
  userId: string,
): JobSummaryDraftPreparation {
  const limitedInput = applyJobSummaryInputLimits(input);

  if (!hasUsefulJobSummaryContext(limitedInput)) {
    return {
      kind: "static",
      draftText: INSUFFICIENT_JOB_SUMMARY_CONTEXT_MESSAGE,
    };
  }

  return {
    kind: "request",
    request: buildJobSummaryDraftRequest(limitedInput, companyId, userId),
  };
}

export function buildJobSummaryDraftRequest(
  input: JobSummaryDraftInput,
  companyId: string,
  userId: string,
): GenerateDraftTextRequest {
  return {
    feature: JOB_SUMMARY_AI_FEATURE,
    prompt: JOB_SUMMARY_PROMPT,
    inputText: formatJobSummaryContext(input),
    companyId,
    userId,
  };
}
