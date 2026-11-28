import "server-only";

import { cache } from "react";
import {
  assertBusinessNumbersAccess,
  assertMatchingCompanyScope,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { mapDatabaseError } from "@/lib/database/errors";
import type { Database } from "@/lib/database/types";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  BUSINESS_NUMBER_FIELDS,
  BUSINESS_NUMBER_KEYS,
  EMPTY_BUSINESS_NUMBERS,
  EMPTY_BUSINESS_SETUP_STATE,
  parseBusinessSetupSteps,
  type BusinessNumberKey,
  type BusinessNumbers,
  type BusinessNumbersPatch,
  type BusinessSetupState,
} from "@/shared/types/business-numbers";

/**
 * Reading and writing a company's business numbers (migration 218).
 *
 * ============ READS ============
 * Through the signed-in person's own session, so row level security decides:
 * an owner or admin gets the row, anyone else gets nothing. A company that
 * has never saved a number has no row, which reads as "all blank".
 *
 * ============ WRITES ============
 * Through the service role, and only after this module has checked that the
 * caller is an owner or admin of exactly this company. Nobody's own session
 * can write the table (the migration revokes it).
 *
 * ============ BEFORE THE MIGRATION HAS RUN ============
 * If the table does not exist yet, a read says so (`available: false`) and a
 * write returns a plain message. No page that includes these numbers may
 * fail because a migration is pending.
 */

type Row = Database["public"]["Tables"]["company_business_numbers"]["Row"];
type RowUpdate = Database["public"]["Tables"]["company_business_numbers"]["Update"];

export type BusinessNumbersRecord = {
  readonly numbers: BusinessNumbers;
  readonly setup: BusinessSetupState;
  /** ISO time of the last save, or null when nothing has been saved. */
  readonly updatedAt: string | null;
};

export type BusinessNumbersLoad = {
  readonly record: BusinessNumbersRecord;
  /** False when the table is not in this database yet (migration 218 pending). */
  readonly available: boolean;
  readonly error: string | null;
};

export const EMPTY_BUSINESS_NUMBERS_RECORD: BusinessNumbersRecord = {
  numbers: EMPTY_BUSINESS_NUMBERS,
  setup: EMPTY_BUSINESS_SETUP_STATE,
  updatedAt: null,
};

export const BUSINESS_NUMBERS_UNAVAILABLE_MESSAGE =
  "Business numbers are not switched on for this workspace yet. Nothing was saved.";

/** How each number is kept: the column, and whether it is money (whole cents). */
const COLUMNS: Readonly<Record<BusinessNumberKey, Exclude<keyof RowUpdate, "service_call_credited" | "setup_steps" | "setup_completed_at" | "setup_dismissed_at" | "updated_by">>> = {
  laborRate: "labor_rate_cents",
  afterHoursMultiplier: "after_hours_multiplier",
  serviceCallFee: "service_call_fee_cents",
  partsMarkupPercent: "parts_markup_percent",
  averageWage: "average_wage_cents",
  payrollBurdenPercent: "payroll_burden_percent",
  billedHoursPerWeek: "billed_hours_per_week",
  unbilledHoursPerWeek: "unbilled_hours_per_week",
  technicianCount: "technician_count",
  monthlyOverhead: "monthly_overhead_cents",
  targetNetMarginPercent: "target_net_margin_percent",
  averageJobRevenue: "average_job_revenue_cents",
  jobVariableCostPercent: "job_variable_cost_percent",
};

function isMoney(key: BusinessNumberKey): boolean {
  return BUSINESS_NUMBER_FIELDS[key].kind === "money";
}

/** PostgREST returns numeric columns as numbers or strings depending on size; accept both. */
function readNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowToRecord(row: Row): BusinessNumbersRecord {
  const numbers: BusinessNumbers = { ...EMPTY_BUSINESS_NUMBERS, serviceCallCredited: row.service_call_credited === true };
  for (const key of BUSINESS_NUMBER_KEYS) {
    const stored = readNumber(row[COLUMNS[key]]);
    numbers[key] = stored === null ? null : isMoney(key) ? stored / 100 : stored;
  }
  return {
    numbers,
    setup: {
      steps: parseBusinessSetupSteps(row.setup_steps),
      completedAt: row.setup_completed_at,
      dismissedAt: row.setup_dismissed_at,
    },
    updatedAt: row.updated_at,
  };
}

function patchToColumns(patch: BusinessNumbersPatch): RowUpdate {
  const columns: RowUpdate = {};
  for (const key of BUSINESS_NUMBER_KEYS) {
    const value = patch[key];
    // Only null clears a number. A key that is absent, or present but
    // undefined (an optional value a caller did not have), changes nothing.
    if (value === undefined) continue;
    columns[COLUMNS[key]] = value === null ? null : isMoney(key) ? Math.round(value * 100) : value;
  }
  if (typeof patch.serviceCallCredited === "boolean") {
    columns.service_call_credited = patch.serviceCallCredited;
  }
  return columns;
}

/** 42P01: no such table. PGRST205: the API does not know the table. Both mean "migration pending". */
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/**
 * The company's business numbers, as the signed-in person may see them.
 * Someone who is not an owner or admin gets blanks (the database returns no
 * row for them); callers that must tell the difference check access first.
 */
