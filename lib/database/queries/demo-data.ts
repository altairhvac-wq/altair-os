import { createClient } from "@/lib/supabase/server";
import { mapDemoDataError } from "@/lib/database/errors";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  parseCompanyDemoDataSettings,
  serializeCompanyDemoDataSettings,
} from "@/shared/lib/demo-data-settings";
import type {
  CompanyDemoDataSettings,
  DemoDataStatus,
} from "@/shared/types/demo-data";

const DEMO_DATA_VERSION = 3;

type DemoCountableTable =
  | "customers"
  | "jobs"
  | "estimates"
  | "invoices";

async function countCompanyRows(
  table: DemoCountableTable,
  companyId: string,
  options: { demoOnly?: boolean } = {},
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (options.demoOnly) {
    query = query.eq("is_demo", true);
  }

  const { count, error } = await query;

  if (error) {
    console.error(`[demo-data] ${table} count failed:`, {
      companyId,
      demoOnly: options.demoOnly ?? false,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

async function fetchCompanySettingsMarker(
  companyId: string,
): Promise<CompanyDemoDataSettings | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("settings")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[demo-data] company settings lookup failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return parseCompanyDemoDataSettings(data?.settings);
}

async function countDemoRows(
  table: DemoCountableTable,
  companyId: string,
): Promise<number> {
  return countCompanyRows(table, companyId, { demoOnly: true });
}

export async function getDemoDataStatus(
  companyId: string,
  _context?: ActiveCompanyContext,
): Promise<DemoDataStatus> {
  const [
    totalCustomerCount,
    totalJobCount,
    totalEstimateCount,
    totalInvoiceCount,
    demoCustomerCount,
    demoJobCount,
    demoEstimateCount,
    demoInvoiceCount,
    settingsMarker,
  ] = await Promise.all([
    countCompanyRows("customers", companyId),
    countCompanyRows("jobs", companyId),
    countCompanyRows("estimates", companyId),
    countCompanyRows("invoices", companyId),
    countDemoRows("customers", companyId),
    countDemoRows("jobs", companyId),
    countDemoRows("estimates", companyId),
    countDemoRows("invoices", companyId),
    fetchCompanySettingsMarker(companyId),
  ]);

  const hasDemoData =
    settingsMarker !== null ||
    demoCustomerCount > 0 ||
    demoJobCount > 0 ||
    demoEstimateCount > 0 ||
    demoInvoiceCount > 0;
  const canSetupDemoData = !hasDemoData;

  const realCustomerCount = Math.max(0, totalCustomerCount - demoCustomerCount);
  const realJobCount = Math.max(0, totalJobCount - demoJobCount);
  const realEstimateCount = Math.max(0, totalEstimateCount - demoEstimateCount);
  const realInvoiceCount = Math.max(0, totalInvoiceCount - demoInvoiceCount);

  return {
    hasDemoData,
    canSetupDemoData,
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
    console.error("[demo-data] mark seeded failed", {
      step: "mark_demo_seeded",
      table: "companies",
      companyId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDemoDataError(error, "seed", { accessVerified: true }) };
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
    console.error("[demo-data] clear RPC failed", {
      step: "clear_demo_data",
      table: "clear_company_demo_data",
      companyId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDemoDataError(error, "clear", { accessVerified: true }) };
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
