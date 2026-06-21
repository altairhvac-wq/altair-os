import { createClient } from "@/lib/supabase/server";
import type { MarketingCompletedJobPickerItem } from "@/shared/types/marketing-completed-job";

type MarketingCompletedJobRow = {
  id: string;
  job_type: string | null;
  city: string | null;
  state: string | null;
  completed_at: string | null;
  status: "completed";
};

const MARKETING_COMPLETED_JOBS_LIMIT = 100;
const MAX_SAFE_JOB_TYPE_LENGTH = 80;

function normalizeJobType(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.length > MAX_SAFE_JOB_TYPE_LENGTH) {
    return "service call";
  }
  return trimmed;
}

function mapMarketingCompletedJobRow(
  row: MarketingCompletedJobRow,
): MarketingCompletedJobPickerItem {
  return {
    id: row.id,
    jobType: normalizeJobType(row.job_type),
    city: row.city?.trim() || null,
    state: row.state?.trim() || null,
    completedAt: row.completed_at,
    status: "completed",
  };
}

export async function listCompletedJobsForMarketing(
  companyId: string,
): Promise<MarketingCompletedJobPickerItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, job_type, city, state, completed_at, status")
    .eq("company_id", companyId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(MARKETING_COMPLETED_JOBS_LIMIT);

  if (error) {
    console.error("[listCompletedJobsForMarketing] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as MarketingCompletedJobRow[]).map(
    mapMarketingCompletedJobRow,
  );
}

export async function isCompletedJobAvailableForMarketing(
  companyId: string,
  jobId: string,
): Promise<boolean> {
  const normalizedJobId = jobId.trim();
  if (!normalizedJobId) {
    return false;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", normalizedJobId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    console.error("[isCompletedJobAvailableForMarketing] query failed:", {
      companyId,
      jobId: normalizedJobId,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return data != null;
}

export async function getCompletedJobContextForMarketing(
  companyId: string,
  jobId: string,
): Promise<MarketingCompletedJobPickerItem | null> {
  const normalizedJobId = jobId.trim();
  if (!normalizedJobId) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, job_type, city, state, completed_at, status")
    .eq("company_id", companyId)
    .eq("id", normalizedJobId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    console.error("[getCompletedJobContextForMarketing] query failed:", {
      companyId,
      jobId: normalizedJobId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return mapMarketingCompletedJobRow(data as MarketingCompletedJobRow);
}
