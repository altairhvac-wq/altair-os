import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  JobMaterialInsert,
  JobMaterialRow,
} from "@/lib/database/types/core-tables";
import type { JobMaterial, JobMaterialFormData } from "@/shared/types/job-material";
import { roundJobMaterialAmount } from "@/shared/types/job-material";

type ProfileSummary = {
  full_name: string | null;
  email: string;
};

type JobMaterialRowWithAddedBy = JobMaterialRow & {
  added_by_profile: ProfileSummary | null;
};

function formatProfileName(
  profile: ProfileSummary | null | undefined,
): string | undefined {
  if (!profile) {
    return undefined;
  }

  return profile.full_name?.trim() || profile.email;
}

function mapJobMaterialRow(row: JobMaterialRowWithAddedBy): JobMaterial {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unit_price);
  const unitCost =
    row.unit_cost == null ? undefined : Number(row.unit_cost);

  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id ?? undefined,
    jobId: row.job_id,
    serviceItemId: row.service_item_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unitCost:
      unitCost == null || Number.isFinite(unitCost) ? unitCost : undefined,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    taxable: row.taxable,
    addedBy: row.added_by ?? undefined,
    addedByName: formatProfileName(row.added_by_profile),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const JOB_MATERIAL_SELECT = `
  *,
  added_by_profile:profiles!job_materials_added_by_fkey(full_name, email)
`;

export function mapJobMaterialFormDataToInsert(input: {
  companyId: string;
  customerId?: string | null;
  addedBy: string;
  data: JobMaterialFormData;
}): JobMaterialInsert {
  return {
    company_id: input.companyId,
    customer_id: input.customerId ?? null,
    job_id: input.data.jobId,
    service_item_id: input.data.serviceItemId?.trim() || null,
    name: input.data.name.trim(),
    description: input.data.description?.trim() || null,
    quantity: roundJobMaterialAmount(input.data.quantity),
    unit_cost:
      input.data.unitCost == null
        ? null
        : roundJobMaterialAmount(input.data.unitCost),
    unit_price: roundJobMaterialAmount(Math.max(input.data.unitPrice, 0)),
    taxable: input.data.taxable,
    added_by: input.addedBy,
  };
}

export async function listJobMaterialsForJob(
  companyId: string,
  jobId: string,
): Promise<JobMaterial[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_materials")
    .select(JOB_MATERIAL_SELECT)
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listJobMaterialsForJob] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as JobMaterialRowWithAddedBy[]).map(mapJobMaterialRow);
}

export async function createJobMaterial(input: {
  companyId: string;
  customerId?: string | null;
  addedBy: string;
  data: JobMaterialFormData;
}): Promise<{ material: JobMaterial | null; error: string | null }> {
  const supabase = await createClient();
  const insert = mapJobMaterialFormDataToInsert(input);

  const { data, error } = await supabase
    .from("job_materials")
    .insert(insert)
    .select(JOB_MATERIAL_SELECT)
    .single();

  if (error || !data) {
    console.error("[createJobMaterial] insert failed:", {
      companyId: input.companyId,
      jobId: input.data.jobId,
      code: error?.code,
      message: error?.message,
    });
    return {
      material: null,
      error: mapDatabaseError(error ?? { message: "Insert failed." }),
    };
  }

  return {
    material: mapJobMaterialRow(data as JobMaterialRowWithAddedBy),
    error: null,
  };
}