export async function getCompanyBusinessNumbers(context: ActiveCompanyContext): Promise<BusinessNumbersLoad> {
  if (assertBusinessNumbersAccess(context)) {
    return { record: EMPTY_BUSINESS_NUMBERS_RECORD, available: true, error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_business_numbers")
    .select("*")
    .eq("company_id", context.company.id)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      return { record: EMPTY_BUSINESS_NUMBERS_RECORD, available: false, error: null };
    }
    console.error("[getCompanyBusinessNumbers] read failed:", { companyId: context.company.id, code: error.code });
    return { record: EMPTY_BUSINESS_NUMBERS_RECORD, available: true, error: mapDatabaseError(error) };
  }

  return { record: data ? rowToRecord(data) : EMPTY_BUSINESS_NUMBERS_RECORD, available: true, error: null };
}

/**
 * Whether this database has the business numbers table (migration 218) and
 * this person may use it. Asks for the company id and nothing else: it is
 * called just to decide whether to offer something, and wages have no
 * business travelling for that.
 */
export async function isBusinessNumbersAvailableFor(context: ActiveCompanyContext): Promise<boolean> {
  if (assertBusinessNumbersAccess(context)) return false;

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_business_numbers")
    .select("company_id")
    .eq("company_id", context.company.id)
    .limit(1);

  if (error && !isMissingTable(error)) {
    console.error("[isBusinessNumbersAvailable] probe failed:", { companyId: context.company.id, code: error.code });
  }
  return !error;
}

/** The same, for the signed-in company, asked once per request (the settings menu asks on every settings page). */
export const isBusinessNumbersAvailable = cache(async function isBusinessNumbersAvailable(): Promise<boolean> {
  const context = await getActiveCompanyContext();
  return context ? isBusinessNumbersAvailableFor(context) : false;
});

/**
 * The active company's business numbers, read once per request however many
 * layouts and pages ask. Null when nobody is signed in to a company.
 */
export const getActiveCompanyBusinessNumbers = cache(async function getActiveCompanyBusinessNumbers(): Promise<BusinessNumbersLoad | null> {
  const context = await getActiveCompanyContext();
  return context ? getCompanyBusinessNumbers(context) : null;
});

export type BusinessSetupPatch = {
  /** Steps to mark, merged into what is stored. */
  readonly steps?: BusinessSetupState["steps"];
  /** Set or clear the finished and dismissed times. Leave undefined to keep them. */
  readonly completedAt?: string | null;
  readonly dismissedAt?: string | null;
};

/**
 * Saves the numbers in `patch` (and nothing else) for this company, creating
 * its row on the first save. `setup` moves the guided setup along in the same
 * write, so a step's numbers and its "done" mark cannot disagree.
 */
export async function saveCompanyBusinessNumbers(
  companyId: string,
  context: ActiveCompanyContext,
  patch: BusinessNumbersPatch,
  setup?: BusinessSetupPatch,
): Promise<{ record: BusinessNumbersRecord | null; error: string | null }> {
  const accessError = assertBusinessNumbersAccess(context);
  if (accessError) {
    return { record: null, error: accessError };
  }

  const scopeError = assertMatchingCompanyScope(context, companyId);
  if (scopeError) {
    return { record: null, error: scopeError };
  }

  const columns = patchToColumns(patch);
  const supabase = createServiceRoleClient();

  if (setup) {
    if (setup.steps && Object.keys(setup.steps).length > 0) {
      // Merge with what is stored, so a step saved earlier is kept. This is a
      // read followed by a write, not one atomic statement: the guided setup
      // saves one step at a time and waits for each, which is what keeps two
      // saves from overlapping.
      const { data: current, error: readError } = await supabase
        .from("company_business_numbers")
        .select("setup_steps")
        .eq("company_id", companyId)
        .maybeSingle();
      if (readError) {
        if (isMissingTable(readError)) return { record: null, error: BUSINESS_NUMBERS_UNAVAILABLE_MESSAGE };
        console.error("[saveCompanyBusinessNumbers] setup read failed:", { companyId, code: readError.code });
        return { record: null, error: mapDatabaseError(readError) };
      }
      columns.setup_steps = { ...parseBusinessSetupSteps(current?.setup_steps), ...parseBusinessSetupSteps(setup.steps) };
    }
    if (setup.completedAt !== undefined) columns.setup_completed_at = setup.completedAt;
    if (setup.dismissedAt !== undefined) columns.setup_dismissed_at = setup.dismissedAt;
  }

  if (Object.keys(columns).length === 0) {
    return { record: null, error: "Nothing to save." };
  }

  const { data, error } = await supabase
    .from("company_business_numbers")
    .upsert({ ...columns, company_id: companyId, updated_by: context.user.id }, { onConflict: "company_id" })
    .select("*")
    .single();

  if (error || !data) {
    if (isMissingTable(error)) return { record: null, error: BUSINESS_NUMBERS_UNAVAILABLE_MESSAGE };
    console.error("[saveCompanyBusinessNumbers] write failed:", { companyId, code: error?.code });
    return { record: null, error: error ? mapDatabaseError(error) : "The numbers could not be saved. Try again." };
  }

  return { record: rowToRecord(data), error: null };
}
