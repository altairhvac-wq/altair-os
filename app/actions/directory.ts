"use server";

import { redirect } from "next/navigation";
import {
  notifyOwnerOfReview,
  sendConfirmEmail,
  sendManageLinkEmail,
} from "@/lib/directory/emails";
import { manageLinkToken, verifyManageLink } from "@/lib/directory/links";
import {
  confirmListingEmail,
  createListing,
  createListingReport,
  findListingsForEmail,
  getListingRecord,
  getPublicListing,
  removeListing,
  saveListingEdit,
} from "@/lib/directory/listings";
import {
  enforcePublicRateLimit,
  rateLimitMessage,
  resolveRequestAddress,
} from "@/lib/security/public-rate-limit";
import {
  DIRECTORY_LIMITS,
  DIRECTORY_MANAGE_PATH,
  isDirectoryReportReason,
  isValidListingSlug,
  normalizeDirectoryEmail,
  validateListingInput,
  type DirectoryFieldErrors,
} from "@/shared/types/directory";

/**
 * The public directory's Server Actions: list a business, confirm it, edit
 * it, remove it, ask for the manage link again, and report a listing.
 *
 * ============ NOBODY HERE HAS AN ACCOUNT ============
 * So each action is its own boundary, and each proves what it needs to:
 *   - LISTING a business proves nothing about the visitor; it validates the
 *     form, limits the rate per sender and per inbox, and stores a row that
 *     is not public and that the owner has not been told about. Only the
 *     link in the email moves it forward.
 *   - CONFIRMING, EDITING and REMOVING require the signed link from that
 *     email (lib/directory/links.ts). The id and signature are posted with
 *     the form and checked again here; the page having rendered is not
 *     proof of anything.
 *   - Nothing a lister does makes a listing public. Only the owner's
 *     approval does (app/actions/platform-directory.ts).
 *
 * A hidden field no person fills in ("company_website") catches the simplest
 * scripts; they are answered as if it worked.
 *
 * Mail-sending actions treat an unavailable rate limiter as a refusal: a
 * missed "try again in a minute" is a smaller loss than unlimited mail.
 */

const TRAP_FIELD = "company_website";

export type DirectoryFormState = {
  status: "idle" | "error" | "done";
  message?: string;
  errors?: DirectoryFieldErrors;
  /** What was typed, so a form with a mistake in it keeps everything else. */
  values?: Record<string, string>;
};

const FIELD_NAMES = [
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
  "contactEmail",
] as const;

function readValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of FIELD_NAMES) {
    const value = formData.get(name);
    if (typeof value === "string") values[name] = value.slice(0, 600);
  }
  return values;
}

const isTrapped = (formData: FormData) => {
  const value = formData.get(TRAP_FIELD);
  return typeof value === "string" && value.trim() !== "";
};

const UNAVAILABLE = "This is not available right now. Please try again in a few minutes.";

/** "List your business free". Stores the listing and emails the confirmation link. */
export async function submitListingAction(_previous: DirectoryFormState, formData: FormData): Promise<DirectoryFormState> {
  const values = readValues(formData);
  const sent: DirectoryFormState = {
    status: "done",
    message: "Check your email. We sent a link to confirm your listing; it is not public until you press it and we have approved it.",
  };
  if (isTrapped(formData)) return sent;

  const checked = validateListingInput(values);
  const errors: DirectoryFieldErrors = checked.ok ? {} : { ...checked.errors };
  const contactEmail = normalizeDirectoryEmail(values.contactEmail);
  if (!contactEmail) errors.contactEmail = "Enter your email address. It is not shown on the listing.";
  if (formData.get("consent") !== "on") errors.consent = "Tick the box to confirm you may list this business.";
  if (!checked.ok || !contactEmail || Object.keys(errors).length > 0) {
    return { status: "error", message: "Some details need another look. They are marked below.", errors, values };
  }

  const limit = await enforcePublicRateLimit("public.directory_submit", {
    ip: await resolveRequestAddress(),
    email: contactEmail,
  });
  if (!limit.allowed) return { status: "error", message: rateLimitMessage(limit), values };
  if (limit.degraded) return { status: "error", message: UNAVAILABLE, values };

  const created = await createListing(checked.fields, contactEmail);
  if (created.status === "unavailable") return { status: "error", message: UNAVAILABLE, values };

  if (created.status === "exists") {
    // The same business from the same inbox is already confirmed. Send the
    // manage link rather than a second listing, and answer the same way.
    const listings = await findListingsForEmail(contactEmail);
    const mail = listings.length > 0 ? await sendManageLinkEmail(contactEmail, listings) : null;
    if (mail && !mail.ok) return { status: "error", message: "We could not send the email just now. Please try again in a few minutes.", values };
    return {
      status: "done",
      message: "This business is already listed from this email address. We sent you the link to manage it.",
    };
  }

  const mail = await sendConfirmEmail(contactEmail, { id: created.id, businessName: checked.fields.businessName });
  if (!mail.ok) {
    return {
      status: "error",
      message: "We could not send the confirmation email just now. Nothing was published. Please try again in a few minutes.",
      values,
    };
  }
  return sent;
}

function manageUrl(id: string, notice?: string): string {
  return `${DIRECTORY_MANAGE_PATH}?id=${id}&t=${manageLinkToken(id)}${notice ? `&notice=${notice}` : ""}`;
}

