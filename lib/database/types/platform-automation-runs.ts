import type { Json, Timestamp, UUID } from "./enums";

/**
 * "partial" (migration 152): a bounded sweep did real work and will resume.
 * Distinct from "succeeded" so an unfinished cycle is visible, and from
 * "failed" so normal batching does not page anyone.
 */
export type PlatformAutomationRunStatus =
  | "started"
  | "succeeded"
  | "failed"
  | "partial";

export type PlatformAutomationRunTotals = {
  created?: number;
  updated?: number;
  completed?: number;
  skipped?: number;
  errorCount?: number;
  /** Bounded-sweep progress (migration 152). */
  cycleComplete?: boolean;
  stoppedForTime?: boolean;
};

export type PlatformAutomationRunRow = {
  id: UUID;
  automation_key: string;
  status: PlatformAutomationRunStatus;
  started_at: Timestamp;
  finished_at: Timestamp | null;
  duration_ms: number | null;
  company_count: number | null;
  totals: Json;
  error_summary: string | null;
  created_at: Timestamp;
};

export type PlatformAutomationRunInsert = {
  id?: UUID;
  automation_key: string;
  status: PlatformAutomationRunStatus;
  started_at?: Timestamp;
  finished_at?: Timestamp | null;
  duration_ms?: number | null;
  company_count?: number | null;
  totals?: Json;
  error_summary?: string | null;
  created_at?: Timestamp;
};
