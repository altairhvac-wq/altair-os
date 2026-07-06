import type {
  PlatformFounderOutreachBrief,
  PlatformFounderSignalActionState,
} from "@/shared/types/platform-founder-actions";
import type {
  PlatformPrioritySignal,
  PlatformPrioritySignalKind,
} from "@/shared/types/platform-admin";
import type { CompanyHealthSummary } from "@/shared/types/platform-customer-health";
import { isActionableFounderSignalKind } from "@/shared/lib/platform-signal-keys";

const CONTACTED_SCORE_REDUCTION = 8;

export type PlatformFounderSignalActionRecord = PlatformFounderSignalActionState & {
  companyId: string | null;
  companyNameSnapshot: string | null;
  signalTitleSnapshot: string;
};

function isSnoozeActive(
  action: PlatformFounderSignalActionRecord,
  nowMs: number,
): boolean {
  if (action.status !== "snoozed" || !action.snoozedUntil) {
    return false;
  }

  return Date.parse(action.snoozedUntil) > nowMs;
}

function isResolvedForFingerprint(
  action: PlatformFounderSignalActionRecord,
  fingerprint: string,
): boolean {
  if (action.status !== "resolved") {
    return false;
  }

  if (!action.resolvedFingerprint) {
    return true;
  }

  return action.resolvedFingerprint === fingerprint;
}

function truncateNotePreview(note: string | null): string | null {
  if (!note?.trim()) {
    return null;
  }

  const trimmed = note.trim();
  if (trimmed.length <= 120) {
    return trimmed;
  }

  return `${trimmed.slice(0, 117).trimEnd()}…`;
}

export function mapRowToFounderActionRecord(
  row: {
    id: string;
    signal_key: string;
    signal_kind: string;
    signal_title_snapshot: string;
    company_id: string | null;
    company_name_snapshot: string | null;
    status: string;
    note: string | null;
    snoozed_until: string | null;
    contacted_at: string | null;
    resolved_at: string | null;
    resolved_fingerprint: string | null;
    updated_at: string;
  },
): PlatformFounderSignalActionRecord {
  return {
    id: row.id,
    signalKey: row.signal_key,
    signalKind: row.signal_kind as PlatformPrioritySignalKind,
    signalTitleSnapshot: row.signal_title_snapshot,
    companyId: row.company_id,
    companyNameSnapshot: row.company_name_snapshot,
    status: row.status as PlatformFounderSignalActionRecord["status"],
    note: row.note,
    snoozedUntil: row.snoozed_until,
    contactedAt: row.contacted_at,
    resolvedAt: row.resolved_at,
    resolvedFingerprint: row.resolved_fingerprint,
    updatedAt: row.updated_at,
  };
}

export function applyFounderActionsToSignals(
  signals: PlatformPrioritySignal[],
  actionsByKey: Map<string, PlatformFounderSignalActionRecord>,
  now: Date = new Date(),
): PlatformPrioritySignal[] {
  const nowMs = now.getTime();
  const visible: PlatformPrioritySignal[] = [];

  for (const signal of signals) {
    if (!signal.supportsFounderActions || !signal.signalKey) {
      visible.push(signal);
      continue;
    }

    const action = actionsByKey.get(signal.signalKey) ?? null;
    const fingerprint = signal.fingerprint ?? "v1";

    if (action && isSnoozeActive(action, nowMs)) {
      continue;
    }

    if (action && isResolvedForFingerprint(action, fingerprint)) {
      continue;
    }

    let nextSignal: PlatformPrioritySignal = {
      ...signal,
      founderAction: action
        ? {
            id: action.id,
            signalKey: action.signalKey,
            signalKind: action.signalKind,
            status: action.status,
            note: action.note,
            snoozedUntil: action.snoozedUntil,
            contactedAt: action.contactedAt,
            resolvedAt: action.resolvedAt,
            resolvedFingerprint: action.resolvedFingerprint,
            updatedAt: action.updatedAt,
          }
        : null,
    };

    if (action?.status === "contacted") {
      nextSignal = {
        ...nextSignal,
        score: Math.max(0, nextSignal.score - CONTACTED_SCORE_REDUCTION),
      };
    }

    visible.push(nextSignal);
  }

  return visible.sort((left, right) => right.score - left.score);
}

export function enrichSignalsWithActionSupport(
  signals: PlatformPrioritySignal[],
): PlatformPrioritySignal[] {
  return signals.map((signal) => ({
    ...signal,
    supportsFounderActions: isActionableFounderSignalKind(signal.kind),
    signalKey: signal.signalKey ?? undefined,
    fingerprint: signal.fingerprint ?? "v1",
  }));
}

export function buildFounderOutreachByCompanyId(
  actions: PlatformFounderSignalActionRecord[],
  now: Date = new Date(),
): Map<string, PlatformFounderOutreachBrief> {
  const nowMs = now.getTime();
  const byCompany = new Map<string, PlatformFounderOutreachBrief>();

  for (const action of actions) {
    if (!action.companyId) {
      continue;
    }

    if (action.status === "snoozed" && isSnoozeActive(action, nowMs)) {
      continue;
    }

    if (action.status === "resolved") {
      continue;
    }

    if (action.status !== "contacted" || !action.contactedAt) {
      continue;
    }

    const existing = byCompany.get(action.companyId);
    if (
      existing?.contactedAt &&
      Date.parse(existing.contactedAt) >= Date.parse(action.contactedAt)
    ) {
      continue;
    }

    byCompany.set(action.companyId, {
      status: action.status,
      contactedAt: action.contactedAt,
      notePreview: truncateNotePreview(action.note),
    });
  }

  return byCompany;
}

export function attachFounderOutreachToCompanies(
  companies: CompanyHealthSummary[],
  outreachByCompanyId: Map<string, PlatformFounderOutreachBrief>,
): CompanyHealthSummary[] {
  return companies.map((company) => ({
    ...company,
    founderOutreach: outreachByCompanyId.get(company.companyId) ?? null,
  }));
}

export function buildReliabilityActionHints(
  signals: PlatformPrioritySignal[],
): Map<string, PlatformFounderSignalActionState | null> {
  const hints = new Map<string, PlatformFounderSignalActionState | null>();

  const reliabilityKindToPulseId: Partial<Record<PlatformPrioritySignalKind, string>> = {
    workflow_cron_failed: "cron",
    workflow_cron_stale: "cron",
    payment_webhook_failed: "payments",
    payment_event_stuck: "payments",
    stripe_connect_incomplete: "stripe",
    stripe_connect_restricted: "stripe",
    platform_system_warning: "config",
  };

  for (const signal of signals) {
    const pulseId = reliabilityKindToPulseId[signal.kind];
    if (!pulseId || !signal.founderAction) {
      continue;
    }

    if (!hints.has(pulseId)) {
      hints.set(pulseId, signal.founderAction);
    }
  }

  return hints;
}
