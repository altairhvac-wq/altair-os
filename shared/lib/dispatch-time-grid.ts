import {
  getCompanyTimeZone,
  getDateOnlyInTimeZone,
  getDayBoundsInTimeZone,
} from "@/shared/lib/datetime";
import type { DispatchJob } from "@/shared/types/dispatch";

/**
 * Horizontal pixels per core working hour on the dispatch time axis.
 * Sized so fixed-width start chips have readable spacing across a service day.
 */
export const DISPATCH_CORE_HOUR_WIDTH_PX = 96;

/** Compressed width for hours outside the typical service day. */
export const DISPATCH_SHOULDER_HOUR_WIDTH_PX = 28;

/**
 * @deprecated Prefer DISPATCH_CORE_HOUR_WIDTH_PX — kept as alias for callers.
 */
export const DISPATCH_CORE_HOUR_HEIGHT_PX = DISPATCH_CORE_HOUR_WIDTH_PX;

/**
 * @deprecated Prefer DISPATCH_SHOULDER_HOUR_WIDTH_PX.
 */
export const DISPATCH_SHOULDER_HOUR_HEIGHT_PX = DISPATCH_SHOULDER_HOUR_WIDTH_PX;

/**
 * @deprecated Prefer DISPATCH_CORE_HOUR_WIDTH_PX.
 */
export const DISPATCH_HOUR_HEIGHT_PX = DISPATCH_CORE_HOUR_WIDTH_PX;

/**
 * Fixed chip width — intentionally not derived from job duration.
 * `scheduled_end` is null for nearly all live assignments.
 */
export const DISPATCH_TIME_BLOCK_WIDTH_PX = 152;

/**
 * Fixed chip height — time + job # + type + customer + status.
 * Sized so a single-stack lane lands near ~65–70px with track padding.
 */
export const DISPATCH_TIME_BLOCK_HEIGHT_PX = 58;

/** Typical service-day band shown at full width. */
export const DISPATCH_CORE_START_HOUR = 7;
export const DISPATCH_CORE_END_HOUR = 18;

/** Default visible window when jobs fall inside a typical service day. */
export const DISPATCH_DEFAULT_START_HOUR = 7;
export const DISPATCH_DEFAULT_END_HOUR = 18;

/**
 * Vertical cascade when start chips collide in a row.
 * Stride = chip height + gap so stacked chips never visually overlap.
 */
export const DISPATCH_BLOCK_STACK_GAP_PX = 4;
export const DISPATCH_BLOCK_STACK_OFFSET_PX =
  DISPATCH_TIME_BLOCK_HEIGHT_PX + DISPATCH_BLOCK_STACK_GAP_PX;

/** Vertical padding inside each technician track (chip nearly fills the lane). */
export const DISPATCH_LANE_TRACK_PADDING_Y_PX = 4;

/** Minimum track height when a row has no jobs (matches single-stack lane). */
export const DISPATCH_LANE_EMPTY_MIN_HEIGHT_PX = 66;

export type DispatchDayWindow = {
  startHour: number;
  /** Exclusive end hour (e.g. 18 → axis ends at 6:00 PM). */
  endHour: number;
  totalMinutes: number;
  trackWidthPx: number;
  /**
   * @deprecated Alias of trackWidthPx for transitional callers.
   */
  trackHeightPx: number;
};

export type DispatchHourMark = {
  hour: number;
  label: string;
  leftPx: number;
  /** Slot width for the hour starting at `hour` (shoulder hours are compressed). */
  slotWidthPx: number;
  isShoulder: boolean;
  /**
   * @deprecated Alias of leftPx for transitional callers.
   */
  topPx: number;
  /**
   * @deprecated Alias of slotWidthPx.
   */
  slotHeightPx: number;
};

export type PositionedDispatchBlock = {
  job: DispatchJob;
  /** Minutes from local midnight; null when scheduled_at cannot be parsed. */
  startMinutes: number | null;
  /** Left edge aligns to scheduled start (marker = start, not a duration bar). */
  leftPx: number;
  /** Vertical offset within the lane when chips collide horizontally. */
  topOffsetPx: number;
  stackIndex: number;
  isClamped: boolean;
  /**
   * @deprecated Alias of leftPx (vertical-layout era).
   */
  topPx: number;
  /**
   * @deprecated Alias of topOffsetPx (vertical-layout era used horizontal cascade).
   */
  leftOffsetPx: number;
};

function getZonedTimeParts(
  date: Date,
  timeZone: string,
): { hour: number; minute: number } | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return { hour: hour % 24, minute };
}

export function getMinutesFromMidnightInTimeZone(
  iso: string,
  timeZone: string = getCompanyTimeZone(),
): number | null {
  const date = new Date(iso);
  const parts = getZonedTimeParts(date, timeZone);
  if (!parts) {
    return null;
  }
  return parts.hour * 60 + parts.minute;
}

