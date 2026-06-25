"use client";

import Link from "next/link";
import { Bell, Check, Clock, ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  completeWorkflowReminderAction,
  dismissWorkflowReminderAction,
  snoozeWorkflowReminderAction,
  type WorkflowReminderSnoozeDays,
} from "@/app/actions/workflow-reminders";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  DashboardData,
  DashboardWorkflowReminderPreview,
} from "@/shared/types/dashboard";

type WorkflowRemindersSectionProps = {
  snapshot: DashboardData["workflowReminders"];
  canManage: boolean;
  variant?: "default" | "north-star";
};

const SNOOZE_OPTIONS: Array<{ days: WorkflowReminderSnoozeDays; label: string }> =
  [
    { days: 1, label: "1 day" },
    { days: 3, label: "3 days" },
    { days: 7, label: "7 days" },
  ];

function ReminderActions({
  reminderId,
  canManage,
  variant,
  pendingAction,
  onAction,
}: {
  reminderId: string;
  canManage: boolean;
  variant: "default" | "north-star";
  pendingAction: string | null;
  onAction: (
    action: "snooze" | "complete" | "dismiss",
    days?: WorkflowReminderSnoozeDays,
  ) => void;
}) {
  if (!canManage) {
    return null;
  }

  const isPending = pendingAction?.startsWith(`${reminderId}:`) ?? false;
  const actionButtonClass =
    variant === "north-star"
      ? "rounded-md border border-slate-300/80 bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <span className="sr-only">Snooze options</span>
        {SNOOZE_OPTIONS.map((option) => (
          <button
            key={option.days}
            type="button"
            disabled={isPending}
            onClick={() => onAction("snooze", option.days)}
            className={actionButtonClass}
          >
            <Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => onAction("complete")}
        className={actionButtonClass}
      >
        <Check className="mr-1 inline h-3 w-3" aria-hidden="true" />
        Complete
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => onAction("dismiss")}
        className={actionButtonClass}
      >
        <X className="mr-1 inline h-3 w-3" aria-hidden="true" />
        Dismiss
      </button>
    </div>
  );
}

function ReminderRow({
  reminder,
  canManage,
  variant,
  pendingAction,
  onAction,
}: {
  reminder: DashboardWorkflowReminderPreview;
  canManage: boolean;
  variant: "default" | "north-star";
  pendingAction: string | null;
  onAction: (
    action: "snooze" | "complete" | "dismiss",
    days?: WorkflowReminderSnoozeDays,
  ) => void;
}) {
  const rowClass =
    variant === "north-star"
      ? "rounded-lg border border-slate-200/80 bg-white/70 px-3.5 py-3"
      : "rounded-lg border border-slate-200/80 bg-slate-50/40 px-3.5 py-3";

  return (
    <li className={rowClass}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{reminder.title}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {reminder.kindLabel}
            </span>
          </div>
          {reminder.message ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {reminder.message}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>{reminder.ageLabel}</span>
            <span>{reminder.sourceLabel}</span>
            <Link
              href={reminder.openHref}
              className="inline-flex items-center gap-1 font-medium text-cyan-700 hover:text-cyan-800"
            >
              {reminder.openLabel}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ReminderActions
          reminderId={reminder.id}
          canManage={canManage}
          variant={variant}
          pendingAction={pendingAction}
          onAction={onAction}
        />
      </div>
    </li>
  );
}

export function WorkflowRemindersSection({
  snapshot,
  canManage,
  variant = "default",
}: WorkflowRemindersSectionProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return null;
  }

  const countLabel =
    snapshot.totalActiveCount > snapshot.visibleCount
      ? `Showing ${snapshot.visibleCount} of ${snapshot.totalActiveCount}`
      : snapshot.totalActiveCount > 0
        ? `${snapshot.totalActiveCount} active`
        : null;

  const handleAction = (
    reminderId: string,
    action: "snooze" | "complete" | "dismiss",
    days?: WorkflowReminderSnoozeDays,
  ) => {
    if (isPending) {
      return;
    }

    setError(null);
    const pendingKey =
      action === "snooze" && days
        ? `${reminderId}:snooze:${days}`
        : `${reminderId}:${action}`;
    setPendingAction(pendingKey);

    startTransition(async () => {
      let result: { error?: string };

      if (action === "snooze" && days) {
        result = await snoozeWorkflowReminderAction(reminderId, days);
      } else if (action === "complete") {
        result = await completeWorkflowReminderAction(reminderId);
      } else {
        result = await dismissWorkflowReminderAction(reminderId);
      }

      setPendingAction(null);

      if (result.error) {
        setError(formatActionError(result.error, "Could not update this reminder."));
        return;
      }

      router.refresh();
    });
  };

  const shellClass =
    variant === "north-star"
      ? `${t.footerPanel} overflow-hidden`
      : "admin-card overflow-hidden";

  const headerClass =
    variant === "north-star"
      ? `border-b ${t.columnDivider} px-4 py-3.5 sm:px-5`
      : "admin-section-header flex min-w-0 items-start justify-between gap-2 border-b border-slate-200/70";

  return (
    <section className={shellClass} aria-label="Workflow reminders">
      <div className={headerClass}>
        <div className="flex min-w-0 items-start gap-2">
          <div
            className={
              variant === "north-star"
                ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100"
                : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm ring-1 ring-slate-200/70"
            }
          >
            <Bell
              className={
                variant === "north-star"
                  ? "h-3.5 w-3.5 text-slate-600"
                  : "h-3.5 w-3.5 text-slate-600"
              }
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <h2
              className={
                variant === "north-star"
                  ? `text-sm font-semibold ${t.workspaceSubheading}`
                  : "admin-heading-section"
              }
            >
              Workflow reminders
            </h2>
            <p
              className={
                variant === "north-star" ? t.lightSurfaceMuted : "admin-text-helper"
              }
            >
              Saved follow-ups Altair is tracking for your office.
            </p>
            {countLabel ? (
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {countLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={variant === "north-star" ? "px-4 py-4 sm:px-5" : "admin-card-body"}>
        {error ? (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </p>
        ) : null}

        {snapshot.reminders.length === 0 ? (
          <p className="text-sm text-slate-600">No active workflow reminders.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {snapshot.reminders.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                canManage={canManage}
                variant={variant}
                pendingAction={pendingAction}
                onAction={(action, days) =>
                  handleAction(reminder.id, action, days)
                }
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
