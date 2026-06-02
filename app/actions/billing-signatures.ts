"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  deleteBillingSignature,
  upsertBillingSignature,
} from "@/lib/database/queries/billing-signatures";
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

async function assertCanCaptureBillingSignature(
  context: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
  entityType: BillingSignatureEntityType,
  jobId?: string | null,
): Promise<{ error?: string }> {
  if (context.permissions.manageBilling) {
    return {};
  }

  if (!jobId) {
    return { error: "You do not have permission to capture signatures." };
  }

  const job = await getJobById(context.company.id, jobId);

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
