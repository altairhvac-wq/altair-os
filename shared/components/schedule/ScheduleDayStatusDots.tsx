import {
  SCHEDULE_STATUS_DOT_CLASS,
  SCHEDULE_STATUS_MIX_LABEL,
  SCHEDULE_STATUS_MIX_ORDER,
} from "@/shared/lib/schedule-week";
import type { OperationalDayJobCounts } from "@/shared/lib/scheduled-today";

type ScheduleDayStatusDotsProps = {
  counts: OperationalDayJobCounts;
  /** Week strip uses roomier dots; month cells stay compact. */
  size?: "sm" | "md";
};

/**
 * Shared status-mix dots for schedule day cells (week + month).
 * Week view still renders labeled rows separately when density allows.
 */
export function ScheduleDayStatusDots({
  counts,
  size = "md",
}: ScheduleDayStatusDotsProps) {
  const mix = SCHEDULE_STATUS_MIX_ORDER.filter((key) => counts[key] > 0);

  if (mix.length === 0) {
    return null;
  }

  const dotClass =
    size === "sm" ? "h-1 w-1 rounded-full" : "h-1.5 w-1.5 rounded-full";

  return (
    <ul
      className={`flex flex-wrap items-center ${size === "sm" ? "gap-0.5" : "gap-1"}`}
      aria-label="Status mix"
    >
      {mix.map((key) => (
        <li
          key={key}
          title={`${SCHEDULE_STATUS_MIX_LABEL[key]}: ${counts[key]}`}
          className={`${dotClass} ${SCHEDULE_STATUS_DOT_CLASS[key]}`}
        >
          <span className="sr-only">
            {SCHEDULE_STATUS_MIX_LABEL[key]}: {counts[key]}
          </span>
        </li>
      ))}
    </ul>
  );
}
