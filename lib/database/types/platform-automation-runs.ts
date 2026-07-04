import type { Json, Timestamp, UUID } from "./enums";

export type PlatformAutomationRunStatus = "started" | "succeeded" | "failed";

export type PlatformAutomationRunTotals = {
  created?: number;
  updated?: number;
  completed?: number;
  skipped?: number;
  errorCount?: number;
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