export function compareDispatchJobsByScheduledStart(
  a: DispatchJob,
  b: DispatchJob,
): number {
  const aMs = Date.parse(a.scheduledDate);
  const bMs = Date.parse(b.scheduledDate);
  const aValid = !Number.isNaN(aMs);
  const bValid = !Number.isNaN(bMs);

  if (aValid && bValid && aMs !== bMs) {
    return aMs - bMs;
  }
  if (aValid !== bValid) {
    return aValid ? -1 : 1;
  }
  return a.jobNumber.localeCompare(b.jobNumber);
}

export function sortDispatchJobsByScheduledStart(
  jobs: DispatchJob[],
): DispatchJob[] {
  return [...jobs].sort(compareDispatchJobsByScheduledStart);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Width of the hour slot that begins at `hour` (e.g. 6 → 6:00–7:00). */
export function getHourSlotWidthPx(hour: number): number {
  if (hour >= DISPATCH_CORE_START_HOUR && hour < DISPATCH_CORE_END_HOUR) {
    return DISPATCH_CORE_HOUR_WIDTH_PX;
  }
  return DISPATCH_SHOULDER_HOUR_WIDTH_PX;
}

/**
 * @deprecated Prefer getHourSlotWidthPx.
 */
export function getHourSlotHeightPx(hour: number): number {
  return getHourSlotWidthPx(hour);
}

export function isShoulderHour(hour: number): boolean {
  return hour < DISPATCH_CORE_START_HOUR || hour >= DISPATCH_CORE_END_HOUR;
}

/** Pixel offset from the left of the track for a minutes-from-midnight value. */
export function getOffsetPxForMinutes(
  minutesFromMidnight: number,
  window: DispatchDayWindow,
): number {
  const windowStart = window.startHour * 60;
  const windowEnd = window.endHour * 60;
  const clamped = clamp(minutesFromMidnight, windowStart, windowEnd);
  let px = 0;
  let cursor = windowStart;

  while (cursor < clamped) {
    const hour = Math.floor(cursor / 60);
    const hourEndMinutes = (hour + 1) * 60;
    const segmentEnd = Math.min(hourEndMinutes, clamped);
    const fraction = (segmentEnd - cursor) / 60;
    px += fraction * getHourSlotWidthPx(hour);
    cursor = segmentEnd;
  }

  return px;
}

export function getTrackWidthPx(startHour: number, endHour: number): number {
  let width = 0;
  for (let hour = startHour; hour < endHour; hour += 1) {
    width += getHourSlotWidthPx(hour);
  }
  return width;
}

/**
 * @deprecated Prefer getTrackWidthPx.
 */
export function getTrackHeightPx(startHour: number, endHour: number): number {
  return getTrackWidthPx(startHour, endHour);
}

/**
 * Resolve the visible ops-day window from assigned jobs' start times.
 * Defaults to 7am–6pm; expands when work starts earlier or later.
 * Hours outside the core band render at compressed shoulder width.
 */
export function resolveDispatchDayWindow(
  jobs: DispatchJob[],
  timeZone: string = getCompanyTimeZone(),
): DispatchDayWindow {
  let earliest = DISPATCH_DEFAULT_START_HOUR * 60;
  let latest = DISPATCH_DEFAULT_END_HOUR * 60;

  for (const job of jobs) {
    const minutes = getMinutesFromMidnightInTimeZone(job.scheduledDate, timeZone);
    if (minutes === null) {
      continue;
    }
    earliest = Math.min(earliest, minutes);
    latest = Math.max(latest, minutes + 30);
  }

  const startHour = clamp(Math.floor(earliest / 60), 0, 23);
  const endHour = clamp(Math.ceil(latest / 60), startHour + 1, 24);
  const totalMinutes = (endHour - startHour) * 60;
  const trackWidthPx = getTrackWidthPx(startHour, endHour);

  return {
    startHour,
    endHour,
    totalMinutes,
    trackWidthPx,
    trackHeightPx: trackWidthPx,
  };
}

export function buildDispatchHourMarks(
  window: DispatchDayWindow,
): DispatchHourMark[] {
  const marks: DispatchHourMark[] = [];

  for (let hour = window.startHour; hour <= window.endHour; hour += 1) {
    const labelDate = new Date(Date.UTC(2020, 0, 1, hour % 24, 0, 0));
    const label = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h12",
      timeZone: "UTC",
    }).format(labelDate);

    const isEndBoundary = hour === window.endHour;
    const leftPx = getOffsetPxForMinutes(hour * 60, window);
    const slotWidthPx = isEndBoundary ? 0 : getHourSlotWidthPx(hour);

    marks.push({
      hour,
      label,
      leftPx,
      slotWidthPx,
      isShoulder: isEndBoundary ? false : isShoulderHour(hour),
      topPx: leftPx,
      slotHeightPx: slotWidthPx,
    });
  }

  return marks;
}

export function getStartLeftPx(
  startMinutes: number,
  window: DispatchDayWindow,
): { leftPx: number; isClamped: boolean } {
  const rawLeft = getOffsetPxForMinutes(startMinutes, window);
  const maxLeft = Math.max(0, window.trackWidthPx - DISPATCH_TIME_BLOCK_WIDTH_PX);
  const leftPx = clamp(rawLeft, 0, maxLeft);
  const windowStart = window.startHour * 60;
  const windowEnd = window.endHour * 60;
  return {
    leftPx,
    isClamped: startMinutes < windowStart || startMinutes > windowEnd,
  };
}

