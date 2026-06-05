import {
  getCompanyTimeZone,
  getDateOnlyInTimeZone,
  getDayBoundsInTimeZone,
  parseDateInput,
} from "@/shared/lib/datetime";
import type { Lead, LeadSortField, LeadStatus } from "@/shared/types/lead";
import { formatLeadActivityLabel } from "@/shared/types/lead-activity";

const STATUS_RANK: Record<LeadStatus, number> = {
  new: 0,
  contacted: 1,
  scheduled: 2,
  estimate_sent: 3,
  won: 4,
  lost: 5,
};

export const LEAD_STATUS_BADGE_STYLES: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-600/20",
  contacted: "bg-violet-50 text-violet-700 ring-violet-600/20",
  scheduled: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  estimate_sent: "bg-amber-50 text-amber-700 ring-amber-600/20",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  lost: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function compareLeadsByField(
  left: Lead,
  right: Lead,
  field: LeadSortField,
): number {
  switch (field) {
    case "status":
      return STATUS_RANK[left.status] - STATUS_RANK[right.status];
    case "nextFollowUpAt": {
      const leftTime = left.nextFollowUpAt
        ? Date.parse(left.nextFollowUpAt)
        : Number.POSITIVE_INFINITY;
      const rightTime = right.nextFollowUpAt
        ? Date.parse(right.nextFollowUpAt)
        : Number.POSITIVE_INFINITY;
      return leftTime - rightTime;
    }
    case "createdAt":
    default:
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  }
}

export function getLeadLastActivityLabel(lead: Lead): string {
  if (lead.lastActivityLabel) {
    return lead.lastActivityLabel;
  }

  return "No activity yet";
}

export function getLeadFollowUpDueCutoff(
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): string {
  return getDayBoundsInTimeZone(timeZone, reference).end;
}

export function isLeadFollowUpDue(
  lead: Pick<Lead, "status" | "nextFollowUpAt">,
  reference = new Date(),
  timeZone = getCompanyTimeZone(),
): boolean {
  if (lead.status === "won" || lead.status === "lost") {
    return false;
  }

  if (!lead.nextFollowUpAt) {
    return false;
  }

  const followUpDate = getDateOnlyInTimeZone(
    parseDateInput(lead.nextFollowUpAt),
    timeZone,
  );
  const todayDate = getDateOnlyInTimeZone(reference, timeZone);

  return followUpDate <= todayDate;
}

export function formatLeadFollowUpQueueTitle(
  lead: Pick<Lead, "firstName" | "lastName" | "companyName">,
): string {
  const personName = `${lead.firstName} ${lead.lastName}`.trim();

  if (personName) {
    return `Follow up with ${personName}`;
  }

  if (lead.companyName?.trim()) {
    return `Follow up with ${lead.companyName.trim()} Lead`;
  }

  return "Follow up with lead";
}
