"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  addLeadNoteAction,
  convertLeadToCustomerAction,
  getLeadActivitiesAction,
  logLeadCallAction,
  logLeadEmailAction,
  markLeadLostAction,
  markLeadWonAction,
  prepareLeadEstimateAction,
} from "@/app/actions/leads";
import type { LeadAssignableMember } from "@/lib/database/queries/leads";
import { DesktopConditionalDetailPanel } from "@/shared/components/layout/DesktopConditionalDetailPanel";
import { LeadActivityTimeline } from "@/shared/components/leads/LeadActivityTimeline";
import { LeadFollowUpAiAssistant } from "@/shared/components/leads/LeadFollowUpAiAssistant";
import { LeadFollowUpCard } from "@/shared/components/leads/LeadFollowUpCard";
import {
  LeadForm,
  type LeadCreateOutcome,
} from "@/shared/components/leads/LeadForm";
import { LeadStatusBadge } from "@/shared/components/leads/LeadStatusBadge";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { shouldPromptConvertOnWon } from "@/shared/lib/leads/lead-conversion";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { LeadActivity } from "@/shared/types/lead-activity";
import {
  formatLeadName,
  formatLeadSource,
  isLeadClosed,
  LEAD_LOST_REASON_OPTIONS,
  type Lead,
} from "@/shared/types/lead";

type PanelMode = "detail" | "create" | "empty";

type LeadDetailPanelProps = {
  mode: PanelMode;
  lead: Lead | null;
  initialActivities: LeadActivity[];
  assignableMembers: LeadAssignableMember[];
  aiFeaturesEnabled: boolean;
  onClose: () => void;
  onCreateSuccess: (lead: Lead, outcome?: LeadCreateOutcome) => void;
  onCreateCancel: () => void;
  onLeadUpdated: (lead: Lead) => void;
};

