import "server-only";

import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type { EstimateDescriptionDraftInput } from "@/shared/types/estimate-ai";

export const ESTIMATE_DESCRIPTION_AI_FEATURE = "estimate-description";

const ESTIMATE_DESCRIPTION_PROMPT = `Write a customer-facing estimate scope/description for a field service company (HVAC, electrical, plumbing, or general trades).

Tone: professional, clear, and friendly. Audience: homeowner or customer. Length: concise (typically 2-4 sentences).

Rules:
- Use only work and details supported by the context below
- Do not invent services, parts, or outcomes beyond the provided context
- Do not mention AI or that this was generated
- Do not make guarantees, warranties, or legal/financial promises
- Do not mention prices, totals, or dollar amounts
- Plain text only (no markdown, bullets, or salutation)`;

function formatLineItems(input: EstimateDescriptionDraftInput): string | null {
  const items = (input.lineItems ?? []).filter(
    (item) =>
      item.name.trim().length > 0 ||
      item.description.trim().length > 0 ||
      item.quantity > 0,
  );

  if (items.length === 0) {
    return null;
  }

  return items
    .map((item) => {
      const name = item.name.trim() || "Service item";
      const description = item.description.trim();
      const quantity =
        item.quantity > 0 ? item.quantity : 1;

      if (description) {
        return `- ${name}: ${description} (qty ${quantity})`;
      }

      return `- ${name} (qty ${quantity})`;
    })
    .join("\n");
}

export function formatEstimateDescriptionContext(
  input: EstimateDescriptionDraftInput,
): string {
  const sections: string[] = [];

  if (input.customerName?.trim()) {
    sections.push(`Customer: ${input.customerName.trim()}`);
  }

  if (input.jobNumber?.trim()) {
    sections.push(`Job number: ${input.jobNumber.trim()}`);
  }

  if (input.jobType?.trim()) {
    sections.push(`Job type: ${input.jobType.trim()}`);
  }

  if (input.jobTitle?.trim()) {
    sections.push(`Job summary: ${input.jobTitle.trim()}`);
  }

  if (input.tradeContext?.trim()) {
    sections.push(`Trade context: ${input.tradeContext.trim()}`);
  }

  if (input.notes?.trim()) {
    sections.push(`Existing notes:\n${input.notes.trim()}`);
  }

  const lineItems = formatLineItems(input);
  if (lineItems) {
    sections.push(`Line items:\n${lineItems}`);
  }

  return sections.join("\n\n") || "No estimate context provided.";
}

export function buildEstimateDescriptionDraftRequest(
  input: EstimateDescriptionDraftInput,
  companyId: string,
  userId: string,
): GenerateDraftTextRequest {
  return {
    feature: ESTIMATE_DESCRIPTION_AI_FEATURE,
    prompt: ESTIMATE_DESCRIPTION_PROMPT,
    inputText: formatEstimateDescriptionContext(input),
    companyId,
    userId,
  };
}
