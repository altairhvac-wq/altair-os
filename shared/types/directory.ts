/**
 * The public contractor directory: its fields, its rules and its words.
 *
 * ============ ONE SET OF RULES ============
 * The form in the browser, the Server Actions and the database constraints
 * (migration 210) all have to agree on what a listing is. This module is the
 * application's half of that agreement: every value a visitor types is run
 * through `validateListingInput` before it is stored, and the limits here are
 * the same numbers the migration checks. scripts/verify-directory.mjs loads
 * this file and holds the two together.
 *
 * ============ WHAT IS PUBLIC ============
 * `DirectoryPublicListing` is everything a visitor can see about a business.
 * The lister's email address is not in it and never will be: it exists only
 * on the stored row, for the confirmation and manage links.
 *
 * Pure: relative imports only, so the verifier can load it directly.
 */
import { NETWORK_TRADE_CATEGORIES, isNetworkTradeType, type TradeType } from "./network";

export const DIRECTORY_PATH = "/directory";
export const DIRECTORY_LIST_PATH = "/directory/list";
export const DIRECTORY_MANAGE_PATH = "/directory/manage";

export function directoryListingPath(slug: string): string {
  return `${DIRECTORY_PATH}/${slug}`;
}

/** Path segments under /directory that are pages, so no listing may take them as its slug. */
export const DIRECTORY_RESERVED_SLUGS: readonly string[] = ["list", "manage", "search", "new", "admin"];

export const DIRECTORY_TRADES: readonly TradeType[] = NETWORK_TRADE_CATEGORIES;

export const DIRECTORY_LIMITS = {
  businessName: { min: 2, max: 80 },
  city: { min: 2, max: 60 },
  serviceArea: { max: 120 },
  description: { min: 20, max: 400 },
  website: { max: 200 },
  email: { max: 254 },
  reportNote: { max: 500 },
  reviewNote: { max: 500 },
  slug: { min: 3, max: 96 },
} as const;

export const DIRECTORY_PAGE_SIZE = 20;

/** The sentence beside the consent box. Stored with the listing exactly as shown. */
export const DIRECTORY_CONSENT_TEXT =
  "I am authorized to list this business. I understand the details above, except my email address, will be shown publicly on altair-op.com.";

export type DirectoryListingStatus = "pending_email" | "pending_review" | "published" | "rejected" | "removed";

export const DIRECTORY_STATUS_LABELS: Record<DirectoryListingStatus, string> = {
  pending_email: "Waiting for email confirmation",
  pending_review: "Waiting for review",
  published: "Live",
  rejected: "Not published",
  removed: "Removed",
};

export const DIRECTORY_REPORT_REASONS = [
  { value: "wrong_details", label: "The details are wrong" },
  { value: "closed", label: "This business has closed" },
  { value: "not_a_real_business", label: "This is not a real business" },
  { value: "offensive", label: "The listing is offensive" },
  { value: "other", label: "Something else" },
] as const;

export type DirectoryReportReason = (typeof DIRECTORY_REPORT_REASONS)[number]["value"];

export function isDirectoryReportReason(value: unknown): value is DirectoryReportReason {
  return DIRECTORY_REPORT_REASONS.some((reason) => reason.value === value);
}

