import type { TechnicianTimeState } from "@/shared/types/time-entry";

export function getNorthStarTechnicianTimeStateStyles(
  state: TechnicianTimeState,
): string {
  switch (state) {
    case "clocked_in":
      return "bg-[rgba(5,150,105,0.12)] text-[#047857] ring-[rgba(5,150,105,0.22)]";
    case "on_break":
      return "bg-[rgba(180,83,9,0.10)] text-[#9A3412] ring-[rgba(180,83,9,0.20)]";
    case "working_job":
      return "bg-[rgba(201,164,77,0.14)] text-[#8A6324] ring-[rgba(201,164,77,0.28)]";
    default:
      return "bg-[rgba(138,99,36,0.08)] text-[#6B6255] ring-[rgba(138,99,36,0.16)]";
  }
}

export function getNorthStarEntryStatusStyles(isActive: boolean): string {
  return isActive
    ? "bg-[rgba(201,164,77,0.14)] text-[#8A6324] ring-[rgba(201,164,77,0.28)]"
    : "bg-[rgba(5,150,105,0.10)] text-[#047857] ring-[rgba(5,150,105,0.20)]";
}
