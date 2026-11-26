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
/** Where the stop link in the monthly numbers email lands. */
export const DIRECTORY_STATS_EMAIL_PATH = "/directory/manage/monthly-email";

/**
 * The address directory emails come from, as people see it in their inbox
 * (lib/directory/emails.ts sends from "directory" on the RESEND_FROM_EMAIL
 * domain). Shown on the "check your email" screens so a lister knows what to
 * search for, including in Junk: Outlook junked the owner's own confirmation
 * on 2026-11-25 while the sending domain was new.
 */
export const DIRECTORY_EMAIL_FROM = "directory@mail.altair-op.com";

/** One line for every screen that says an email is on its way. */
export const DIRECTORY_JUNK_HINT = `Not in your inbox within a minute? Check your Junk or Spam folder for an email from ${DIRECTORY_EMAIL_FROM}, and mark it "Not junk" so the next ones arrive.`;

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
  /**
   * The business has linked this listing to an Altair workspace that is
   * currently active (migration 211). A yes/no: which workspace is never
   * part of what a visitor, or a member, is given.
   */
  isMember: boolean;
  /**
   * The optional details a business may add (migration 214). Every one is
   * what the business typed and a person approved; empty when not given,
   * and empty before migration 214 is applied.
   */
  details: DirectoryListingDetails;
  /** Approved images only, as full public URLs. Pending images are never here. */
  logoUrl: string | null;
  photoUrls: string[];
  /**
   * Added by Altair with the business's spoken permission and not yet
   * confirmed by the business itself (migration 214). The page then asks
   * "Is this your business? Confirm or edit your listing". Nothing else about
   * how it was added is public.
   */
  awaitingOwnerConfirmation: boolean;
};

// ------------------------------------------------------------------ added with permission (migration 214)

export type DirectoryListingSource = "self_listed" | "added_with_permission";

export const DIRECTORY_PERMISSION_LIMITS = {
  givenBy: { min: 2, max: 120 },
  note: { max: 500 },
  /** How far back the permission date may be. A listing is added soon after the call. */
  maxAgeDays: 365,
} as const;

/** The owner's choice when adding a business. Waiting for the business is the default. */
export type DirectoryPermissionPublish = "wait" | "now";

export type DirectoryPermission = {
  givenBy: string;
  /** YYYY-MM-DD */
  givenAt: string;
  note: string | null;
  publish: DirectoryPermissionPublish;
};

export type DirectoryPermissionErrors = Partial<Record<"givenBy" | "givenAt" | "note" | "publish", string>>;

/** "2026-11-20" -> "November 20, 2026". */
export function formatPermissionDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

/**
 * Checks who gave permission and when. `today` (YYYY-MM-DD) is a parameter
 * so the rule can be tested without a clock: the date cannot be in the
 * future, nor more than a year back.
 */
export function validatePermissionInput(
  source: Record<string, unknown>,
  today: string = new Date().toISOString().slice(0, 10),
): { ok: true; permission: DirectoryPermission } | { ok: false; errors: DirectoryPermissionErrors } {
  const errors: DirectoryPermissionErrors = {};
  const P = DIRECTORY_PERMISSION_LIMITS;
  const givenBy = clean(source.permissionGivenBy);
  if (givenBy.length < P.givenBy.min) errors.givenBy = "Enter the name of the person who said yes.";
  else if (givenBy.length > P.givenBy.max) errors.givenBy = `Keep the name to ${P.givenBy.max} characters.`;
  else if (/https?:\/\/|www\.|@/.test(givenBy)) errors.givenBy = "Enter a person's name only.";

  const givenAt = clean(source.permissionGivenAt);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(givenAt);
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  const valid = date !== null && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === givenAt;
  if (!valid) errors.givenAt = "Enter the date they gave permission.";
  else if (givenAt > today) errors.givenAt = "The date cannot be in the future.";
  else if ((Date.parse(`${today}T00:00:00Z`) - (date as Date).getTime()) / 86_400_000 > P.maxAgeDays)
    errors.givenAt = "Permission older than a year is too old. Call the business again.";

  const note = cleanMultiline(source.permissionNote);
  if (note.length > P.note.max) errors.note = `Keep the note to ${P.note.max} characters.`;

  const publishRaw = source.publish;
  const publish: DirectoryPermissionPublish = publishRaw === "now" ? "now" : "wait";
  if (publishRaw !== undefined && publishRaw !== "now" && publishRaw !== "wait" && publishRaw !== "") errors.publish = "Choose when the listing goes live.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, permission: { givenBy, givenAt, note: note || null, publish } };
}