export const US_STATES: readonly { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

const STATE_CODES: ReadonlySet<string> = new Set(US_STATES.map((state) => state.code));

export function isUsStateCode(value: unknown): value is string {
  return typeof value === "string" && STATE_CODES.has(value);
}

export function stateName(code: string): string {
  return US_STATES.find((state) => state.code === code)?.name ?? code;
}

/** What a visitor sees about a business. No email address. */
export type DirectoryPublicListing = {
  slug: string;
  businessName: string;
  tradeType: TradeType;
  city: string;
  state: string;
  postalCode: string | null;
  serviceArea: string;
  phone: string;
  website: string | null;
  description: string;
  acceptsSubWork: boolean;
  publishedAt: string | null;
};

/** The fields a lister fills in and may later edit (the email is asked once, separately). */
export type DirectoryListingFields = {
  businessName: string;
  tradeType: TradeType;
  city: string;
  state: string;
  postalCode: string | null;
  serviceArea: string;
  phone: string;
  website: string | null;
  description: string;
  acceptsSubWork: boolean;
};

export const DIRECTORY_FIELD_KEYS = [
  "businessName",
  "tradeType",
  "city",
  "state",
  "postalCode",
  "serviceArea",
  "phone",
  "website",
  "description",
  "acceptsSubWork",
] as const satisfies readonly (keyof DirectoryListingFields)[];

export type DirectoryFieldKey = (typeof DIRECTORY_FIELD_KEYS)[number];

/** Plain-language names, for the review screen's "what changed" list. */
export const DIRECTORY_FIELD_LABELS: Record<DirectoryFieldKey, string> = {
  businessName: "Business name",
  tradeType: "Trade",
  city: "City",
  state: "State",
  postalCode: "ZIP code",
  serviceArea: "Service area",
  phone: "Phone",
  website: "Website",
  description: "Description",
  acceptsSubWork: "Takes subcontract work",
};

export type DirectoryFieldErrors = Partial<Record<DirectoryFieldKey | "contactEmail" | "consent", string>>;

/** Collapses runs of whitespace and trims; removes control characters. */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    out += code < 32 || code === 127 ? " " : char;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Keeps line breaks out of single-line fields but allows them in the description. */
function cleanMultiline(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .split(/\r?\n/)
    .map((line) => clean(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Ten digits, or null. Accepts the ways people type a US number, with or without a leading 1. */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/[a-z]/i.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  // Area codes and exchanges never start with 0 or 1.
  if (/^[01]/.test(digits) || /^[01]/.test(digits.slice(3))) return null;
  return digits;
}

export function formatPhone(digits: string): string {
  return /^\d{10}$/.test(digits) ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : digits;
}

/**
 * An https address on a real-looking host, or null. "example.com" becomes
 * "https://example.com"; http is upgraded; anything with a different scheme,
 * credentials, a port or spaces is refused.
 */
export function normalizeWebsite(value: unknown): string | null {
  const raw = clean(value);
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  if (!/^https?:\/\//i.test(withScheme)) return null;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || host.includes("..")) return null;
  const path = url.pathname === "/" ? "" : url.pathname;
  const result = `https://${host}${path}${url.search}`;
  if (/\s/.test(result) || result.length > DIRECTORY_LIMITS.website.max) return null;
  return result;
}

/** The host a visitor sees on the button, without "www.". */
export function websiteLabel(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

export function normalizeDirectoryEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > DIRECTORY_LIMITS.email.max) return null;
  if (!/^[^@\s<>"',;]+@[^@\s<>"',;]+\.[a-z0-9-]{2,}$/.test(email)) return null;
  return email;
}

/** "Acme Heating & Air" in Salt Lake City, UT -> "acme-heating-air-salt-lake-city-ut". */
export function buildListingSlug(businessName: string, city: string, state: string): string {
  const part = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  let slug = [part(businessName), part(city), part(state)].filter(Boolean).join("-");
  if (slug.length > DIRECTORY_LIMITS.slug.max) slug = slug.slice(0, DIRECTORY_LIMITS.slug.max).replace(/-+$/g, "");
  if (slug.length < DIRECTORY_LIMITS.slug.min || DIRECTORY_RESERVED_SLUGS.includes(slug)) slug = `business-${slug || "listing"}`;
  return slug;
}

export function isValidListingSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= DIRECTORY_LIMITS.slug.min &&
    value.length <= DIRECTORY_LIMITS.slug.max &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
  );
}

export type ListingValidation =
  | { ok: true; fields: DirectoryListingFields }
  | { ok: false; errors: DirectoryFieldErrors };

/**
 * Checks and tidies the editable fields. `source` is whatever arrived: form
 * values are strings, a stored pending change is already typed.
 */
export function validateListingInput(source: Record<string, unknown>): ListingValidation {
  const errors: DirectoryFieldErrors = {};
  const L = DIRECTORY_LIMITS;

  const businessName = clean(source.businessName);
  if (businessName.length < L.businessName.min) errors.businessName = "Enter the business name.";
  else if (businessName.length > L.businessName.max) errors.businessName = `Keep the name to ${L.businessName.max} characters.`;
  else if (/https?:\/\/|www\./i.test(businessName)) errors.businessName = "Put the web address in the website box, not the name.";

  const tradeRaw = clean(source.tradeType);
  if (!isNetworkTradeType(tradeRaw)) errors.tradeType = "Choose a trade from the list.";

  const city = clean(source.city);
  if (city.length < L.city.min) errors.city = "Enter the city.";
  else if (city.length > L.city.max) errors.city = `Keep the city to ${L.city.max} characters.`;
  else if (/\d/.test(city)) errors.city = "Enter the city name only. The ZIP code has its own box.";

  const state = clean(source.state).toUpperCase();
  if (!isUsStateCode(state)) errors.state = "Choose a state.";

  const postalRaw = clean(source.postalCode);
  const postalCode = postalRaw === "" ? null : postalRaw;
  if (postalCode !== null && !/^\d{5}$/.test(postalCode)) errors.postalCode = "Enter a five-digit ZIP code, or leave it blank.";

  const serviceArea = clean(source.serviceArea);
  if (serviceArea.length > L.serviceArea.max) errors.serviceArea = `Keep the service area to ${L.serviceArea.max} characters.`;

  const phone = normalizePhone(typeof source.phone === "string" ? source.phone : "");
  if (!phone) errors.phone = "Enter a ten-digit US phone number.";

  const websiteRaw = clean(source.website);
  const website = websiteRaw === "" ? null : normalizeWebsite(websiteRaw);
  if (websiteRaw !== "" && website === null) errors.website = "Enter a web address like yourcompany.com, or leave it blank.";

  const description = cleanMultiline(source.description);
  if (description.length < L.description.min) errors.description = `Describe the work you do in at least ${L.description.min} characters.`;
  else if (description.length > L.description.max) errors.description = `Keep the description to ${L.description.max} characters.`;
  else if (/https?:\/\/|www\./i.test(description)) errors.description = "Leave web addresses out of the description. Use the website box.";

  const acceptsSubWork = source.acceptsSubWork === true || source.acceptsSubWork === "on" || source.acceptsSubWork === "true";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    fields: {
      businessName,
      tradeType: tradeRaw as TradeType,
      city,
      state,
      postalCode,
      serviceArea,
      phone: phone as string,
      website,
      description,
      acceptsSubWork,
    },
  };
}

/** The fields whose values differ, in form order. */
export function changedListingFields(current: DirectoryListingFields, next: DirectoryListingFields): DirectoryFieldKey[] {
  return DIRECTORY_FIELD_KEYS.filter((key) => current[key] !== next[key]);
}

export type DirectorySearch = {
  trade: TradeType | null;
  state: string | null;
  place: string | null;
  subOnly: boolean;
  page: number;
};

/** Reads the search from the address bar. Anything unrecognised is dropped, never passed on. */
export function parseDirectorySearch(params: Record<string, string | string[] | undefined>): DirectorySearch {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const tradeRaw = clean(first(params.trade));
  const stateRaw = clean(first(params.state)).toUpperCase();
  const place = clean(first(params.place)).slice(0, DIRECTORY_LIMITS.city.max);
  const pageRaw = Number.parseInt(first(params.page), 10);
  return {
    trade: isNetworkTradeType(tradeRaw) ? tradeRaw : null,
    state: isUsStateCode(stateRaw) ? stateRaw : null,
    place: place.length >= 2 ? place : null,
    subOnly: first(params.sub) === "1",
    page: Number.isFinite(pageRaw) && pageRaw >= 1 && pageRaw <= 500 ? pageRaw : 1,
  };
}

/** The address for a search, with only the parts that are set. */
export function directorySearchHref(search: Partial<DirectorySearch>): string {
  const params = new URLSearchParams();
  if (search.trade) params.set("trade", search.trade);
  if (search.place) params.set("place", search.place);
  if (search.state) params.set("state", search.state);
  if (search.subOnly) params.set("sub", "1");
  if (search.page && search.page > 1) params.set("page", String(search.page));
  const query = params.toString();
  return query ? `${DIRECTORY_PATH}?${query}` : DIRECTORY_PATH;
}

export function hasActiveSearch(search: DirectorySearch): boolean {
  return Boolean(search.trade || search.state || search.place || search.subOnly);
}
