import type { LeadStatus } from "@/shared/types/lead";

export const LEAD_STATUS_NORTH_STAR_BADGE_STYLES: Record<LeadStatus, string> = {
  new: "bg-[#EFE4CB] text-[#4F4638] ring-[rgba(138,99,36,0.18)]",
  contacted: "bg-[#F1E7D2] text-[#4F4638] ring-[rgba(138,99,36,0.14)]",
  scheduled: "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.14)]",
  estimate_sent: "bg-[rgba(201,164,77,0.18)] text-[#6B5A2E] ring-[rgba(201,164,77,0.28)]",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  lost: "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.12)]",
};
