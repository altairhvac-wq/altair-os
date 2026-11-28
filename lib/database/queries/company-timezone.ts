import "server-only";

import type { DbClient } from "@/lib/database/db-client";
import { isMissingDatabaseColumnError } from "@/lib/database/errors";
import { createClient } from "@/lib/supabase/server";
import { isValidIanaTimeZone } from "@/shared/lib/company-timezones";
import {
  isPlaceTimeZone,
  resolveCompanyTimeZone,
  type CompanyTimeZoneFields,
} from "@/shared/lib/datetime";

/**
 * Reading and recording a company's time zone outside the company context.
 *
 * A signed-in page gets the zone from getActiveCompanyContext, which has the
 * whole company row. This module is for the code that does not: background
 * jobs (reminders, the overdue sweep), the customer's approval page, and the
 * moment a company is created.
 *
 * ============ BEFORE MIGRATION 220 HAS RUN ============
 * `companies.timezone_set_at` does not exist yet. Every read here asks for
 * it, and when the database says there is no such column it asks again
 * without it; the zone then resolves exactly as it always has. Every write
 * that needs the column does nothing. Nothing in this file may fail a page
 * or a job because a migration is pending.
 */

/** Both time zone columns. Fails with "no such column" before migration 220. */
export const COMPANY_TIMEZONE_COLUMNS = "timezone, timezone_set_at";
/** What is read instead while the column is missing. */
export const COMPANY_TIMEZONE_COLUMNS_LEGACY = "timezone";

type TimeZoneRead = {
  fields: CompanyTimeZoneFields | null;
  error: { code?: string; message?: string } | null;
};

/**
 * One company's time zone columns, as stored. `fields` is null when the
 * company could not be read; `timezone_set_at` is undefined when the column
 * is not in this database yet.
 */
export async function readCompanyTimeZoneFields(
  client: DbClient,
  companyId: string,
): Promise<TimeZoneRead> {
  const withChoice = await client
    .from("companies")
    .select(COMPANY_TIMEZONE_COLUMNS)
    .eq("id", companyId)
    .maybeSingle();

  if (!withChoice.error) {
    return { fields: withChoice.data ?? null, error: null };
  }

  if (!isMissingDatabaseColumnError(withChoice.error)) {
    return { fields: null, error: withChoice.error };
  }

  const legacy = await client
    .from("companies")
    .select(COMPANY_TIMEZONE_COLUMNS_LEGACY)
    .eq("id", companyId)
    .maybeSingle();

  if (legacy.error) {
    return { fields: null, error: legacy.error };
  }

  return {
    fields: legacy.data ? { timezone: legacy.data.timezone } : null,
    error: null,
  };
}

/**
 * The zone a company runs on, for code with no company context. A company
 * that cannot be read runs on the fallback zone, as it did before.
 */
export async function loadResolvedCompanyTimeZone(
  client: DbClient,
  companyId: string,
  logLabel: string,
): Promise<string> {
  const { fields, error } = await readCompanyTimeZoneFields(client, companyId);

  if (error) {
    console.error(`[${logLabel}] company timezone lookup failed:`, {
      companyId,
      code: error.code,
    });
  }

  return resolveCompanyTimeZone(fields);
}

/**
 * How recently a company must have been made for a time zone detected at
 * sign-up to be written to it. bootstrap_company_for_new_user hands back the
 * caller's existing company when there is one, so the id alone cannot say
 * the company is new (the welcome email uses the same window).
 */
const NEW_COMPANY_WINDOW_MS = 10 * 60 * 1000;

/**
 * Records the time zone the new owner's browser reported when they signed
 * up, as their company's chosen zone. Call it right after a successful
 * company bootstrap, with the owner's own session.
 *
 * Deliberately narrow:
 *   - only a zone this server recognises is written, and never UTC or one
 *     of its aliases (a browser hiding its zone reports those; such a
 *     company starts on the fallback and is asked to confirm, like any
 *     other that has not chosen);
 *   - only a company made in the last few minutes, that nobody has chosen a
 *     zone for (the update is filtered on both, so it can never replace a
 *     choice, and never touch an older company);
 *   - row level security still decides: the caller must be an owner or admin
 *     of the company.
 *
 * Never throws and never blocks sign-up. Before migration 220 it writes
 * nothing, and the company starts on the fallback zone as it always did.
 */
export async function recordDetectedTimeZoneForNewCompany(input: {
  companyId: string;
  detectedTimeZone: string | null | undefined;
}): Promise<void> {
  // Checked here as well as where the value was read: this is the write.
  const detected = readDetectedTimeZone(input.detectedTimeZone);

  if (!detected) {
    return;
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("companies")
      .update({ timezone: detected, timezone_set_at: new Date().toISOString() })
      .eq("id", input.companyId)
      .is("timezone_set_at", null)
      .gte(
        "created_at",
        new Date(Date.now() - NEW_COMPANY_WINDOW_MS).toISOString(),
      );

    if (error && !isMissingDatabaseColumnError(error)) {
      console.warn("[company-timezone] detected zone not recorded", {
        companyId: input.companyId,
        code: error.code,
      });
    }
  } catch (recordError) {
    console.warn("[company-timezone] detected zone not recorded", {
      companyId: input.companyId,
      message: recordError instanceof Error ? recordError.message : "unknown",
    });
  }
}

/**
 * A zone a browser reported (a hidden form field, or what sign-up kept on
 * the user), if it can be used: a zone this server knows, that names a
 * place. Anything else, including UTC, reads as "not known".
 */
export function readDetectedTimeZone(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed &&
    trimmed.length <= 64 &&
    isPlaceTimeZone(trimmed) &&
    isValidIanaTimeZone(trimmed)
    ? trimmed
    : null;
}
