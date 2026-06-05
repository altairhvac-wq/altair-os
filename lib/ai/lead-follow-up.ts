import "server-only";

import {
  LEAD_FOLLOW_UP_ACTIVITY_LIMIT,
  LEAD_FOLLOW_UP_CONTEXT_MAX_CHARS,
  LEAD_FOLLOW_UP_FIELD_MAX_CHARS,
  trimAiContextText,
  trimAiText,
} from "@/lib/ai/limits";
import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import { formatEstimateStatus } from "@/shared/types/estimate";
import {
  formatLeadActivityDetails,
  formatLeadActivityLabel,
} from "@/shared/types/lead-activity";
import type { LeadFollowUpDraftInput } from "@/shared/types/lead-ai";
import {
  formatLeadName,
  formatLeadSource,
  formatLeadStatus,
} from "@/shared/types/lead";
import { formatJobStatus } from "@/shared/types/job";

export const LEAD_FOLLOW_UP_AI_FEATURE = "lead_follow_up";

const LEAD_FOLLOW_UP_PROMPT = `You draft short, professional follow-up messages for office staff at a field service company (HVAC, electrical, plumbing, or general trades).

Your job is to produce ONE practical message the office can copy into email or SMS after human review. The message must reflect the lead context described below.

Output requirements:
- Plain text only — no markdown, bullets, headings, or subject line
- 2–5 concise sentences
- Start with a brief greeting using the lead's first name when provided (e.g. "Hi John,")
- Tone: professional, friendly, clear, and service-company appropriate — not pushy, not fake, not overpromising

Rules:
- Use only facts from the context below — do not invent details, appointment times, prices, or past conversations
- Do not mention discounts or guarantees unless explicitly stated in the context
- Do not pretend a call happened if the context does not show one was logged
- Do not say an estimate exists unless estimate context is provided
- Do not make up appointment times or prices
- If the lead lacks enough detail, produce a safe, general follow-up check-in
- Do not mention AI, automation, or internal systems
- You may reference the company name when provided in context

Example (adapt to actual context; do not copy verbatim if facts differ):

Hi John, this is Altair HVAC following up on your recent service request. We wanted to check whether you still need help and see if there is a good time to discuss the next step. Please let us know what works best for you.`;

function trimField(value: string | undefined | null): string | undefined {
  const trimmed = trimAiText(value, LEAD_FOLLOW_UP_FIELD_MAX_CHARS);
  return trimmed || undefined;
}

function formatTimestamp(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return value.trim().slice(0, 10);
}

function formatRecentActivities(input: LeadFollowUpDraftInput): string | null {
  const activities = input.recentActivities.slice(0, LEAD_FOLLOW_UP_ACTIVITY_LIMIT);

  if (activities.length === 0) {
    return null;
  }

  return activities
    .map((activity) => {
      const label = formatLeadActivityLabel(activity);
      const details = formatLeadActivityDetails(activity);
      const timestamp = formatTimestamp(activity.createdAt) ?? "unknown date";
      const line = details ? `${label}: ${details}` : label;
      return `- ${timestamp} · ${line}`;
    })
    .join("\n");
}

function applyLeadFollowUpInputLimits(
  input: LeadFollowUpDraftInput,
): LeadFollowUpDraftInput {
  const { lead } = input;

  return {
    ...input,
    companyName: trimField(input.companyName) ?? input.companyName,
    lead: {
      ...lead,
      firstName: trimField(lead.firstName) ?? lead.firstName,
      lastName: trimField(lead.lastName) ?? lead.lastName,
      companyName: trimField(lead.companyName) ?? lead.companyName,
      notes: trimField(lead.notes) ?? lead.notes,
    },
    recentActivities: input.recentActivities.slice(0, LEAD_FOLLOW_UP_ACTIVITY_LIMIT),
  };
}

