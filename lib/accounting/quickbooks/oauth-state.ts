import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "@/lib/integrations/crypto";

/**
 * The QuickBooks sign-in's `state`: proof that the person coming back from
 * Intuit is the owner or admin who pressed Connect, in the same company,
 * within ten minutes.
 *
 * A random nonce goes to Intuit as `state`. The nonce, the company, the user
 * and an expiry go into an HttpOnly cookie, encrypted and authenticated with
 * the integrations key (AES-256-GCM), so it can be neither read nor forged.
 * The callback requires all three to match the signed-in session. The cookie
 * is single use: the callback deletes it.
 *
 * The cookie also carries the exact redirect_uri sent to Intuit. The app is
 * served on two hosts (app.altair-op.com and www.altair-op.com) and the
 * sign-in returns to the host it started on, where this host-only cookie and
 * the session live; Intuit then requires the token exchange to repeat that
 * same redirect_uri, so the callback reads it from here instead of guessing.
 *
 * No table: nothing to clean up, nothing to leak.
 */

export const QUICKBOOKS_STATE_COOKIE = "altair_qbo_oauth";
export const QUICKBOOKS_STATE_TTL_SECONDS = 600;

type StatePayload = {
  readonly n: string;
  readonly c: string;
  readonly u: string;
  readonly e: number;
  readonly r?: string;
};

export function createQuickBooksState(input: { companyId: string; userId: string; redirectUri: string }): {
  state: string;
  cookieValue: string;
} {
  const nonce = randomBytes(24).toString("base64url");
  const payload: StatePayload = {
    n: nonce,
    c: input.companyId,
    u: input.userId,
    e: Date.now() + QUICKBOOKS_STATE_TTL_SECONDS * 1000,
    r: input.redirectUri,
  };
  return { state: nonce, cookieValue: encryptIntegrationSecret(JSON.stringify(payload)) };
}

export type VerifiedQuickBooksState = {
  readonly companyId: string;
  readonly userId: string;
  /** Null only for a cookie written before the redirect_uri was stored. */
  readonly redirectUri: string | null;
};

/** The company and user the sign-in was started for, or null if anything is off. */
export function readQuickBooksState(cookieValue: string | undefined, stateParam: string | null): VerifiedQuickBooksState | null {
  if (!cookieValue || !stateParam) return null;
  let payload: StatePayload;
  try {
    payload = JSON.parse(decryptIntegrationSecret(cookieValue)) as StatePayload;
  } catch {
    return null;
  }
  if (typeof payload?.n !== "string" || typeof payload.c !== "string" || typeof payload.u !== "string" || typeof payload.e !== "number") {
    return null;
  }
  if (payload.e < Date.now()) return null;
  const expected = Buffer.from(payload.n);
  const given = Buffer.from(stateParam);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { companyId: payload.c, userId: payload.u, redirectUri: typeof payload.r === "string" ? payload.r : null };
}
