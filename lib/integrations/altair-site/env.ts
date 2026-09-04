import "server-only";

import { resolveAppBaseUrl } from "@/lib/email/env";

/**
 * Where the Altair website lives, and who it says published a page.
 *
 * ============ NO CREDENTIAL, BUT STILL CONFIGURATION ============
 * The capability matrix records `requiredEnvVars: []` for `altair_site`, and
 * that stays true: this is our own surface and there is no secret to hold.
 * What it DOES need is an origin, because a canonical URL is an absolute
 * address and getting it wrong points a page's ranking somewhere else.
 *
 * The origin is derived from the app's own base URL by default, so a correct
 * deployment needs no new variable. `ALTAIR_SITE_ORIGIN` overrides it for the
 * case the marketing site is served from a different host than the app.
 *
 * `getMissing…` deliberately reports nothing as missing when the base URL
 * resolves — a provider whose only configuration is derivable is configured,
 * and telling an operator otherwise would put a permanent "not configured"
 * on a card that works.
 */

const SITE_ORIGIN_ENV = "ALTAIR_SITE_ORIGIN";
const PUBLISHER_NAME_ENV = "ALTAIR_SITE_PUBLISHER_NAME";

const DEFAULT_PUBLISHER_NAME = "Altair OS";

export type AltairSiteConfig = {
  /** https origin with no trailing slash. */
  readonly siteOrigin: string;
  /** The Organization name in the page's JSON-LD. */
  readonly publisherName: string;
};

function normalizeOrigin(candidate: string): string | null {
  const trimmed = candidate.trim().replace(/\/+$/g, "");
  // https only. A canonical on http is a downgrade a search engine will
  // either ignore or hold against the page.
  return /^https:\/\/[a-z0-9.-]+$/i.test(trimmed) ? trimmed : null;
}

function resolveSiteOrigin(): string | null {
  const explicit = process.env[SITE_ORIGIN_ENV]?.trim();
  if (explicit) return normalizeOrigin(explicit);

  const base = resolveAppBaseUrl();
  if (base.ok) return normalizeOrigin(base.url);

  return null;
}

/** Env var NAMES missing when the site publisher cannot be configured. */
export function getMissingAltairSiteEnvVars(): string[] {
  return resolveSiteOrigin() ? [] : [SITE_ORIGIN_ENV];
}

export function isAltairSiteConfigured(): boolean {
  return getMissingAltairSiteEnvVars().length === 0;
}

export function getAltairSiteConfig(): AltairSiteConfig {
  const siteOrigin = resolveSiteOrigin();
  if (!siteOrigin) {
    throw new Error(
      `The Altair site publisher is not configured. Missing: ${SITE_ORIGIN_ENV}`,
    );
  }

  return {
    siteOrigin,
    publisherName:
      process.env[PUBLISHER_NAME_ENV]?.trim() || DEFAULT_PUBLISHER_NAME,
  };
}