/** The sentence stored as the listing's consent record for an added listing. */
export function permissionConsentText(permission: Pick<DirectoryPermission, "givenBy" | "givenAt">): string {
  return `Added by Altair Operating System with the spoken permission of ${permission.givenBy}, given ${permission.givenAt}. The business confirms, edits or removes it with the emailed link.`.slice(0, 400);
}

/** The public label for a linked listing. One spelling everywhere. */
export const DIRECTORY_MEMBER_LABEL = "Altair member";

/** What the label means, said plainly wherever it is shown in full. */
export const DIRECTORY_MEMBER_MEANING =
  "This business runs on Altair Operating System. It is not a review or an endorsement.";

/** How many listings one workspace may link. A business has one name, sometimes two or three. */
export const DIRECTORY_CLAIM_LIMIT = 3;

/**
 * A member's own public listing, as Community shows it to them: the public
 * details plus how the listing relates to the workspace they are signed in
 * to. Worked out on the server; only these yes/no facts reach the browser.
 */
export type DirectoryOwnListing = {
  listing: DirectoryPublicListing;
  /** "none": not linked. "this": linked to this workspace. "other": linked to a different workspace. */
  linked: "none" | "this" | "other";
  /** The listing was confirmed with the email this person signs in with, so they may link it. */
  emailMatches: boolean;
  /** Linked to this workspace and the workspace is active, so the public badge is showing. */
  badgeShowing: boolean;
};

// ------------------------------------------------------------------ optional details (migration 214)

/** A day of the week, as stored. */
export const DIRECTORY_DAYS = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
] as const;

export type DirectoryDayKey = (typeof DIRECTORY_DAYS)[number]["key"];

/** Opening hours: each day is closed (null) or open from one time to a later one, 24-hour "HH:MM". */
export type DirectoryHours = Record<DirectoryDayKey, { open: string; close: string } | null>;

export type DirectoryListingDetails = {
  /** Service slugs from `servicesForTrade`. */
  services: string[];
  /** Null: the business did not give its hours. */
  hours: DirectoryHours | null;
  licenseNumber: string | null;
  licenseState: string | null;
  /** Self-declared by the business. Null: not answered. Never checked by us, and labelled so. */
  insured: boolean | null;
  emergencyService: boolean | null;
  yearFounded: number | null;
  serviceRadiusMiles: number | null;
  /** Language codes from DIRECTORY_LANGUAGES. */
  languages: string[];
};

export const EMPTY_DIRECTORY_DETAILS: DirectoryListingDetails = {
  services: [],
  hours: null,
  licenseNumber: null,
  licenseState: null,
  insured: null,
  emergencyService: null,
  yearFounded: null,
  serviceRadiusMiles: null,
  languages: [],
};

export const DIRECTORY_DETAIL_LIMITS = {
  services: { max: 24 },
  languages: { max: 8 },
  licenseNumber: { max: 40 },
  yearFounded: { min: 1850 },
  serviceRadiusMiles: { min: 1, max: 250 },
  photos: { max: 6 },
  /** Bytes, after the browser has resized the image. The server checks again. */
  logoBytes: { max: 1_000_000 },
  photoBytes: { max: 3_000_000 },
} as const;

