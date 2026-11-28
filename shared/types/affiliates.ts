import { AFFILIATES_PATH } from "@/shared/lib/site/about";
import { isUsStateCode, normalizeDirectoryEmail } from "@/shared/types/directory";

/**
 * The affiliate program: its numbers, the application's fields and the rules
 * that check them (migration 213).
 *
 * ============ ONE PLACE FOR THE NUMBERS ============
 * The public page, the emails and the owner's review screen all read the
 * rates, the tier steps and the payout rules from `AFFILIATE_PROGRAM`, so the
 * page cannot promise one thing while the welcome message says another. The
 * owner approved these on 2026-11-13. Changing one here changes it everywhere
 * it is shown; it does not change what an existing partner was promised.
 *
 * ============ WHAT IS NOT HERE ============
 * No tracking and no payouts. For the first ten partners the owner makes each
 * partner's code in Stripe, reads what each coded customer paid from Stripe
 * once a month, and pays by hand. This module and the table behind it hold
 * applications and the owner's decision on each, and nothing else.
 *
 * Client-safe: no secrets, no server imports.
 */

export { AFFILIATES_PATH };
export const AFFILIATES_REVIEW_PATH = "/platform/affiliates";

export const AFFILIATE_PROGRAM = {
  /** How many founding partners there are places for. */
  foundingPlaces: 10,
  /** Commission is paid on a customer's payments for this many months from their first payment. */
  commissionMonths: 12,
  /** A payment's commission is held this long, so a refund or dispute can cancel it. */
  holdDays: 30,
  /** The day of the month payouts are sent. */
  payoutDayOfMonth: 15,
  /** Smaller balances roll to the next month. */
  minimumPayoutUsd: 50,
  /** A missed code can be claimed by the partner within this many days of the signup. */
  missedCodeClaimDays: 30,
  /** A customer counts toward a tier once they have paid for this many months (or for a year). */
  payingCustomerMonths: 2,
  tiers: [
    { key: "partner", label: "Partner", ratePercent: 30, payingCustomers: 0 },
    { key: "silver", label: "Silver", ratePercent: 35, payingCustomers: 3 },
    { key: "gold", label: "Gold", ratePercent: 40, payingCustomers: 10 },
  ],
} as const;

export type AffiliateTier = (typeof AFFILIATE_PROGRAM.tiers)[number];

/** Dollars and cents with no rounding surprises: 30% of $79 is "$23.70". */
export function formatCommissionUsd(priceUsd: number, ratePercent: number): string {
  const cents = Math.round(priceUsd * ratePercent);
  return `$${(cents / 100).toFixed(2)}`;
}

export const AFFILIATE_PARTNER_TYPES = [
  { value: "coach", label: "Business coach or consultant" },
  { value: "bookkeeper", label: "Bookkeeper or accountant" },
  { value: "media", label: "Podcast or YouTube channel" },
  { value: "educator", label: "Trainer or educator" },
  { value: "agency", label: "Marketing or web agency" },
  { value: "supplier", label: "Supplier or distributor" },
  { value: "contractor", label: "Contractor who knows other owners" },
  { value: "other", label: "Something else" },
] as const;

export type AffiliatePartnerType = (typeof AFFILIATE_PARTNER_TYPES)[number]["value"];

export const AFFILIATE_AUDIENCE_SIZES = [
  { value: "under_500", label: "Under 500" },
  { value: "500_2k", label: "500 to 2,000" },
  { value: "2k_10k", label: "2,000 to 10,000" },
  { value: "10k_50k", label: "10,000 to 50,000" },
  { value: "over_50k", label: "Over 50,000" },
  { value: "clients", label: "I work with clients one to one" },
] as const;

export type AffiliateAudienceSize = (typeof AFFILIATE_AUDIENCE_SIZES)[number]["value"];

export const AFFILIATE_STATUSES = ["new", "approved", "declined"] as const;
export type AffiliateApplicationStatus = (typeof AFFILIATE_STATUSES)[number];

export const AFFILIATE_STATUS_LABELS: Record<AffiliateApplicationStatus, string> = {
  new: "Waiting for you",
  approved: "Approved",
  declined: "Declined",
};

