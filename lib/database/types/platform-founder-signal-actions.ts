import type { Timestamp, UUID } from "./enums";

export type PlatformFounderSignalActionStatus =
  | "open"
  | "contacted"
  | "snoozed"
  | "resolved";

export type PlatformFounderSignalActionRow = {
  id: UUID;
  signal_key: string;
  signal_kind: string;
  signal_title_snapshot: string;
  company_id: UUID | null;
  company_name_snapshot: string | null;
  status: PlatformFounderSignalActionStatus;
  note: string | null;
  snoozed_until: Timestamp | null;
  contacted_at: Timestamp | null;
  resolved_at: Timestamp | null;
  resolved_fingerprint: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: UUID | null;
  updated_by: UUID | null;
};

export type PlatformFounderSignalActionInsert = {
  id?: UUID;
  signal_key: string;
  signal_kind: string;
  signal_title_snapshot: string;
  company_id?: UUID | null;
  company_name_snapshot?: string | null;
  status?: PlatformFounderSignalActionStatus;
  note?: string | null;
  snoozed_until?: Timestamp | null;
  contacted_at?: Timestamp | null;
  resolved_at?: Timestamp | null;
  resolved_fingerprint?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  created_by?: UUID | null;
  updated_by?: UUID | null;
};
