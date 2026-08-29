/**
 * Payroll entry badge styles — promoted out of `north-star-m9/` (panel 17,
 * ALTAIR_ARCHITECTURE roadmap) so the canonical Payroll page has no imports
 * from an experiment directory. Values unchanged from the m9 pass; the
 * `north-star-m9/` folder is now unreferenced by the live page and can be
 * deleted in the next on-machine cleanup.
 */

import type { TechnicianTimeState } from "@/shared/types/time-entry";

export function getPayrollTechnicianTimeStateStyles(
  state: TechnicianTimeState,
): string {
  switch (state) {
    case "clocked_in":
      return "bg-[rgba(5,150,105,0.12)] text-[#047857] ring-[rgba(5,150,105,0.22)]";
    case "on_break":
      return "bg-[rgba(180,83,9,0.10)] text-[#9A3412] ring-[rgba(180,83,9,0.20)]";
    case "working_job":
      return "bg-[rgba(194,160,90,0.14)] text-[#77591B] ring-[rgba(194,160,90,0.28)]";
    default:
      return "bg-[rgba(119,89,27,0.08)] text-[#6B6255] ring-[rgba(119,89,27,0.16)]";
  }
}

export function getPayrollEntryStatusStyles(isActive: boolean): string {
  return isActive
    ? "bg-[rgba(194,160,90,0.14)] text-[#77591B] ring-[rgba(194,160,90,0.28)]"
    : "bg-[rgba(5,150,105,0.10)] text-[#047857] ring-[rgba(5,150,105,0.20)]";
}
