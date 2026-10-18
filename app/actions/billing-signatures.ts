"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  deleteBillingSignature,
  upsertBillingSignature,
} from "@/lib/database/queries/billing-signatures";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { getJobById } from "@/lib/database/queries/jobs";
import { canCaptureBillingSignature } from "@/lib/database/access-control";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import type { BillingSignatureEntityType } from "@/lib/database/types/core-tables";
import type {
  BillingSignature,
  CaptureBillingSignatureFormData,
} from "@/shared/types/billing-signature";

export type BillingSignatureActionResult = {
  error?: string;
  signature?: BillingSignature;
};

function revalidateBillingSignaturePaths(
  entityType: BillingSignatureEntityType,
  entityId: string,
  customerId?: string,
  jobId?: string | null,
) {
  if (entityType === "estimate") {
    revalidatePath("/estimates");
    revalidatePath("/sales");
    revalidatePath(`/estimates/${entityId}`);
  } else {
    revalidatePath("/invoices");
    revalidatePath("/sales");
    revalidatePath(`/invoices/${entityId}`);
  }

  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }

  if (jobId) {
    revalidatePath(`/work/${jobId}`);
  }
}

/**
 * ==================== THE JOB MUST BE THE DOCUMENT'S OWN JOB ====================
 * A technician without manageBilling is allowed to capture a signature only
 * on an estimate linked to a job assigned to them. Before, the permission was
 * checked against whatever `options.jobId` the client sent, while the write
 * went to whatever `entityId` the client sent — nothing tied the two together
 * (launch audit M14a). Now the document is loaded first and the job it is
 * actually linked to is the only job the permission is checked against; a
 * caller-supplied jobId that disagrees is refused.
 */
async function assertCanCaptureBillingSignature(
  context: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
  entityType: BillingSignatureEntityType,
  entityId: string,
  jobId?: string | null,
): Promise<{ error?: string }> {
  if (context.permissions.manageBilling) {
    return {};
  }

  if (!jobId) {
    return { error: "You do not have permission to capture signatures." };
  }

  const document =
    entityType === "estimate"
      ? await getEstimateById(context.company.id, entityId)
      : await getInvoiceById(context.company.id, entityId);

  if (!document) {
    return {
      error:
        entityType === "estimate" ? "Estimate not found." : "Invoice not found.",
    };
  }

  if (!document.jobId || document.jobId !== jobId) {
    return { error: "You do not have permission to capture signatures." };
  }

  const job = await getJobById(context.company.id, document.jobId);

  if (!job) {
    return { error: "Linked job not found." };
  }

  if (!canCaptureBillingSignature(context, entityType, job)) {
    return { error: "You do not have permission to capture signatures." };
  }

  return {};
}

export async function saveBillingSignatureAction(
  entityType: BillingSignatureEntityType,
  entityId: string,
  data: CaptureBillingSignatureFormData,
  options?: {
    customerId?: string;
    jobId?: string | null;
  },
): Promise<BillingSignatureActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const permissionError = await assertCanCaptureBillingSignature(
    context,
    entityType,
    entityId,
    options?.jobId,
  );

  if (permissionError.error) {
    return permissionError;
  }

  const { signature, error } = await upsertBillingSignature(
    context.company.id,
    context.user.id,
    entityType,
    entityId,
    data,
  );

  if (error || !signature) {
    return { error: error ?? "We couldn't save this signature. Try again." };
  }

  revalidateBillingSignaturePaths(
    entityType,
    entityId,
    options?.customerId,
    options?.jobId,
  );

  return { signature };
}

export async function clearBillingSignatureAction(
  entityType: BillingSignatureEntityType,
  entityId: string,
  options?: {
    customerId?: string;
    jobId?: string | null;
  },
): Promise<{ error?: string }> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const permissionError = await assertCanCaptureBillingSignature(
    context,
    entityType,
    entityId,
    options?.jobId,
  );

  if (permissionError.error) {
    return permissionError;
  }

  const { error } = await deleteBillingSignature(
    context.company.id,
    entityType,
    entityId,
  );

  if (error) {
    return { error };
  }

  revalidateBillingSignaturePaths(
    entityType,
    entityId,
    options?.customerId,
    options?.jobId,
  );

  return {};
}
