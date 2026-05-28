import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import type {
  BillingSignatureEntityType,
  BillingSignatureInsert,
  BillingSignatureRow,
} from "@/lib/database/types/core-tables";
import type {
  BillingSignature,
  CaptureBillingSignatureFormData,
} from "@/shared/types/billing-signature";
import {
  normalizeSignerName,
  validateCaptureBillingSignatureInput,
} from "@/shared/lib/billing-signature-validation";

function mapSignatureRow(row: BillingSignatureRow): BillingSignature {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    signerName: row.signer_name,
    signerRole: row.signer_role,
    signatureData: row.signature_data,
    signedAt: row.signed_at,
    createdById: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function verifyBillingEntityExists(
  companyId: string,
  entityType: BillingSignatureEntityType,
  entityId: string,
): Promise<boolean> {
  if (entityType === "estimate") {
    const estimate = await getEstimateById(companyId, entityId);
    return Boolean(estimate);
  }

  const invoice = await getInvoiceById(companyId, entityId);
  return Boolean(invoice);
}

export async function getBillingSignatureForEntity(
  companyId: string,
  entityType: BillingSignatureEntityType,
  entityId: string,
): Promise<BillingSignature | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("billing_signatures")
    .select("*")
    .eq("company_id", companyId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) {
    console.error("getBillingSignatureForEntity", error);
    return null;
  }

  return data ? mapSignatureRow(data) : null;
}

export async function upsertBillingSignature(
  companyId: string,
  actorId: string,
  entityType: BillingSignatureEntityType,
  entityId: string,
  data: CaptureBillingSignatureFormData,
): Promise<{ signature?: BillingSignature; error?: string }> {
  const validationError = validateCaptureBillingSignatureInput(
    data.signerName,
    data.signatureData,
  );

  if (validationError) {
    return { error: validationError };
  }

  const entityExists = await verifyBillingEntityExists(
    companyId,
    entityType,
    entityId,
  );

  if (!entityExists) {
    return { error: "This billing document could not be found." };
  }

  const payload: BillingSignatureInsert = {
    company_id: companyId,
    entity_type: entityType,
    entity_id: entityId,
    signer_name: normalizeSignerName(data.signerName),
    signer_role: "customer",
    signature_data: data.signatureData.trim(),
    signed_at: new Date().toISOString(),
    created_by: actorId,
  };

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("billing_signatures")
    .upsert(payload, {
      onConflict: "company_id,entity_type,entity_id",
    })
    .select("*")
    .single();

  if (error || !row) {
    return {
      error:
        mapDatabaseError(error) ??
        "We couldn't save this signature. Try again.",
    };
  }

  return { signature: mapSignatureRow(row) };
}

export async function deleteBillingSignature(
  companyId: string,
  entityType: BillingSignatureEntityType,
  entityId: string,
): Promise<{ error?: string }> {
  const entityExists = await verifyBillingEntityExists(
    companyId,
    entityType,
    entityId,
  );

  if (!entityExists) {
    return { error: "This billing document could not be found." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("billing_signatures")
    .delete()
    .eq("company_id", companyId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    return {
      error:
        mapDatabaseError(error) ??
        "We couldn't clear this signature. Try again.",
    };
  }

  return {};
}