type Option = { readonly value: string; readonly label: string };

const GENERAL_SERVICES: readonly Option[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "new-construction", label: "New construction" },
  { value: "remodels", label: "Remodels and additions" },
  { value: "repairs", label: "Repairs and service calls" },
  { value: "installations", label: "Installations and replacements" },
  { value: "maintenance-plans", label: "Maintenance plans" },
  { value: "free-estimates", label: "Free estimates" },
  { value: "financing", label: "Financing offered" },
];

const TRADE_SERVICES: Partial<Record<TradeType, readonly Option[]>> = {
  HVAC: [
    { value: "furnaces", label: "Furnaces" },
    { value: "air-conditioning", label: "Air conditioning" },
    { value: "heat-pumps", label: "Heat pumps" },
    { value: "ductless-mini-splits", label: "Ductless mini-splits" },
    { value: "ductwork", label: "Ductwork" },
    { value: "boilers-hydronic", label: "Boilers and hydronic heat" },
    { value: "indoor-air-quality", label: "Indoor air quality" },
    { value: "thermostats-controls", label: "Thermostats and controls" },
    { value: "rooftop-units", label: "Rooftop units" },
    { value: "refrigeration", label: "Commercial refrigeration" },
    { value: "geothermal", label: "Geothermal" },
  ],
  Plumbing: [
    { value: "water-heaters", label: "Water heaters" },
    { value: "drain-cleaning", label: "Drain cleaning" },
    { value: "leak-repair", label: "Leak repair" },
    { value: "repiping", label: "Repiping" },
    { value: "sewer-lines", label: "Sewer lines" },
    { value: "fixtures", label: "Fixtures" },
    { value: "gas-lines", label: "Gas lines" },
    { value: "water-treatment", label: "Water softeners and treatment" },
    { value: "backflow-testing", label: "Backflow testing" },
  ],
  Electrical: [
    { value: "panel-upgrades", label: "Panel upgrades" },
    { value: "wiring", label: "Wiring and rewiring" },
    { value: "lighting", label: "Lighting" },
    { value: "ev-chargers", label: "EV chargers" },
    { value: "generators", label: "Generators" },
    { value: "electrical-troubleshooting", label: "Troubleshooting" },
    { value: "low-voltage", label: "Low voltage" },
  ],
  Roofing: [
    { value: "roof-repair", label: "Roof repair" },
    { value: "roof-replacement", label: "Roof replacement" },
    { value: "gutters", label: "Gutters" },
    { value: "roof-inspections", label: "Roof inspections" },
  ],
  Solar: [
    { value: "solar-installation", label: "Solar installation" },
    { value: "battery-storage", label: "Battery storage" },
    { value: "solar-repair", label: "Solar repair" },
  ],
};

/** What a business of this trade can tick: its trade's own work first, then the general kinds of work. */
export function servicesForTrade(trade: TradeType | null | undefined): readonly Option[] {
  return [...((trade && TRADE_SERVICES[trade]) || []), ...GENERAL_SERVICES];
}

const ALL_SERVICE_LABELS: ReadonlyMap<string, string> = new Map(
  [...GENERAL_SERVICES, ...Object.values(TRADE_SERVICES).flatMap((list) => list ?? [])].map((option) => [option.value, option.label]),
);

export function serviceLabel(value: string): string {
  return ALL_SERVICE_LABELS.get(value) ?? value;
}

export const DIRECTORY_LANGUAGES: readonly Option[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "vi", label: "Vietnamese" },
  { value: "zh", label: "Chinese" },
  { value: "tl", label: "Tagalog" },
  { value: "ko", label: "Korean" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "asl", label: "American Sign Language" },
];

export function languageLabel(value: string): string {
  return DIRECTORY_LANGUAGES.find((option) => option.value === value)?.label ?? value;
}

