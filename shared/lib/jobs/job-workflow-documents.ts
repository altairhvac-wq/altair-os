/**
 * Semantic workflow documents opened over Job Detail.
 * Presentation-only — never mutates status by opening.
 */

export type JobWorkflowDocument =
  | { kind: "job-details" }
  | { kind: "technician-assignment" }
  | { kind: "inspection" }
  | { kind: "estimate-create" }
  | { kind: "estimate-chooser"; estimateIds: string[] }
  | { kind: "estimate-view"; estimateId: string }
  | { kind: "estimate-approval"; estimateId: string }
  | { kind: "work-controls" }
  | { kind: "completion" }
  | { kind: "completion-details" }
  | { kind: "invoice-create"; estimateId?: string }
  | { kind: "invoice-view"; invoiceId: string }
  | { kind: "payment"; invoiceId: string }
  | { kind: "completed-summary" };

export type JobWorkflowStageTarget =
  | { kind: "document"; document: JobWorkflowDocument; label: string }
  | { kind: "section"; sectionId: string; label: string }
  | { kind: "locked"; reason: string };
