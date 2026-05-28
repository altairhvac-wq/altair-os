"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  deleteBillingSignature,
  upsertBillingSignature,
} from "@/lib/database/queries/billing-signatures";
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
    revalidatePath(`/estimates/${entityId}`);
  } else {
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${entityId}`);
  }

  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }

  if (jobId) {
    revalidatePath(`/jobs/${jobId}`);
  }
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

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to capture signatures." };
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

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to clear signatures." };
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
