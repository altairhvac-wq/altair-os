/**
 * What `companies.timezone` holds for a company nobody has set a time zone
 * for: the column's own default (migration 001). It is only ever read
 * together with `timezone_set_at`; by itself it says nothing.
 */
export const LEGACY_DEFAULT_COMPANY_TIMEZONE = "America/New_York";

/** The zone a company runs on until someone chooses one. */
export const DEFAULT_COMPANY_TIMEZONE = "America/Denver";

let activeCompanyTimeZone = DEFAULT_COMPANY_TIMEZONE;

/**
 * The two columns that say what time zone a company is in, as a row of
 * `companies` carries them.
 *
 * `timezone_set_at` (migration 220) is the one source of truth for "has this
 * company chosen its time zone":
 *   - a time: an owner or admin chose the zone in `timezone`, on that day;
 *   - null: nobody has chosen;
 *   - undefined: the column is not in this database yet (migration pending).
 */
export type CompanyTimeZoneFields = {
  timezone?: string | null;
  timezone_set_at?: string | null;
};

export type CompanyTimeZoneChoice =
  /** An owner or admin picked the zone. It is used exactly as stored. */
  | "chosen"
  /** Nobody has picked one. The company runs on the fallback and is asked to confirm. */
  | "unconfirmed"
  /** Migration 220 has not run here: nothing can be recorded, nothing is asked. */
  | "unavailable";

export function getCompanyTimeZoneChoice(
  company?: CompanyTimeZoneFields | null,
): CompanyTimeZoneChoice {
  if (!company || company.timezone_set_at === undefined) {
    return "unavailable";
  }

  return company.timezone_set_at ? "chosen" : "unconfirmed";
}

/**
 * Whether a zone a browser reported is worth offering as "where this shop
 * is". UTC and its aliases are not: a browser reports them when it hides its
 * real zone (privacy settings, some locked-down work computers), not because
 * a service company keeps its day in Greenwich. Offering one, or recording
 * it at sign-up, would move a company's whole day by hours with nobody
 * having picked it. Such a browser is treated as "zone not known".
 */
export function isPlaceTimeZone(zone: string | null | undefined): boolean {
  const trimmed = zone?.trim();
  if (!trimmed) {
    return false;
  }

  return !/^(utc|gmt|uct|universal|zulu|greenwich|etc\/.*|gmt[+-]?\d*)$/i.test(trimmed);
}

export function getBrowserTimeZone(): string | undefined {
  // Only meaningful in a real browser. On the server this resolves to the
  // HOST's timezone (UTC on Vercel), which made SSR output disagree with the
  // client render and caused React hydration errors (#418) on every page for
  // companies without an explicit timezone.
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * The time zone a company runs on, from its row in `companies`.
 *
 * ============ THE RULE ============
 *   - Chosen (`timezone_set_at` is a time): the stored zone, whatever it is.
 *     Eastern is an ordinary choice.
 *   - Never chosen: what the company has always run on. A row still holding
 *     the column default runs on Mountain Time; a row holding anything else
 *     runs on that.
 *   - Column not here yet: the same as "never chosen", so nothing changes
 *     for anyone until migration 220 has run.
 *
 * ============ CALL IT ONCE, ON A ROW ============
 * This takes the ROW (both columns), never a bare zone name: a name alone
 * cannot say whether it was chosen. Resolve once where the row is read (the
 * company context, or a background job's own lookup) and pass the answer
 * on. Code that already holds a resolved zone uses it as it is; resolving a
 * second time is how "picked Eastern, got Mountain" happened.
 *
 * IMPORTANT: this must resolve IDENTICALLY on the server and the client for
 * the same inputs: rendered dates and times feed server-rendered HTML that
 * React hydrates in the browser. Never consult the environment's local
 * timezone here.
 */
export function resolveCompanyTimeZone(
  company?: CompanyTimeZoneFields | null,
): string {
  const stored = company?.timezone?.trim();
  if (!stored) {
    return DEFAULT_COMPANY_TIMEZONE;
  }

  if (company?.timezone_set_at) {
    return stored;
  }

  return stored === LEGACY_DEFAULT_COMPANY_TIMEZONE
    ? DEFAULT_COMPANY_TIMEZONE
    : stored;
}

/**
 * What a save of the company profile should write for the time zone.
 *
 * The profile form always sends its time zone box, whether or not the person
 * touched it. For a company that has never chosen a zone the box shows the
 * fallback (Mountain), so "the form came back with Mountain" is not a choice:
 * someone fixing their phone number must not quietly confirm a zone they
 * never looked at. So:
 *
 *   - the zone sent differs from the one the company runs on: that is a
 *     choice. Store it and mark it chosen.
 *   - it is the same, and was chosen before: nothing to write.
 *   - it is the same, and was never chosen: nothing to write. The company
 *     carries on as it was and is still asked to confirm.
 *   - migration 220 has not run: write the zone alone, as this always did.
 */
export function companyTimeZoneColumnsForProfileSave(
  company: CompanyTimeZoneFields,
  submittedTimeZone: string,
  now: Date = new Date(),
): { timezone?: string; timezone_set_at?: string } {
  if (getCompanyTimeZoneChoice(company) === "unavailable") {
    return { timezone: submittedTimeZone };
  }

  // `company.timezone` comes from the company context: already resolved.
  if (submittedTimeZone === company.timezone) {
    return {};
  }

  return { timezone: submittedTimeZone, timezone_set_at: now.toISOString() };
}

/**
 * Sets the zone the date helpers in this file default to. Takes a zone that
 * has ALREADY been resolved (the company context's `company.timezone`) and
 * uses it as it is.
 */
export function setCompanyTimeZone(timeZone: string): void {
  activeCompanyTimeZone = timeZone?.trim() || DEFAULT_COMPANY_TIMEZONE;
}

export function getCompanyTimeZone(): string {
  return activeCompanyTimeZone;
}

/**
 * Hour of day (0-23) for an instant in a specific timezone. Deterministic for
 * a given (date, timeZone) pair on server and client alike — safe for
 * server-rendered UI like the header greeting.
 */
export function getHourInTimeZone(
  date: Date,
  timeZone: string = getCompanyTimeZone(),
): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date);
    const hour = Number.parseInt(formatted, 10);
    return Number.isNaN(hour) ? date.getHours() : hour;
  } catch {
    return date.getHours();
  }
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
