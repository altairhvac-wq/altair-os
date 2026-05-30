import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  parseCompanyDemoDataSettings,
  serializeCompanyDemoDataSettings,
} from "@/shared/lib/demo-data-settings";
import type {
  CompanyDemoDataSettings,
  DemoDataStatus,
} from "@/shared/types/demo-data";

const DEMO_DATA_VERSION = 1;

async function countNonDemoRows(
  table:
    | "customers"
    | "jobs"
    | "estimates"
    | "invoices",
  companyId: string,
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_demo", false);

  if (error) {
    console.error(`[demo-data] ${table} count failed:`, {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

async function countDemoRows(
  table: "customers" | "jobs",
  companyId: string,
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_demo", true);

  if (error) {
    console.error(`[demo-data] demo ${table} count failed:`, {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function getDemoDataStatus(
  companyId: string,
  context: ActiveCompanyContext,
): Promise<DemoDataStatus> {
  const [
    realCustomerCount,
    realJobCount,
    realEstimateCount,
    realInvoiceCount,
    demoCustomerCount,
    demoJobCount,
  ] = await Promise.all([
    countNonDemoRows("customers", companyId),
    countNonDemoRows("jobs", companyId),
    countNonDemoRows("estimates", companyId),
    countNonDemoRows("invoices", companyId),
    countDemoRows("customers", companyId),
    countDemoRows("jobs", companyId),
  ]);

  const settingsMarker = parseCompanyDemoDataSettings(context.company.settings);
  const hasDemoData =
    settingsMarker !== null || demoCustomerCount > 0 || demoJobCount > 0;
  const isEligibleForSeed =
    !hasDemoData &&
    realCustomerCount === 0 &&
    realJobCount === 0 &&
    realEstimateCount === 0 &&
    realInvoiceCount === 0;

  return {
    hasDemoData,
    isEligibleForSeed,
    seededAt: settingsMarker?.seededAt ?? null,
    realCustomerCount,
    realJobCount,
    realEstimateCount,
    realInvoiceCount,
  };
}

export async function markCompanyDemoDataSeeded(
  companyId: string,
  context: ActiveCompanyContext,
  seededBy: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const demoData: CompanyDemoDataSettings = {
    version: DEMO_DATA_VERSION,
    seededAt: new Date().toISOString(),
    seededBy,
  };
  const nextSettings = serializeCompanyDemoDataSettings(
    context.company.settings,
    demoData,
  );

  const { error } = await supabase
    .from("companies")
    .update({ settings: nextSettings })
    .eq("id", companyId);

  if (error) {
    console.error("[demo-data] mark seeded failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function clearCompanyDemoData(
  companyId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("clear_company_demo_data", {
    p_company_id: companyId,
  });

  if (error) {
    console.error("[demo-data] clear RPC failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function resolveDemoTechnicianId(
  companyId: string,
  fallbackUserId: string,
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", "technician")
    .eq("status", "active")
    .not("user_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[demo-data] technician lookup failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return fallbackUserId;
  }

  return data?.user_id ?? fallbackUserId;
}