export const AFFILIATE_LIMITS = {
  fullName: { min: 2, max: 80 },
  businessName: { min: 2, max: 100 },
  url: { max: 200 },
  audienceDescription: { min: 20, max: 400 },
  promotionPlan: { min: 20, max: 400 },
  existingPartnerships: { max: 300 },
  reviewNote: { max: 500 },
  partnerCode: { min: 3, max: 20 },
} as const;

/** The sentence beside the box an applicant ticks. Stored with the application as it was shown. */
export const AFFILIATE_RULES_TEXT =
  "I have read the program rules on this page, and I will tell people I earn a commission whenever I recommend Altair Operating System.";

export type AffiliateApplicationFields = {
  fullName: string;
  businessName: string;
  partnerType: AffiliatePartnerType;
  audienceUrl: string;
  linkedinUrl: string | null;
  audienceSize: AffiliateAudienceSize;
  audienceDescription: string;
  promotionPlan: string;
  existingPartnerships: string;
  state: string;
};

export type AffiliateFieldKey = keyof AffiliateApplicationFields | "email" | "rules";
export type AffiliateFieldErrors = Partial<Record<AffiliateFieldKey, string>>;

const PARTNER_TYPES: ReadonlySet<string> = new Set(AFFILIATE_PARTNER_TYPES.map((type) => type.value));
const AUDIENCE_SIZES: ReadonlySet<string> = new Set(AFFILIATE_AUDIENCE_SIZES.map((size) => size.value));

export function isAffiliatePartnerType(value: unknown): value is AffiliatePartnerType {
  return typeof value === "string" && PARTNER_TYPES.has(value);
}

export function isAffiliateAudienceSize(value: unknown): value is AffiliateAudienceSize {
  return typeof value === "string" && AUDIENCE_SIZES.has(value);
}

export function isAffiliateStatus(value: unknown): value is AffiliateApplicationStatus {
  return typeof value === "string" && (AFFILIATE_STATUSES as readonly string[]).includes(value);
}

