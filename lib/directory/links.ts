import "server-only";

import { timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/lib/email/env";
import { resolveResourceLinkOrigin } from "@/lib/resources/subscribers";
import { hashAuditSubject } from "@/lib/security/public-rate-limit";
import { DIRECTORY_MANAGE_PATH, directoryListingPath } from "@/shared/types/directory";

/**
 * The lister's key to their own listing.
 *
 * A lister has no account and no password. What proves "this is my listing"
 * is the link in the email we sent to the address they gave: it carries the
 * listing's id and a signature of that id made with the server's secret
 * (PUBLIC_RATE_LIMIT_HASH_SECRET, the same one that signs the calculator
 * list links). No token is stored, so there is nothing in the database to
 * steal, and the link in any email we ever sent them keeps working.
 *
 * The id is a random UUID that appears nowhere public: the public pages are
 * addressed by slug, and the public functions do not return it to a browser
 * (the business page uses it only on the server, to file a report).
 *
 * Opening the link changes nothing. Every change is a button on the manage
 * page, and the Server Action behind each button checks the signature again.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN = /^[0-9a-f]{64}$/;

function sign(id: string): string {
  return hashAuditSubject("directory-listing.manage", id);
}

/** True only for a well-formed id carrying the signature this server would make for it. */
export function verifyManageLink(id: unknown, token: unknown): id is string {
  if (typeof id !== "string" || typeof token !== "string") return false;
  if (!UUID.test(id) || !TOKEN.test(token)) return false;
  const expected = Buffer.from(sign(id), "hex");
  const given = Buffer.from(token, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function manageLinkToken(id: string): string {
  return sign(id);
}

/** The manage page for this listing, on the public site. Never built from the request's Host. */
export function buildManageUrl(id: string): string {
  return `${resolveResourceLinkOrigin()}${DIRECTORY_MANAGE_PATH}?id=${id}&t=${sign(id)}`;
}

export function buildPublicListingUrl(slug: string): string {
  return `${resolveResourceLinkOrigin()}${directoryListingPath(slug)}`;
}

/** The owner's review screen. It lives in the signed-in app, not on the public site. */
export function buildReviewUrl(): string {
  const base = (getAppBaseUrl() ?? resolveResourceLinkOrigin()).replace(/\/+$/, "");
  return `${base}/platform/directory`;
}
