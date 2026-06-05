/** Legacy SQL/app default before Mountain-first fallback. */
export const LEGACY_DEFAULT_COMPANY_TIMEZONE = "America/New_York";

export const DEFAULT_COMPANY_TIMEZONE = "America/Denver";

let activeCompanyTimeZone = DEFAULT_COMPANY_TIMEZONE;

export function getBrowserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Prefer an explicit company timezone; treat the legacy Eastern default as unset
 * and use the browser zone when available (client), then Mountain Time.
 */
export function resolveCompanyTimeZone(
  companyTimeZone?: string | null,
): string {
  const trimmed = companyTimeZone?.trim();
  if (trimmed && trimmed !== LEGACY_DEFAULT_COMPANY_TIMEZONE) {
    return trimmed;
  }

  const browserTimeZone = getBrowserTimeZone();
  if (browserTimeZone) {
    return browserTimeZone;
  }

  return DEFAULT_COMPANY_TIMEZONE;
}

export function setCompanyTimeZone(timeZone: string): void {
  activeCompanyTimeZone = resolveCompanyTimeZone(timeZone);
}

export function getCompanyTimeZone(): string {
  return activeCompanyTimeZone;
}

export function parseDateInput(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }

  return new Date(value);
}

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(instant);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - instant.getTime();
}

function zonedTimeToUtc(
  dateOnly: string,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
  );
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

export function getDateOnlyInTimeZone(
  date: Date,
  timeZone: string = getCompanyTimeZone(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysToDateOnly(
  dateOnly: string,
  days: number,
  timeZone: string = getCompanyTimeZone(),
): string {
  const anchor = zonedTimeToUtc(dateOnly, 12, 0, 0, 0, timeZone);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return getDateOnlyInTimeZone(anchor, timeZone);
}

export function getDayBoundsInTimeZone(
  timeZone: string = getCompanyTimeZone(),
  reference = new Date(),
): { start: string; end: string } {
  const dateOnly = getDateOnlyInTimeZone(reference, timeZone);
  const start = zonedTimeToUtc(dateOnly, 0, 0, 0, 0, timeZone);
  const end = zonedTimeToUtc(dateOnly, 23, 59, 59, 999, timeZone);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getMonthBoundsInTimeZone(
  timeZone: string = getCompanyTimeZone(),
  reference = new Date(),
): { start: string; end: string } {
  const dateOnly = getDateOnlyInTimeZone(reference, timeZone);
  const [yearStr, monthStr] = dateOnly.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const monthPadded = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${yearStr}-${monthPadded}-01`;
  const endDate = `${yearStr}-${monthPadded}-${String(daysInMonth).padStart(2, "0")}`;

  return {
    start: zonedTimeToUtc(startDate, 0, 0, 0, 0, timeZone).toISOString(),
    end: zonedTimeToUtc(endDate, 23, 59, 59, 999, timeZone).toISOString(),
  };
}

export function isSameCalendarDayInTimeZone(
  left: string | Date,
  right: Date,
  timeZone: string = getCompanyTimeZone(),
): boolean {
  const leftDate = typeof left === "string" ? parseDateInput(left) : left;
  return (
    getDateOnlyInTimeZone(leftDate, timeZone) ===
    getDateOnlyInTimeZone(right, timeZone)
  );
}

export function formatDateInTimeZone(
  date: string | Date,
  timeZone: string = getCompanyTimeZone(),
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  const parsed = parseDateInput(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone,
  }).format(parsed);
}

export function formatDateTimeInTimeZone(
  date: string | Date,
  timeZone: string = getCompanyTimeZone(),
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
): string {
  return formatDateInTimeZone(date, timeZone, options);
}

export function formatTimeInTimeZone(
  date: string | Date,
  timeZone: string = getCompanyTimeZone(),
): string {
  return formatDateInTimeZone(date, timeZone, {
    hour: "numeric",
    minute: "2-digit",
  });
}
