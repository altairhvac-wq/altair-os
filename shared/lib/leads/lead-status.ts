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

/**
 * Lead funnel stage badges.
 *
 * These encode *progression*, not health, so distinct hues are doing real work
 * here: they let you read the shape of the pipeline without reading six labels.
 * Two constraints bound the choice, though.
 *
 * First, a stage may not borrow a semantic tone. `estimate_sent` used to be
 * amber, which after the Prestige remap resolves to the warning ochre
 * (`--altair-warning-foreground`) — the colour this product uses for things
 * that are genuinely late. A healthy pipeline with a third of its leads at
 * "Estimate sent" therefore rendered as a third of the pipeline in trouble.
 * It also disagreed with the estimates ledger, where `sent` is `info` because
 * the document is with the customer and nobody is late yet. Same real event,
 * two tones, one product.
 *
 * Second, there is no sixth hue left to move it to. The Prestige warm remap
 * compressed the cool end of the ramp set, and measuring CIE Lab distance
 * against the five stages already in use, every candidate fails:
 *
 *   teal    dE  8.1 from `new`        (reads as an off-blue)
 *   purple  dE  8.0 from `scheduled`
 *   orange  dE 42.5 clear, but it is the warning family again
 *   cyan    dE 30.3 clear, but it now paints brass — the brand accent
 *
 * A lighter emerald ("approaching the win") clears every other stage but lands
 * dE 10.3 from `won`, and mistaking "Estimate sent" for "Won" misreads closed
 * revenue. So rather than fake a sixth hue, `estimate_sent` shares `info` with
 * `new`: they are ranks 0 and 3, never adjacent in a status-sorted list, their
 * labels are unmistakable, and neither is a health state that could mislead.
 */
export const LEAD_STATUS_BADGE_STYLES: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-600/20",
  contacted: "bg-violet-50 text-violet-700 ring-violet-600/20",
  scheduled: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  estimate_sent: "bg-sky-50 text-sky-700 ring-sky-600/20",
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
