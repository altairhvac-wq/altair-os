import type { PlatformPrioritySignalKind } from "@/shared/types/platform-admin";

export type PlatformFounderSignalActionStatus =
  | "open"
  | "contacted"
  | "snoozed"
  | "resolved";

export type PlatformFounderSignalActionState = {
  id: string;
  signalKey: string;
  signalKind: PlatformPrioritySignalKind;
  status: PlatformFounderSignalActionStatus;
  note: string | null;
  snoozedUntil: string | null;
  contactedAt: string | null;
  resolvedAt: string | null;
  resolvedFingerprint: string | null;
  updatedAt: string;
};

export type PlatformFounderOutreachBrief = {
  status: PlatformFounderSignalActionStatus;
  contactedAt: string | null;
  notePreview: string | null;
};