export function LeadDetailPanel({
  mode,
  lead,
  initialActivities,
  assignableMembers,
  aiFeaturesEnabled,
  onClose,
  onCreateSuccess,
  onCreateCancel,
  onLeadUpdated,
}: LeadDetailPanelProps) {
  const router = useRouter();
  const timeZone = useCompanyTimezone();
  const [note, setNote] = useState("");
  const [activities, setActivities] = useState(initialActivities);
  const [lostReason, setLostReason] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionWarning, setActionWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOpen = mode !== "empty";

  useEffect(() => {
    setNote("");
    setActionError(null);
    setActionWarning(null);
  }, [lead?.id, mode]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    if (!lead || mode !== "detail") {
      return;
    }

    let cancelled = false;

    void getLeadActivitiesAction(lead.id).then((result) => {
      if (!cancelled && result.activities) {
        setActivities(result.activities);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lead, mode]);

  const title =
    mode === "create"
      ? "New lead"
      : mode === "detail" && lead
        ? formatLeadName(lead)
        : "Lead details";

  const subtitle =
    mode === "create"
      ? "Capture a new opportunity before it becomes a customer"
      : mode === "detail" && lead
        ? formatLeadSource(lead.source)
        : undefined;

  function runAction(action: () => Promise<void>) {
    setActionError(null);
    setActionWarning(null);
    startTransition(action);
  }

  function handleAddNote() {
    if (!lead || !note.trim()) {
      return;
    }

    runAction(async () => {
      const result = await addLeadNoteAction(lead.id, note);
      if (result.error) {
        setActionError(formatActionError(result.error, "We couldn't save the note."));
        return;
      }

      setNote("");
      router.refresh();
    });
  }

  function handleLogCall() {
    if (!lead) return;

    runAction(async () => {
      const result = await logLeadCallAction(lead.id);
      if (result.error || !result.lead) {
        setActionError(formatActionError(result.error, "We couldn't log the call."));
        return;
      }

      onLeadUpdated(result.lead);
      router.refresh();
    });
  }

  function handleLogEmail() {
    if (!lead) return;

    runAction(async () => {
      const result = await logLeadEmailAction(lead.id);
      if (result.error || !result.lead) {
        setActionError(formatActionError(result.error, "We couldn't log the email."));
        return;
      }

      onLeadUpdated(result.lead);
      router.refresh();
    });
  }

  function handleCreateEstimate() {
    if (!lead) return;

    runAction(async () => {
      const result = await prepareLeadEstimateAction(lead.id);
      if (result.error || !result.customerId) {
        setActionError(
          formatActionError(result.error, "We couldn't prepare this estimate."),
        );
        return;
      }

      if (result.warning) {
        setActionWarning(result.warning);
      }

      if (result.lead) {
        onLeadUpdated(result.lead);
      }

      const params = new URLSearchParams({
        customerId: result.customerId,
        create: "1",
        leadId: lead.id,
      });
      router.push(`/estimates?${params.toString()}`);
    });
  }

  function handleConvert() {
    if (!lead) return;

    runAction(async () => {
      const result = await convertLeadToCustomerAction(lead.id);
      if (result.error || !result.lead) {
        setActionError(
          formatActionError(result.error, "We couldn't convert this lead."),
        );
        return;
      }

      if (result.warning) {
        setActionWarning(result.warning);
      }

      onLeadUpdated(result.lead);
      router.refresh();
    });
  }

  function handleMarkWon() {
    if (!lead) return;

    if (shouldPromptConvertOnWon(lead)) {
      const confirmed = window.confirm(
        "This lead is not linked to a customer yet. Convert to customer and mark won?",
      );
      if (!confirmed) {
        return;
      }
    }

    runAction(async () => {
      const result = await markLeadWonAction(
        lead.id,
        shouldPromptConvertOnWon(lead),
      );
      if (result.error || !result.lead) {
        setActionError(formatActionError(result.error, "We couldn't mark this lead won."));
        return;
      }

      onLeadUpdated(result.lead);
      router.refresh();
    });
  }

  function handleMarkLost() {
    if (!lead) return;

    runAction(async () => {
      const result = await markLeadLostAction(
        lead.id,
        lostReason.trim() || undefined,
      );
      if (result.error || !result.lead) {
        setActionError(formatActionError(result.error, "We couldn't mark this lead lost."));
        return;
      }

      onLeadUpdated(result.lead);
      router.refresh();
    });
  }

  return (
    <DesktopConditionalDetailPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      ariaLabel={mode === "create" ? "Create lead" : "Lead details"}
    >
      {mode === "create" ? (
        <LeadForm
          mode="create"
          assignableMembers={assignableMembers}
          onSuccess={onCreateSuccess}
          onCancel={onCreateCancel}
        />
      ) : null}

      {mode === "detail" && lead ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {formatLeadName(lead)}
                </h3>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  {lead.phone ? <p>{lead.phone}</p> : null}
                  {lead.email ? <p>{lead.email}</p> : null}
                </div>
              </div>
              <LeadStatusBadge status={lead.status} />
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Source
                </dt>
                <dd className="mt-1 text-slate-800">{formatLeadSource(lead.source)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Assigned user
                </dt>
                <dd className="mt-1 text-slate-800">
                  {lead.assignedUserName ?? "Unassigned"}
                </dd>
              </div>
            </dl>

            {lead.convertedCustomerId ? (
              <p className="mt-4 text-sm">
                <Link
                  href={`/customers/${lead.convertedCustomerId}`}
                  className="font-medium text-cyan-700 hover:text-cyan-800"
                >
                  View customer record
                </Link>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {lead.phone ? (
              <a href={`tel:${lead.phone}`} className="admin-btn-secondary text-xs">
                <Phone className="mr-1.5 inline h-3.5 w-3.5" />
                Call
              </a>
            ) : null}
            {lead.email ? (
              <a
                href={`mailto:${lead.email}`}
                className="admin-btn-secondary text-xs"
              >
                <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                Email
              </a>
            ) : null}
            <button
              type="button"
              disabled={isPending || isLeadClosed(lead.status)}
              onClick={handleCreateEstimate}
              className="admin-btn-secondary text-xs"
            >
              <FileText className="mr-1.5 inline h-3.5 w-3.5" />
              Create estimate
            </button>
            <button
              type="button"
              disabled={
                isPending ||
                Boolean(lead.convertedCustomerId) ||
                isLeadClosed(lead.status)
              }
              onClick={handleConvert}
              className="admin-btn-secondary text-xs"
            >
              <UserPlus className="mr-1.5 inline h-3.5 w-3.5" />
              Convert to customer
            </button>
            <button
              type="button"
              disabled={isPending || isLeadClosed(lead.status)}
              onClick={handleMarkWon}
              className="admin-btn-secondary text-xs"
            >
              <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />
              Mark won
            </button>
          </div>

          {!isLeadClosed(lead.status) ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Mark lost</span>
                <select
                  value={lostReason}
                  onChange={(event) => setLostReason(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">No reason (optional)</option>
                  {LEAD_LOST_REASON_OPTIONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={isPending}
                onClick={handleMarkLost}
                className="mt-3 admin-btn-secondary text-xs"
              >
                <XCircle className="mr-1.5 inline h-3.5 w-3.5" />
                Mark lost
              </button>
            </div>
          ) : null}

          <LeadFollowUpCard lead={lead} onLeadUpdated={onLeadUpdated} />

          <LeadFollowUpAiAssistant
            leadId={lead.id}
            aiFeaturesEnabled={aiFeaturesEnabled}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Edit lead</h3>
            <div className="mt-4">
              <LeadForm
                mode="edit"
                lead={lead}
                assignableMembers={assignableMembers}
                onSuccess={onLeadUpdated}
                onCancel={() => undefined}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Add note</h3>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="Log a call summary or internal note"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleAddNote}
                className="admin-btn-secondary text-xs"
              >
                Save note
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleLogCall}
                className="admin-btn-secondary text-xs"
              >
                Log call
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleLogEmail}
                className="admin-btn-secondary text-xs"
              >
                Log email
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
            <div className="mt-4">
              <LeadActivityTimeline activities={activities} timeZone={timeZone} />
            </div>
          </div>

          {actionWarning ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {actionWarning}
            </p>
          ) : null}

          {actionError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {actionError}
            </p>
          ) : null}
        </div>
      ) : null}
    </DesktopConditionalDetailPanel>
  );
}