async function readManageLink(formData: FormData): Promise<string | null> {
  const id = formData.get("id");
  const token = formData.get("t");
  if (!verifyManageLink(id, token)) return null;
  const limit = await enforcePublicRateLimit("public.token_view", { ip: await resolveRequestAddress() });
  return limit.allowed ? id : null;
}

/** The "Confirm my listing" button on the manage page. */
export async function confirmListingAction(formData: FormData): Promise<void> {
  const id = await readManageLink(formData);
  if (!id) redirect(`${DIRECTORY_MANAGE_PATH}?notice=invalid`);

  const outcome = await confirmListingEmail(id);
  if (outcome === "confirmed") {
    const record = await getListingRecord(id);
    if (record) {
      await notifyOwnerOfReview({
        businessName: record.fields.businessName,
        tradeType: record.fields.tradeType,
        place: `${record.fields.city}, ${record.fields.state}`,
        kind: "new",
      });
    }
  }
  const notice =
    outcome === "confirmed" || outcome === "already" ? "confirmed" : outcome === "unavailable" ? "busy" : "gone";
  redirect(manageUrl(id, notice));
}

/** Saving the edit form on the manage page. */
export async function saveListingEditAction(_previous: DirectoryFormState, formData: FormData): Promise<DirectoryFormState> {
  const values = readValues(formData);
  const id = await readManageLink(formData);
  if (!id) return { status: "error", message: "This link is not valid any more. Open the link from your email again.", values };

  const checked = validateListingInput(values);
  if (!checked.ok) {
    return { status: "error", message: "Some details need another look. They are marked below.", errors: checked.errors, values };
  }

  const saved = await saveListingEdit(id, checked.fields);
  switch (saved.status) {
    case "saved":
      return { status: "done", message: "Saved." };
    case "no_change":
      return { status: "done", message: "Nothing was changed." };
    case "awaiting_review":
      await notifyOwnerOfReview({
        businessName: checked.fields.businessName,
        tradeType: checked.fields.tradeType,
        place: `${checked.fields.city}, ${checked.fields.state}`,
        kind: "edit",
      });
      return {
        status: "done",
        message: "Saved. Your listing keeps showing as it was until we have approved the change, usually within one business day.",
      };
    case "not_allowed":
      return { status: "error", message: "This listing has been removed, so it cannot be edited. List the business again to bring it back.", values };
    case "not_found":
      return { status: "error", message: "We could not find this listing.", values };
    default:
      return { status: "error", message: UNAVAILABLE, values };
  }
}

/** The "Remove my listing" button. Immediate: it is the lister's own listing. */
export async function removeListingAction(formData: FormData): Promise<void> {
  const id = await readManageLink(formData);
  if (!id) redirect(`${DIRECTORY_MANAGE_PATH}?notice=invalid`);
  const outcome = await removeListing(id);
  redirect(manageUrl(id, outcome === "done" ? "removed" : outcome === "not_found" ? "gone" : "busy"));
}

/** "Email me my manage link". Answers the same whether or not the address has a listing. */
export async function requestManageLinkAction(_previous: DirectoryFormState, formData: FormData): Promise<DirectoryFormState> {
  const done: DirectoryFormState = {
    status: "done",
    message: "If there is a listing for that address, we have sent its manage link. Check your inbox in a minute.",
  };
  if (isTrapped(formData)) return done;

  const email = normalizeDirectoryEmail(formData.get("contactEmail"));
  if (!email) {
    return { status: "error", message: "Enter the email address you used for the listing.", errors: { contactEmail: "Enter a valid email address." } };
  }

  const limit = await enforcePublicRateLimit("public.directory_manage_link", {
    ip: await resolveRequestAddress(),
    email,
  });
  if (!limit.allowed) return { status: "error", message: rateLimitMessage(limit) };
  if (limit.degraded) return { status: "error", message: UNAVAILABLE };

  const listings = await findListingsForEmail(email);
  if (listings.length > 0) await sendManageLinkEmail(email, listings);
  return done;
}

export type DirectoryReportState = { status: "idle" | "error" | "done"; message?: string };

/** "Report this listing" on a business page. No reporter identity is kept. */
export async function reportListingAction(_previous: DirectoryReportState, formData: FormData): Promise<DirectoryReportState> {
  const thanks: DirectoryReportState = { status: "done", message: "Thank you. A person will look at this listing." };
  if (isTrapped(formData)) return thanks;

  const slug = formData.get("slug");
  const reason = formData.get("reason");
  const rawNote = formData.get("note");
  if (!isValidListingSlug(slug)) return { status: "error", message: "We could not find this listing." };
  if (!isDirectoryReportReason(reason)) return { status: "error", message: "Choose what is wrong with the listing." };
  const note = (typeof rawNote === "string" ? rawNote : "").replace(/\s+/g, " ").trim().slice(0, DIRECTORY_LIMITS.reportNote.max);

  const limit = await enforcePublicRateLimit("public.directory_report", { ip: await resolveRequestAddress() });
  if (!limit.allowed) return { status: "error", message: rateLimitMessage(limit) };

  const found = await getPublicListing(slug);
  if (!found) return { status: "error", message: "We could not find this listing." };
  const stored = await createListingReport(found.id, reason, note);
  if (!stored) return { status: "error", message: UNAVAILABLE };

  await notifyOwnerOfReview({
    businessName: found.listing.businessName,
    tradeType: found.listing.tradeType,
    place: `${found.listing.city}, ${found.listing.state}`,
    kind: "report",
  });
  return thanks;
}
