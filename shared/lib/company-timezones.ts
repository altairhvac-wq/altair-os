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

/**
 * What a zone is called on screen. The curated zones have plain names
 * ("Eastern Time (US)"). Any other is named by its city with the full name
 * after it: "Detroit (America/Detroit)", not a bare "America/Detroit".
 */
export function companyTimeZoneLabel(timeZone: string): string {
  const zone = timeZone.trim();
  const curated = COMPANY_TIMEZONE_OPTIONS.find((option) => option.value === zone);
  if (curated) {
    return curated.label;
  }

  const city = zone.split("/").pop()?.replace(/_/g, " ").trim();
  return city && city !== zone ? `${city} (${zone})` : zone;
}

/**
 * Options for a select: the curated list, with every zone passed in kept
 * selectable. Pass each zone the list may need to show (the saved one, the
 * one this browser suggested, the one picked): a zone that is not on the
 * curated list would otherwise vanish from the list the moment another is
 * picked, and could not be picked again.
 */
export function getCompanyTimezoneSelectOptions(
  ...keepSelectable: Array<string | null | undefined>
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [
    ...COMPANY_TIMEZONE_OPTIONS,
  ];
  const extras: Array<{ value: string; label: string }> = [];

  for (const candidate of keepSelectable) {
    const zone = candidate?.trim();
    if (
      zone &&
      !options.some((option) => option.value === zone) &&
      !extras.some((option) => option.value === zone)
    ) {
      extras.push({ value: zone, label: companyTimeZoneLabel(zone) });
    }
  }

  return [...extras, ...options];
}