/** "08:00" -> "8 AM", "13:30" -> "1:30 PM". */
export function formatClock(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === "00" ? `${twelve} ${suffix}` : `${twelve}:${minutes} ${suffix}`;
}

/**
 * Hours as compact lines for a page: runs of days with the same hours are
 * joined ("Mon–Fri  8 AM – 5 PM"). Days not open read "Closed".
 */
export function summarizeHours(hours: DirectoryHours): { days: string; time: string }[] {
  const lines: { days: string; time: string }[] = [];
  let start = 0;
  const label = (day: { open: string; close: string } | null) => (day ? `${formatClock(day.open)} – ${formatClock(day.close)}` : "Closed");
  for (let index = 1; index <= DIRECTORY_DAYS.length; index += 1) {
    const previous = label(hours[DIRECTORY_DAYS[index - 1].key]);
    const current = index < DIRECTORY_DAYS.length ? label(hours[DIRECTORY_DAYS[index].key]) : null;
    if (current !== previous) {
      const first = DIRECTORY_DAYS[start].short;
      const last = DIRECTORY_DAYS[index - 1].short;
      lines.push({ days: first === last ? first : `${first}–${last}`, time: previous });
      start = index;
    }
  }
  return lines;
}

export const DIRECTORY_FIELD_KEYS_BASE = [
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
] as const;

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
  /** Optional since migration 214: empty, or 20 to 400 characters. */
  description: string;
  acceptsSubWork: boolean;
} & DirectoryListingDetails;

export const DIRECTORY_DETAIL_KEYS = [
  "services",
  "hours",
  "licenseNumber",
  "licenseState",
  "insured",
  "emergencyService",
  "yearFounded",
  "serviceRadiusMiles",
  "languages",
] as const satisfies readonly (keyof DirectoryListingDetails)[];

export const DIRECTORY_FIELD_KEYS = [...DIRECTORY_FIELD_KEYS_BASE, ...DIRECTORY_DETAIL_KEYS] as const satisfies readonly (keyof DirectoryListingFields)[];

export type DirectoryFieldKey = (typeof DIRECTORY_FIELD_KEYS)[number];

/** Plain-language names, for the review screen's "what changed" list. */
export const DIRECTORY_FIELD_LABELS: Record<DirectoryFieldKey, string> = {
  businessName: "Business name",
  tradeType: "Trade",
  city: "City",
  state: "State",
  postalCode: "ZIP code",
  serviceArea: "Cities and areas served",
  phone: "Phone",
  website: "Website",
  description: "Description",
  acceptsSubWork: "Takes subcontract work",
  services: "Services",
  hours: "Hours",
  licenseNumber: "License number",
  licenseState: "Licensing state",
  insured: "Insured (their own statement)",
  emergencyService: "Emergency service",
  yearFounded: "Year founded",
  serviceRadiusMiles: "Service radius",
  languages: "Languages",
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
export function validateListingInput(source: Record<string, unknown>, options: { requireDescription?: boolean } = {}): ListingValidation {
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

  // Optional since migration 214: a short first step asks for the essentials
  // only. When it is given it must say something (20 characters or more).
  const description = cleanMultiline(source.description);
  // Before migration 214 the table still requires one (requireDescription).
  if (options.requireDescription && description.length < L.description.min)
    errors.description = `Describe the work you do in at least ${L.description.min} characters.`;
  else if (description.length > 0 && description.length < L.description.min)
    errors.description = `Write at least ${L.description.min} characters, or leave it blank for now.`;
  else if (description.length > L.description.max) errors.description = `Keep the description to ${L.description.max} characters.`;
  else if (/https?:\/\/|www\./i.test(description)) errors.description = "Leave web addresses out of the description. Use the website box.";

  const acceptsSubWork = source.acceptsSubWork === true || source.acceptsSubWork === "on" || source.acceptsSubWork === "true";

  const details = validateListingDetails(source, isNetworkTradeType(tradeRaw) ? tradeRaw : null, isUsStateCode(state) ? state : null);
  Object.assign(errors, details.errors);

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
      ...details.details,
    },
  };
}

