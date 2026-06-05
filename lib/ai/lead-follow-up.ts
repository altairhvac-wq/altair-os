import "server-only";

import type { Lead } from "@/shared/types/lead";
import { formatLeadName } from "@/shared/types/lead";

export const LEAD_FOLLOW_UP_AI_FEATURE = "lead_follow_up";

export function prepareLeadFollowUpDraft(lead: Lead): string {
  const leadName = formatLeadName(lead);
  const contactLine = [lead.phone, lead.email].filter(Boolean).join(" · ");

  return [
    `Lead: ${leadName}`,
    contactLine ? `Contact: ${contactLine}` : null,
    lead.notes?.trim() ? `Notes: ${lead.notes.trim()}` : null,
    "",
    "Draft a short, professional follow-up message for this service lead.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