export function affiliatePartnerTypeLabel(value: string): string {
  return AFFILIATE_PARTNER_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function affiliateAudienceSizeLabel(value: string): string {
  return AFFILIATE_AUDIENCE_SIZES.find((size) => size.value === value)?.label ?? value;
}

export const normalizeAffiliateEmail = normalizeDirectoryEmail;

/** One line of text: trimmed, with runs of whitespace (and any line breaks) made single spaces. */
function oneLine(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** A few sentences: trimmed, line breaks kept, runs of blank lines and spaces collapsed. */
function paragraph(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * A web address a person typed, as an https URL, or null when it is not one.
 * "mychannel.com/show" becomes "https://mychannel.com/show". Only https is
 * ever stored, so the review screen can link to it without a javascript: or
 * data: URL being possible. The database checks the same shape.
 */
export function normalizeAffiliateUrl(value: unknown): string | null {
  const typed = oneLine(value);
  if (typed === "" || typed.length > AFFILIATE_LIMITS.url.max || /\s/.test(typed)) return null;
  const withScheme = /^https?:\/\//i.test(typed) ? typed.replace(/^http:\/\//i, "https://") : `https://${typed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(url.hostname)) return null;
  const normalized = `https://${url.hostname}${url.pathname === "/" ? "" : url.pathname}${url.search}`;
  if (normalized.length > AFFILIATE_LIMITS.url.max || /[\s<>"'`]/.test(normalized)) return null;
  return normalized;
}

function isLinkedInUrl(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

/** A partner's code as the owner types it: capitals and digits, the way it is typed at checkout. */
export function normalizePartnerCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  const { min, max } = AFFILIATE_LIMITS.partnerCode;
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(code) ? code : null;
}

export type AffiliateValidation =
  | { ok: true; fields: AffiliateApplicationFields }
  | { ok: false; errors: AffiliateFieldErrors };

/**
 * Checks what an applicant typed and returns it cleaned, or one plain
 * sentence per field that needs another look. The Server Action runs this on
 * every submission; the database constraints in migration 213 check the same
 * shapes again, so a row that fails here could not be stored anyway.
 */
export function validateAffiliateApplication(input: Record<string, unknown>): AffiliateValidation {
  const L = AFFILIATE_LIMITS;
  const errors: AffiliateFieldErrors = {};

  const fullName = oneLine(input.fullName);
  if (fullName.length < L.fullName.min || fullName.length > L.fullName.max) errors.fullName = "Enter your name.";

  const businessName = oneLine(input.businessName);
  if (businessName.length < L.businessName.min || businessName.length > L.businessName.max) {
    errors.businessName = "Enter the name of your business, channel or show.";
  }

  const partnerType = input.partnerType;
  if (!isAffiliatePartnerType(partnerType)) errors.partnerType = "Choose what you do.";

  const audienceUrl = normalizeAffiliateUrl(input.audienceUrl);
  if (!audienceUrl) errors.audienceUrl = "Enter a link to your site, channel or show, for example yoursite.com.";

  const typedLinkedin = oneLine(input.linkedinUrl);
  const linkedinUrl = typedLinkedin === "" ? null : normalizeAffiliateUrl(typedLinkedin);
  if (typedLinkedin !== "" && (!linkedinUrl || !isLinkedInUrl(linkedinUrl))) {
    errors.linkedinUrl = "Enter your LinkedIn profile link, for example linkedin.com/in/yourname, or leave this empty.";
  }

  const audienceSize = input.audienceSize;
  if (!isAffiliateAudienceSize(audienceSize)) errors.audienceSize = "Choose about how many people you reach.";

  const audienceDescription = paragraph(input.audienceDescription);
  if (audienceDescription.length < L.audienceDescription.min) {
    errors.audienceDescription = "Say a little more about who they are. A sentence or two is enough.";
  } else if (audienceDescription.length > L.audienceDescription.max) {
    errors.audienceDescription = `Keep this under ${L.audienceDescription.max} characters.`;
  }

  const promotionPlan = paragraph(input.promotionPlan);
  if (promotionPlan.length < L.promotionPlan.min) {
    errors.promotionPlan = "Say a little more about how you would tell them. A sentence or two is enough.";
  } else if (promotionPlan.length > L.promotionPlan.max) {
    errors.promotionPlan = `Keep this under ${L.promotionPlan.max} characters.`;
  }

  const existingPartnerships = paragraph(input.existingPartnerships);
  if (existingPartnerships.length > L.existingPartnerships.max) {
    errors.existingPartnerships = `Keep this under ${L.existingPartnerships.max} characters.`;
  }

  const state = typeof input.state === "string" ? input.state.trim().toUpperCase() : "";
  if (!isUsStateCode(state)) errors.state = "Choose your state.";

  if (Object.keys(errors).length > 0 || !isAffiliatePartnerType(partnerType) || !isAffiliateAudienceSize(audienceSize) || !audienceUrl) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    fields: {
      fullName,
      businessName,
      partnerType,
      audienceUrl,
      linkedinUrl,
      audienceSize,
      audienceDescription,
      promotionPlan,
      existingPartnerships,
      state,
    },
  };
}

/**
 * The welcome message the owner sends an approved partner. The review screen
 * shows it for the owner to copy; nothing sends it. Built here so the words
 * and the numbers stay with the program's own.
 */
export function buildPartnerWelcomeMessage(input: { fullName: string; partnerCode: string; siteOrigin: string }): string {
  const [first] = input.fullName.split(" ");
  const [partner, silver, gold] = AFFILIATE_PROGRAM.tiers;
  const link = `${input.siteOrigin}/?utm_source=partner&utm_campaign=${input.partnerCode.toLowerCase()}`;
  return [
    `Hi ${first},`,
    "",
    "You're in. Welcome to the Altair Operating System partner program.",
    "",
    `Your code: ${input.partnerCode}`,
    "Anyone who types it when they add a card gets their first month free, and that is how I know you sent them.",
    "",
    `Your link: ${link}`,
    "The link counts visits. The code is what ties a customer to you, so mention the code every time.",
    "",
    `You earn ${partner.ratePercent}% of what each shop pays for its first ${AFFILIATE_PROGRAM.commissionMonths} months. After ${silver.payingCustomers} paying shops that goes to ${silver.ratePercent}%, and after ${gold.payingCustomers} to ${gold.ratePercent}%.`,
    `I pay on the ${AFFILIATE_PROGRAM.payoutDayOfMonth}th of each month, with a statement showing every customer.`,
    "",
    "One firm rule: say that you earn a commission whenever you recommend it.",
    "",
    "Before your first payout I'll send you the partner agreement to sign and a W-9 form.",
    "",
    "Jeremiah",
  ].join("\n");
}
