import "server-only";

import {
  COMPLETION_NOTES_CONTEXT_MAX_CHARS,
  COMPLETION_NOTES_MAX_CHARS,
  trimAiContextText,
  trimAiText,
} from "@/lib/ai/limits";
import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type { CompletionNotesDraftInput } from "@/shared/types/completion-notes-ai";
import type { Job } from "@/shared/types/job";

export const COMPLETION_NOTES_AI_FEATURE = "completion-notes";

export const INSUFFICIENT_COMPLETION_NOTES_CONTEXT_MESSAGE =
  "Add completion notes before polishing.";

const COMPLETION_NOTES_PROMPT = `You rewrite rough field technician shorthand into polished job completion notes for a field service company (HVAC, electrical, plumbing, or general trades).

Your job is to REWRITE shorthand into clear professional prose suitable for internal office review and job records. These notes document work performed on site — they are not customer-facing marketing copy.

Output requirements:
- Output ONLY the polished completion notes text — no headings, labels, or preamble
- Usually 2-5 concise sentences in plain prose
- Tone: professional, clear, and factual
- Correct spelling and grammar throughout
- Plain text only — no markdown, bullets, or salutation

When rough completion notes are provided:
- Expand common trade shorthand when meaning is clear (e.g. "cap" → capacitor, "wash coil" → clean the condenser coil, "txv" → thermostatic expansion valve, "pull vac" → evacuate and test the refrigerant system, "comp" → compressor, "stat" → thermostat, "pan" → drain pan, "cond" → condenser, "pressures" → refrigerant pressures)
- Turn fragments, abbreviations, and bullet-style notes into complete sentences
- Preserve all work actually mentioned: parts replaced, diagnostics performed, readings checked, system status, and any issues noted

Rules:
- Use only work supported by the context below (rough notes, follow-up notes, job details)
- Do not invent parts, diagnostics, warranties, prices, model numbers, permits, or work not mentioned
- Do not claim code compliance unless the technician wrote it
- Do not guarantee future performance or outcomes
- If the shorthand says an issue remains, the system is not fully resolved, or follow-up is needed, state that clearly
- Do not mention AI, automation, or that this was generated
- Do not make warranties, legal, or financial promises

Examples (rough notes → polished completion notes):

"replaced cap checked pressures cooling good"
→ Replaced the failed capacitor and verified proper system operation. Checked refrigerant pressures and confirmed the system is cooling properly.

"bad txv still hunting may need follow up"
→ Replaced the thermostatic expansion valve. The system is still hunting at times; follow-up may be needed to confirm stable operation.

"rewired kitchen outlet tested ok"
→ Rewired the kitchen outlet and tested the circuit. Power is restored and operating normally.`;

function hasSubstantiveNotes(notes: string | undefined): boolean {
  const trimmed = notes?.trim() ?? "";
  return trimmed.length >= 3;
}

export function hasUsefulCompletionNotesContext(
  input: CompletionNotesDraftInput,
): boolean {
  return hasSubstantiveNotes(input.notes);
}

function applyCompletionNotesInputLimits(
  input: CompletionNotesDraftInput,
): CompletionNotesDraftInput {
  const notes = input.notes?.trim();
  const followUpNotes = input.followUpNotes?.trim();

  const limitedNotes = notes
    ? trimAiText(notes, COMPLETION_NOTES_MAX_CHARS)
    : input.notes;
  const limitedFollowUp = followUpNotes
    ? trimAiText(followUpNotes, COMPLETION_NOTES_MAX_CHARS)
    : input.followUpNotes;

  if (limitedNotes === input.notes && limitedFollowUp === input.followUpNotes) {
    return input;
  }

  return {
    ...input,
    notes: limitedNotes || undefined,
    followUpNotes: limitedFollowUp || undefined,
  };
}

export function formatCompletionNotesContext(
  input: CompletionNotesDraftInput,
  job?: Pick<
    Job,
    | "jobNumber"
    | "jobType"
    | "description"
    | "customerName"
    | "city"
    | "state"
    | "status"
  > | null,
): string {
  const sections: string[] = [];

  if (job?.jobType?.trim()) {
    sections.push(`Job type: ${job.jobType.trim()}`);
  }

  if (job?.description?.trim()) {
    sections.push(`Job summary: ${job.description.trim()}`);
  }

  if (job?.customerName?.trim()) {
    sections.push(`Customer: ${job.customerName.trim()}`);
  }

  const city = job?.city?.trim();
  const state = job?.state?.trim();
  if (city || state) {
    sections.push(
      `Service location: ${[city, state].filter(Boolean).join(", ")}`,
    );
  }

  if (job?.status?.trim()) {
    sections.push(`Current job status: ${job.status.trim()}`);
  }

  const notes = input.notes?.trim();
  if (notes) {
    sections.push(
      `Rough completion notes (rewrite into polished prose — do not copy verbatim):\n${notes}`,
    );
  }

  const followUpNotes = input.followUpNotes?.trim();
  if (followUpNotes) {
    sections.push(
      `Follow-up recommendation (preserve if relevant to completion notes):\n${followUpNotes}`,
    );
  }

  const context = sections.join("\n\n") || "No completion notes context provided.";
  return trimAiContextText(context, COMPLETION_NOTES_CONTEXT_MAX_CHARS);
}

export type CompletionNotesDraftPreparation =
  | { kind: "static"; draftText: string }
  | { kind: "request"; request: GenerateDraftTextRequest };

export function prepareCompletionNotesDraft(
  input: CompletionNotesDraftInput,
  companyId: string,
  userId: string,
  job?: Pick<
    Job,
    | "jobNumber"
    | "jobType"
    | "description"
    | "customerName"
    | "city"
    | "state"
    | "status"
  > | null,
): CompletionNotesDraftPreparation {
  const limitedInput = applyCompletionNotesInputLimits(input);

  if (!hasUsefulCompletionNotesContext(limitedInput)) {
    return {
      kind: "static",
      draftText: INSUFFICIENT_COMPLETION_NOTES_CONTEXT_MESSAGE,
    };
  }

  return {
    kind: "request",
    request: buildCompletionNotesDraftRequest(
      limitedInput,
      companyId,
      userId,
      job,
    ),
  };
}

export function buildCompletionNotesDraftRequest(
  input: CompletionNotesDraftInput,
  companyId: string,
  userId: string,
  job?: Pick<
    Job,
    | "jobNumber"
    | "jobType"
    | "description"
    | "customerName"
    | "city"
    | "state"
    | "status"
  > | null,
): GenerateDraftTextRequest {
  return {
    feature: COMPLETION_NOTES_AI_FEATURE,
    prompt: COMPLETION_NOTES_PROMPT,
    inputText: formatCompletionNotesContext(input, job),
    companyId,
    userId,
  };
}