/** A list arrives as an array (a stored change) or as comma-separated text (a form). */
function readList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return items.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

/** Yes / no / not answered. A form sends "yes", "no" or ""; a stored change sends true, false or null. */
function readTriState(value: unknown): boolean | null | "invalid" {
  if (value === true || value === "yes") return true;
  if (value === false || value === "no") return false;
  if (value === null || value === undefined || value === "") return null;
  return "invalid";
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Hours arrive as the stored object, or from a form as text:
 * "mon=08:00-17:00;tue=closed;...". A day left out is closed. An empty value
 * means the business did not give its hours.
 */
export function parseHoursInput(value: unknown): DirectoryHours | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const hours = {} as DirectoryHours;
  let anyOpen = false;
  if (typeof value === "string") {
    const parts = new Map<string, string>();
    for (const part of value.split(";")) {
      const [key, time] = part.split("=");
      if (key && time !== undefined) parts.set(key.trim(), time.trim());
    }
    for (const day of DIRECTORY_DAYS) {
      const time = parts.get(day.key) ?? "closed";
      if (time === "closed" || time === "") {
        hours[day.key] = null;
        continue;
      }
      const [open, close] = time.split("-");
      if (!CLOCK.test(open ?? "") || !CLOCK.test(close ?? "") || (open as string) >= (close as string)) return "invalid";
      hours[day.key] = { open: open as string, close: close as string };
      anyOpen = true;
    }
  } else if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const day of DIRECTORY_DAYS) {
      const entry = record[day.key];
      if (entry === null || entry === undefined) {
        hours[day.key] = null;
        continue;
      }
      const open = (entry as { open?: unknown }).open;
      const close = (entry as { close?: unknown }).close;
      if (typeof open !== "string" || typeof close !== "string" || !CLOCK.test(open) || !CLOCK.test(close) || open >= close) return "invalid";
      hours[day.key] = { open, close };
      anyOpen = true;
    }
  } else {
    return "invalid";
  }
  // Seven closed days is the same as not giving hours.
  return anyOpen ? hours : null;
}

/** The form's text encoding of hours, the inverse of `parseHoursInput`. */
export function encodeHours(hours: DirectoryHours | null): string {
  if (!hours) return "";
  return DIRECTORY_DAYS.map((day) => {
    const entry = hours[day.key];
    return `${day.key}=${entry ? `${entry.open}-${entry.close}` : "closed"}`;
  }).join(";");
}

/**
 * The optional details (migration 214). Nothing here is required; anything
 * given must be one of our own choices or a sane value. `currentYear` is a
 * parameter so the rule can be tested without a clock.
 */
