import { DEFAULT_COMPANY_TIMEZONE } from "@/shared/lib/datetime";

/**
 * Curated IANA zones for company timezone pickers.
 * Validation accepts any valid IANA zone (including values outside this list).
 */
export const COMPANY_TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Phoenix", label: "Arizona (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "America/Anchorage", label: "Alaska (US)" },
  { value: "Pacific/Honolulu", label: "Hawaii (US)" },
  { value: "America/Toronto", label: "Eastern Time (Canada)" },
  { value: "America/Vancouver", label: "Pacific Time (Canada)" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
  { value: "UTC", label: "UTC" },
] as const;

export function isValidIanaTimeZone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeCompanyTimeZone(
  value: unknown,
  fallback: string = DEFAULT_COMPANY_TIMEZONE,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || !isValidIanaTimeZone(trimmed)) {
    return fallback;
  }

  return trimmed;
}

/** Options for a select, ensuring the current company timezone remains selectable. */
export function getCompanyTimezoneSelectOptions(
  currentTimeZone?: string | null,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [
    ...COMPANY_TIMEZONE_OPTIONS,
  ];
  const current = currentTimeZone?.trim();

  if (current && !options.some((option) => option.value === current)) {
    options.unshift({ value: current, label: current });
  }

  return options;
}
