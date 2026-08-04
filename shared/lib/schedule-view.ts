export type ScheduleViewMode = "week" | "month";

/** Parse `?view=` — week is the default when missing or unrecognized. */
export function parseScheduleViewSearchParam(
  value: string | undefined,
): ScheduleViewMode {
  return value === "month" ? "month" : "week";
}
