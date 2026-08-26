import "server-only";

/**
 * The one bearer-token comparison in this codebase.
 *
 * ==================== WHY IT IS SHARED ====================
 * There were two implementations. The Agent Platform bridge compared secrets
 * with a constant-time loop; the cron routes did
 * `authorization === "Bearer " + secret`, an ordinary string comparison that
 * short-circuits on the first differing byte.
 *
 * The practical risk from the cron variant is small — remote timing across the
 * public internet is noisy, and `CRON_SECRET` is high-entropy — but a
 * security-sensitive comparison existing in two versions is the actual defect,
 * because only one of them can be reviewed, fixed, or trusted. This module is
 * the single version.
 *
 * ==================== WHAT CONSTANT-TIME MEANS HERE ====================
 * `timingSafeEqual` requires equal-length buffers, so both values are hashed
 * to a fixed 32 bytes first. That is deliberately better than comparing
 * lengths and returning early, which leaks the length of the configured
 * secret: after hashing, every comparison is over 32 bytes regardless of what
 * was supplied, so neither the length nor any byte of the secret can be
 * refined by measurement.
 */

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time equality for two secrets of any length.
 *
 * Compares SHA-256 digests, so the comparison is always over 32 bytes and
 * reveals nothing about the expected value's length.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) {
    return false;
  }

  const providedDigest = createHash("sha256").update(provided, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();

  return timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Extracts the credential from an `Authorization: Bearer <token>` header.
 * Returns null when the header is absent or is not a Bearer scheme.
 */
export function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) {
    return null;
  }

  const token = authorization.slice(prefix.length).trim();
  return token || null;
}

/**
 * True when the request carries a Bearer credential equal to `expected`.
 *
 * A missing header, a non-Bearer scheme, an empty token, or an unset expected
 * secret all fail closed.
 */
export function isAuthorizedBearerRequest(
  request: Request,
  expected: string | null | undefined,
): boolean {
  if (!expected) {
    return false;
  }

  const provided = readBearerToken(request);
  if (!provided) {
    return false;
  }

  return secretsMatch(provided, expected);
}
