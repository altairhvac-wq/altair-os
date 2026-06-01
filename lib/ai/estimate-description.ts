import "server-only";

import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type { EstimateDescriptionDraftInput } from "@/shared/types/estimate-ai";

export const ESTIMATE_DESCRIPTION_AI_FEATURE = "estimate-description";

export const INSUFFICIENT_ESTIMATE_DESCRIPTION_CONTEXT_MESSAGE =
  "Add a few notes or line items before rewriting.";

const ESTIMATE_DESCRIPTION_PROMPT = `You rewrite rough technician notes into polished, customer-facing estimate descriptions for a field service company (HVAC, electrical, plumbing, or general trades).

Your job is to REWRITE and professionalize — not to repeat, lightly paraphrase, or preserve technician shorthand. Transform informal field notes into clear prose a homeowner can understand.

Output requirements:
- Exactly 2-4 concise sentences in plain prose
- Tone: professional, clear, and friendly — not salesy or overly promotional
- Audience: homeowner or customer reading an estimate
- Correct spelling and grammar throughout

When rough technician notes are provided:
- Expand common trade shorthand when meaning is clear (e.g. "cap" → capacitor, "wash coil" → clean the condenser coil, "txv" → thermostatic expansion valve, "pull vac" → evacuate and test the refrigerant system, "comp" → compressor, "stat" → thermostat, "pan" → drain pan, "cond" → condenser)
- Turn fragments, abbreviations, and bullet-style notes into complete sentences
- Do NOT copy the notes verbatim, preserve shorthand, or keep the same sentence structure
- If the input is already polished customer-facing prose, improve clarity and grammar while preserving meaning — do not simply echo it back

When notes are brief, fragmentary, or mostly shorthand:
- Use line items, job summary, job type, and trade context as the primary scope references
- Weave line-item work into natural prose; do not mechanically list every item unless the scope is clearly a multi-part checklist

When the context says the technician only asked to rewrite/professionalize (not actual scope notes):
- IGNORE phrases like "replace what I wrote", "rewrite this", or "make it better" as estimate content
- Draft from line items, job summary, job type, and trade context instead

Before you respond, check your draft:
- If it closely mirrors the rough notes (same wording, order, or shorthand), rewrite again with fuller customer-friendly language
- Do not invent scope, parts, repairs, or outcomes not supported by the context
- Do not output generic filler — every sentence should describe work present in the notes or line items

Examples (rough notes → customer-facing description):

"bad cap on AC, replace + test"
→ We recommend replacing the failed capacitor on your air conditioning unit and testing the system to confirm proper operation.

"wash coil, check freon, cust complains warm upstairs"
→ This estimate covers cleaning the outdoor condenser coil, checking refrigerant levels, and diagnosing the warm airflow reported upstairs.

"rewire kitchen outlet"
→ We will rewire the kitchen outlet to restore safe, code-compliant power to the circuit.

Rules:
- Use only work supported by the context below (notes, line items, job details)
- Do not invent major services, parts, repairs, or outcomes not implied by the context
- Do not guarantee results, outcomes, or completion timing — use language like "recommend", "covers", or "includes" instead of promises
- Do not mention AI, automation, or that this was generated
- Do not make warranties, legal, or financial promises
- Do not mention prices, totals, or dollar amounts unless explicitly provided in context
- Plain text only — no markdown, headings, bullets, or salutation`;

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
  /^(please )?rewrite (this|it|for me)\.?$/,
  /^draft (this|it) for me\.?$/,
  /^write (this|it) better\.?$/,
  /^turn (this|it) into (a )?customer[- ]facing description\.?$/,
];

const BRIEF_NOTES_MAX_LENGTH = 60;
const BRIEF_NOTES_MAX_WORDS = 6;

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

export function isBriefNotes(notes: string | undefined): boolean {
  const trimmed = notes?.trim() ?? "";
  if (!trimmed || isMetaInstructionOnly(trimmed)) {
    return false;
  }

  const wordCount = trimmed.split(/\s+/).length;
  return trimmed.length <= BRIEF_NOTES_MAX_LENGTH || wordCount <= BRIEF_NOTES_MAX_WORDS;
}

export function isInsufficientEstimateDescriptionResponse(
  draftText: string | undefined,
): boolean {
  const normalized = draftText?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }

  return (
    normalized === INSUFFICIENT_ESTIMATE_DESCRIPTION_CONTEXT_MESSAGE.toLowerCase() ||
    normalized.includes("add a few notes or line items")
  );
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

function buildRewriteGuidance(input: EstimateDescriptionDraftInput): string | null {
  const notes = input.notes?.trim();
  const hasItems = hasLineItemContext(input);

  if (notes && isMetaInstructionOnly(notes)) {
    if (hasItems) {
      return "Rewrite guidance: The technician asked for a rewrite, not scope notes. Build the description primarily from the line items and job context below.";
    }

    return "Rewrite guidance: The technician asked for a rewrite, not scope notes. Build the description from the job context below.";
  }

  if (notes && isBriefNotes(notes) && hasItems) {
    return "Rewrite guidance: The technician notes are brief. Use the line items as the primary scope reference and expand the notes into full customer-facing sentences.";
  }

  if (notes && isBriefNotes(notes)) {
    return "Rewrite guidance: The technician notes are brief. Expand them into complete customer-facing sentences using any job context available.";
  }

  if (!notes && hasItems) {
    return "Rewrite guidance: No technician notes were provided. Draft a customer-facing scope summary from the line items and job context below.";
  }

  return null;
}

export function formatEstimateDescriptionContext(
  input: EstimateDescriptionDraftInput,
): string {
  const sections: string[] = [];

  const rewriteGuidance = buildRewriteGuidance(input);
  if (rewriteGuidance) {
    sections.push(rewriteGuidance);
  }

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