/**
 * @deprecated Prefer getStartLeftPx — vertical-layout era name.
 */
export function getStartTopPx(
  startMinutes: number,
  window: DispatchDayWindow,
): { topPx: number; isClamped: boolean } {
  const { leftPx, isClamped } = getStartLeftPx(startMinutes, window);
  return { topPx: leftPx, isClamped };
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd - 1 && bStart < aEnd - 1;
}

/**
 * Place fixed-width start chips on a horizontal time axis.
 * Colliding chips stack vertically with a full-height stride so text never overlaps.
 */
export function layoutDispatchTimeBlocks(
  jobs: DispatchJob[],
  window: DispatchDayWindow,
  timeZone: string = getCompanyTimeZone(),
): PositionedDispatchBlock[] {
  const sorted = sortDispatchJobsByScheduledStart(jobs);
  /** Per stack row: list of [left, right] occupied ranges. */
  const rowRanges: Array<Array<[number, number]>> = [];
  const positioned: PositionedDispatchBlock[] = [];

  for (const job of sorted) {
    const startMinutes = getMinutesFromMidnightInTimeZone(
      job.scheduledDate,
      timeZone,
    );

    if (startMinutes === null) {
      positioned.push({
        job,
        startMinutes: null,
        leftPx: 0,
        topOffsetPx: 0,
        stackIndex: 0,
        isClamped: true,
        topPx: 0,
        leftOffsetPx: 0,
      });
      continue;
    }

    const { leftPx, isClamped } = getStartLeftPx(startMinutes, window);
    const rightPx = leftPx + DISPATCH_TIME_BLOCK_WIDTH_PX;

    let stackIndex = 0;
    while (stackIndex < rowRanges.length) {
      const occupied = rowRanges[stackIndex]!;
      const collides = occupied.some(([start, end]) =>
        rangesOverlap(leftPx, rightPx, start, end),
      );
      if (!collides) {
        break;
      }
      stackIndex += 1;
    }

    if (!rowRanges[stackIndex]) {
      rowRanges[stackIndex] = [];
    }
    rowRanges[stackIndex]!.push([leftPx, rightPx]);

    const topOffsetPx = stackIndex * DISPATCH_BLOCK_STACK_OFFSET_PX;

    positioned.push({
      job,
      startMinutes,
      leftPx,
      topOffsetPx,
      stackIndex,
      isClamped,
      topPx: leftPx,
      leftOffsetPx: topOffsetPx,
    });
  }

  return positioned;
}

/** Track height for a technician row given its max stack depth. */
export function getLaneTrackHeightPx(maxStackIndex: number): number {
  const stackCount = Math.max(0, maxStackIndex) + 1;
  const contentHeight =
    stackCount * DISPATCH_TIME_BLOCK_HEIGHT_PX +
    Math.max(0, stackCount - 1) * DISPATCH_BLOCK_STACK_GAP_PX;
  return Math.max(
    DISPATCH_LANE_EMPTY_MIN_HEIGHT_PX,
    contentHeight + DISPATCH_LANE_TRACK_PADDING_Y_PX * 2,
  );
}

export function getMaxStackIndex(
  blocks: PositionedDispatchBlock[],
): number {
  let max = 0;
  for (const block of blocks) {
    if (block.startMinutes === null) continue;
    max = Math.max(max, block.stackIndex);
  }
  return max;
}

/** Left offset for a “now” marker within the ops-day track, if now is on this day. */
export function getNowMarkerLeftPx(
  window: DispatchDayWindow,
  options?: { now?: Date; timeZone?: string },
): number | null {
  const now = options?.now ?? new Date();
  const timeZone = options?.timeZone ?? getCompanyTimeZone();
  const bounds = getDayBoundsInTimeZone(timeZone, now);
  const nowMs = now.getTime();
  if (nowMs < Date.parse(bounds.start) || nowMs > Date.parse(bounds.end)) {
    return null;
  }

  const minutes = getMinutesFromMidnightInTimeZone(now.toISOString(), timeZone);
  if (minutes === null) {
    return null;
  }

  const relative = minutes - window.startHour * 60;
  if (relative < 0 || relative > window.totalMinutes) {
    return null;
  }

  return getOffsetPxForMinutes(minutes, window);
}

/**
 * @deprecated Prefer getNowMarkerLeftPx.
 */
export function getNowMarkerTopPx(
  window: DispatchDayWindow,
  options?: { now?: Date; timeZone?: string },
): number | null {
  return getNowMarkerLeftPx(window, options);
}

export function formatDispatchHourLabel(hour: number): string {
  const labelDate = new Date(Date.UTC(2020, 0, 1, hour % 24, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h12",
    timeZone: "UTC",
  }).format(labelDate);
}

export function isScheduledOnOperationalDay(
  scheduledDate: string,
  timeZone: string = getCompanyTimeZone(),
  reference = new Date(),
): boolean {
  return (
    getDateOnlyInTimeZone(new Date(scheduledDate), timeZone) ===
    getDateOnlyInTimeZone(reference, timeZone)
  );
}