export function formatLeadFollowUpContext(input: LeadFollowUpDraftInput): string {
  const { lead } = input;
  const sections: string[] = [];

  sections.push(`Lead name: ${formatLeadName(lead)}`);

  if (lead.companyName?.trim()) {
    sections.push(`Company name: ${lead.companyName.trim()}`);
  }

  sections.push(`Source: ${formatLeadSource(lead.source)}`);
  sections.push(`Status: ${formatLeadStatus(lead.status)}`);

  const notes = lead.notes?.trim();
  sections.push(notes ? `Notes:\n${notes}` : "Notes: none");

  const nextFollowUp = formatTimestamp(lead.nextFollowUpAt);
  sections.push(
    nextFollowUp
      ? `Next follow-up date: ${nextFollowUp}`
      : "Next follow-up date: not scheduled",
  );

  const lastContacted = formatTimestamp(lead.lastContactedAt);
  sections.push(
    lastContacted
      ? `Last contacted: ${lastContacted}`
      : "Last contacted: not recorded",
  );

  const recentActivities = formatRecentActivities(input);
  sections.push(
    recentActivities
      ? `Recent activities (newest first):\n${recentActivities}`
      : "Recent activities: none recorded",
  );

  if (input.estimate) {
    const estimate = input.estimate;
    const estimateLines = [
      `Estimate number: ${estimate.estimateNumber}`,
      `Estimate status: ${formatEstimateStatus(estimate.status)}`,
      `Estimate total: $${estimate.total.toFixed(2)}`,
      `Estimate created: ${formatTimestamp(estimate.createdAt) ?? estimate.createdAt}`,
    ];

    if (estimate.sentAt?.trim()) {
      estimateLines.push(
        `Estimate sent: ${formatTimestamp(estimate.sentAt) ?? estimate.sentAt}`,
      );
    }

    if (estimate.approvedAt?.trim()) {
      estimateLines.push(
        `Estimate approved: ${formatTimestamp(estimate.approvedAt) ?? estimate.approvedAt}`,
      );
    }

    sections.push(`Linked estimate:\n${estimateLines.join("\n")}`);
  } else {
    sections.push("Linked estimate: none on file");
  }

  if (input.customer) {
    const customer = input.customer;
    const customerLines = [
      `Customer name: ${customer.name}`,
      `Open jobs: ${customer.openJobsCount}`,
    ];

    if (customer.recentJobNumber && customer.recentJobStatus) {
      customerLines.push(
        `Most recent job: ${customer.recentJobNumber} (${formatJobStatus(customer.recentJobStatus)})`,
      );
    }

    sections.push(`Converted customer:\n${customerLines.join("\n")}`);
  } else {
    sections.push("Converted customer: not converted");
  }

  if (input.companyName?.trim()) {
    sections.push(`Office company name: ${input.companyName.trim()}`);
  }

  const context = sections.join("\n\n");
  return trimAiContextText(context, LEAD_FOLLOW_UP_CONTEXT_MAX_CHARS);
}

export type LeadFollowUpDraftPreparation =
  | { kind: "static"; draftText: string }
  | { kind: "request"; request: GenerateDraftTextRequest };

export function prepareLeadFollowUpDraft(
  input: LeadFollowUpDraftInput,
  companyId: string,
  userId: string,
): LeadFollowUpDraftPreparation {
  const limitedInput = applyLeadFollowUpInputLimits(input);

  return {
    kind: "request",
    request: buildLeadFollowUpDraftRequest(limitedInput, companyId, userId),
  };
}

export function buildLeadFollowUpDraftRequest(
  input: LeadFollowUpDraftInput,
  companyId: string,
  userId: string,
): GenerateDraftTextRequest {
  return {
    feature: LEAD_FOLLOW_UP_AI_FEATURE,
    prompt: LEAD_FOLLOW_UP_PROMPT,
    inputText: formatLeadFollowUpContext(input),
    companyId,
    userId,
  };
}