export function validateListingDetails(
  source: Record<string, unknown>,
  trade: TradeType | null,
  listingState: string | null,
  currentYear: number = new Date().getUTCFullYear(),
): { details: DirectoryListingDetails; errors: DirectoryFieldErrors } {
  const errors: DirectoryFieldErrors = {};
  const D = DIRECTORY_DETAIL_LIMITS;

  const allowedServices = new Set(servicesForTrade(trade).map((option) => option.value));
  const services = [...new Set(readList(source.services))];
  if (services.some((value) => !allowedServices.has(value))) errors.services = "Choose services from the list.";
  else if (services.length > D.services.max) errors.services = `Choose up to ${D.services.max} services.`;

  const hours = parseHoursInput(source.hours);
  if (hours === "invalid") errors.hours = "Check the hours: each open day needs an opening time before its closing time.";

  const licenseNumber = clean(source.licenseNumber);
  if (licenseNumber && !/^[A-Za-z0-9][A-Za-z0-9 .\-/#]*$/.test(licenseNumber)) errors.licenseNumber = "Use letters, numbers, spaces and - . / # only.";
  else if (licenseNumber.length > D.licenseNumber.max) errors.licenseNumber = `Keep the license number to ${D.licenseNumber.max} characters.`;

  const licenseStateRaw = clean(source.licenseState).toUpperCase();
  let licenseState: string | null = null;
  if (licenseNumber) {
    licenseState = licenseStateRaw || listingState;
    if (!isUsStateCode(licenseState)) errors.licenseState = "Choose the state that issued the license.";
  }

  const insured = readTriState(source.insured);
  if (insured === "invalid") errors.insured = "Choose yes, no, or leave it unanswered.";
  const emergencyService = readTriState(source.emergencyService);
  if (emergencyService === "invalid") errors.emergencyService = "Choose yes, no, or leave it unanswered.";

  const numberOrNull = (value: unknown): number | null | "invalid" => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : /^\s*\d+\s*$/.test(String(value)) ? Number(value) : Number.NaN;
    return Number.isInteger(parsed) ? parsed : "invalid";
  };
  const year = numberOrNull(source.yearFounded);
  if (year === "invalid" || (typeof year === "number" && (year < D.yearFounded.min || year > currentYear)))
    errors.yearFounded = `Enter a year between ${D.yearFounded.min} and ${currentYear}, or leave it blank.`;
  const radius = numberOrNull(source.serviceRadiusMiles);
  if (radius === "invalid" || (typeof radius === "number" && (radius < D.serviceRadiusMiles.min || radius > D.serviceRadiusMiles.max)))
    errors.serviceRadiusMiles = `Enter a number of miles from ${D.serviceRadiusMiles.min} to ${D.serviceRadiusMiles.max}, or leave it blank.`;

  const allowedLanguages = new Set(DIRECTORY_LANGUAGES.map((option) => option.value));
  const languages = [...new Set(readList(source.languages))];
  if (languages.some((value) => !allowedLanguages.has(value))) errors.languages = "Choose languages from the list.";
  else if (languages.length > D.languages.max) errors.languages = `Choose up to ${D.languages.max} languages.`;

  return {
    errors,
    details: {
      // Kept in the catalogue's order, so the page reads the same however they were ticked.
      services: servicesForTrade(trade).map((option) => option.value).filter((value) => services.includes(value)),
      hours: hours === "invalid" ? null : hours,
      licenseNumber: licenseNumber || null,
      licenseState: licenseNumber ? licenseState : null,
      insured: insured === "invalid" ? null : insured,
      emergencyService: emergencyService === "invalid" ? null : emergencyService,
      yearFounded: typeof year === "number" ? year : null,
      serviceRadiusMiles: typeof radius === "number" ? radius : null,
      languages: DIRECTORY_LANGUAGES.map((option) => option.value).filter((value) => languages.includes(value)),
    },
  };
}

/** True when the business has filled in at least one optional detail. */
export function hasAnyDetails(details: DirectoryListingDetails): boolean {
  return (
    details.services.length > 0 ||
    details.hours !== null ||
    details.licenseNumber !== null ||
    details.insured !== null ||
    details.emergencyService !== null ||
    details.yearFounded !== null ||
    details.serviceRadiusMiles !== null ||
    details.languages.length > 0
  );
}

/** The fields whose values differ, in form order. Lists and hours are compared by value. */
export function changedListingFields(current: DirectoryListingFields, next: DirectoryListingFields): DirectoryFieldKey[] {
  return DIRECTORY_FIELD_KEYS.filter((key) => JSON.stringify(current[key] ?? null) !== JSON.stringify(next[key] ?? null));
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

// ------------------------------------------------------------------ place and trade pages (hubs)
//
// ============ THE ADDRESSES ============
//   /directory/ut                          a state
//   /directory/ut/salt-lake-city           a city in that state
//   /directory/ut/salt-lake-city/hvac      one trade in that city
// They live inside the existing /directory/[slug] route, which also serves
// each business. They cannot collide with a business's address: a listing
// slug is at least three characters (DIRECTORY_LIMITS.slug.min, checked in
// the table too), and a state segment is exactly two letters. The city and
// trade pages are deeper paths, which no listing has.
//
// ============ WHEN GOOGLE MAY SEE THEM ============
// A place page with only one or two businesses on it is thin, and thousands
// of near-identical place pages are what search engines call doorway pages.
// So a hub is marked noindex and kept out of the sitemap until it has at
// least DIRECTORY_HUB_INDEX_MIN published listings based there. It is still
// a real, useful page for a visitor who follows a link to it.

/** The one threshold for indexing a place or trade page. */
export const DIRECTORY_HUB_INDEX_MIN = 3;

/** "Salt Lake City" -> "salt-lake-city"; "St. George" -> "st-george". */
export function placeSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function tradeSlug(trade: TradeType): string {
  return placeSlug(trade);
}

export function tradeFromSlug(value: string): TradeType | null {
  return DIRECTORY_TRADES.find((trade) => tradeSlug(trade) === value) ?? null;
}

/** A two-letter state segment, or null. Lower case only, so each state has exactly one address. */
export function stateFromSegment(value: string): string | null {
  if (!/^[a-z]{2}$/.test(value)) return null;
  const code = value.toUpperCase();
  return isUsStateCode(code) ? code : null;
}

export function isPlaceSlug(value: unknown): value is string {
  return typeof value === "string" && value.length >= 2 && value.length <= 64 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

export function directoryStatePath(state: string): string {
  return `${DIRECTORY_PATH}/${state.toLowerCase()}`;
}

export function directoryCityPath(state: string, city: string): string {
  return `${directoryStatePath(state)}/${placeSlug(city)}`;
}

export function directoryCityTradePath(state: string, city: string, trade: TradeType): string {
  return `${directoryCityPath(state, city)}/${tradeSlug(trade)}`;
}

/** One place-and-trade with its number of published listings (based there, not just serving it). */
export type DirectoryFacet = { state: string; city: string; trade: TradeType; count: number };

// ------------------------------------------------------------------ listing owners' numbers (migration 214)

/** What a visitor did on a listing page. The same four words in the route, the table and the email. */
export const DIRECTORY_LISTING_EVENTS = ["view", "call", "website", "directions"] as const;
export type DirectoryListingEvent = (typeof DIRECTORY_LISTING_EVENTS)[number];

export function isDirectoryListingEvent(value: unknown): value is DirectoryListingEvent {
  return typeof value === "string" && (DIRECTORY_LISTING_EVENTS as readonly string[]).includes(value);
}

export type DirectoryListingStats = { views: number; calls: number; website: number; directions: number };

export const DIRECTORY_STATS_LABELS: Record<keyof DirectoryListingStats, string> = {
  views: "Page views",
  calls: "Call taps",
  website: "Website taps",
  directions: "Map taps",
};

// ------------------------------------------------------------------ the "Listed on Altair" badge

export const DIRECTORY_BADGE_PATH = "/badges/listed-on-altair.svg";
export const DIRECTORY_BADGE_ALT = "Listed on Altair Operating System";
export const DIRECTORY_BADGE_SIZE = { width: 200, height: 56 } as const;

/** The snippet a business pastes into its own site: an image that links to its listing. */
export function directoryBadgeSnippet(origin: string, slug: string): string {
  const base = origin.replace(/\/+$/, "");
  return `<a href="${base}${directoryListingPath(slug)}" title="${DIRECTORY_BADGE_ALT}"><img src="${base}${DIRECTORY_BADGE_PATH}" alt="${DIRECTORY_BADGE_ALT}" width="${DIRECTORY_BADGE_SIZE.width}" height="${DIRECTORY_BADGE_SIZE.height}" style="border:0"></a>`;
}
