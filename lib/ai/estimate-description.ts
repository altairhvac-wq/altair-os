import "server-only";

import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type { EstimateDescriptionDraftInput } from "@/shared/types/estimate-ai";

export const ESTIMATE_DESCRIPTION_AI_FEATURE = "estimate-description";

export const INSUFFICIENT_ESTIMATE_DESCRIPTION_CONTEXT_MESSAGE =
  "Please add a few notes or line items so Altair can draft a customer-facing estimate description.";

const ESTIMATE_DESCRIPTION_PROMPT = `You rewrite rough technician notes into a polished, customer-facing estimate scope/description for a field service company (HVAC, electrical, plumbing, or general trades).

Your job is to REWRITE and professionalize the input — not to repeat it. Technician notes are intentionally informal; transform them into clear language a homeowner can understand.

Tone: professional, clear, and friendly (not salesy). Audience: homeowner or customer. Length: 2-4 concise sentences in plain prose.

When "Rough technician notes" are provided:
- Expand common trade shorthand when meaning is clear (e.g. "cap" → capacitor, "wash coil" → clean the condenser coil)
- Correct spelling and grammar
- Turn fragments and shorthand into complete sentences
- Do NOT copy the notes verbatim unless they are already polished customer-facing prose

When the context says the technician only asked to rewrite/professionalize (not actual scope notes):
- IGNORE phrases like "replace what I wrote", "rewrite this", or "make it better" as estimate content
- Draft from line items, job summary, job type, and trade context instead

If there is no useful work context at all (no line items, job details, or substantive scope notes):
- Output exactly this plain-text message and nothing else:
${INSUFFICIENT_ESTIMATE_DESCRIPTION_CONTEXT_MESSAGE}

Rules:
- Use only work supported by the context below (notes, line items, job details)
- Do not invent major services, parts, or outcomes not implied by the context
- Do not guarantee results or outcomes
- Do not mention AI or that this was generated
- Do not make warranties, legal, or financial promises
- Do not mention prices, totals, or dollar amounts unless explicitly provided in context
- Plain text only — no markdown, headings, bullets, or salutation unless the work clearly needs a short inline list
- Avoid overly promotional language`;

/** Whole-note phrases that ask for rewriting, not scope of work. */
const META_INSTRUCTION_PATTERNS: RegExp[] = [
  /^replace what i wrote\.?$/,
  /^rewrite (this|it|my notes?|what i wrote)\.?$/,
  /^reword (this|it|my notes?)\.?$/,
  /^make (it|this|my notes?) (better|professional|sound better)\.?$/,
  /^professionali[sz]e (this|it|my notes?)\.?$/,
  /^improve (this|it|my notes?|what i wrote)\.?$/,
  /^fix (this|it|my (notes|writing|description))\.?$/,
  /^polish (this|it|my notes?)\.?$/,
  /^clean (this|it) up\.?$/,
  /^help me rewrite\.?$/,
  /^can you rewrite\.?$/,
  /^draft (this|it) for me\.?$/,
  /^write (this|it) better\.?$/,
  /^turn (this|it) into (a )?customer[- ]facing description\.?$/,
];

function normalizeNotesForMetaCheck(notes: string): string {
  return notes.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
}

export function isMetaInstructionOnly(notes: string | undefined): boolean {
  const normalized = normalizeNotesForMetaCheck(notes ?? "");
  if (!normalized) {
    return false;
  }

  return META_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function hasLineItemContext(input: EstimateDescriptionDraftInput): boolean {
  return (input.lineItems ?? []).some(
    (item) =>
      item.name.trim().length > 0 ||
      item.description.trim().length > 0 ||
      item.quantity > 0,
  );
}

function hasJobContext(input: EstimateDescriptionDraftInput): boolean {
  return Boolean(
    input.jobType?.trim() ||
      input.jobTitle?.trim() ||
      input.tradeContext?.trim() ||
      input.jobNumber?.trim(),
  );
}

function hasSubstantiveNotes(input: EstimateDescriptionDraftInput): boolean {
  const notes = input.notes?.trim() ?? "";
  if (!notes) {
    return false;
  }

  return !isMetaInstructionOnly(notes);
}

export function hasUsefulWorkContext(input: EstimateDescriptionDraftInput): boolean {
  return (
    hasLineItemContext(input) ||
    hasJobContext(input) ||
    hasSubstantiveNotes(input)
  );
}

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
      const quantity = item.quantity > 0 ? item.quantity : 1;

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

  const notes = input.notes?.trim();
  if (notes) {
    if (isMetaInstructionOnly(notes)) {
      sections.push(
        "Technician request (not estimate content): Rewrite/professionalize into a customer-facing description using the line items and job context below. Do not treat the request phrase itself as scope of work.",
      );
    } else {
      sections.push(
        `Rough technician notes (rewrite into customer-facing prose — do not copy verbatim):\n${notes}`,
      );
    }
  }

  const lineItems = formatLineItems(input);
  if (lineItems) {
    sections.push(`Line items:\n${lineItems}`);
  }

  return sections.join("\n\n") || "No estimate context provided.";
}

export type EstimateDescriptionDraftPreparation =
  | { kind: "static"; draftText: string }
  | { kind: "request"; request: GenerateDraftTextRequest };

export function prepareEstimateDescriptionDraft(
  input: EstimateDescriptionDraftInput,
  companyId: string,
  userId: string,
): EstimateDescriptionDraftPreparation {
  if (!hasUsefulWorkContext(input)) {
    return {
      kind: "static",
      draftText: INSUFFICIENT_ESTIMATE_DESCRIPTION_CONTEXT_MESSAGE,
    };
  }

  return {
    kind: "request",
    request: buildEstimateDescriptionDraftRequest(input, companyId, userId),
  };
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
