"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { submitPublicEstimateApproval } from "@/lib/database/queries/estimate-approval-tokens";
import { validateCaptureBillingSignatureInput } from "@/shared/lib/billing-signature-validation";

export type SubmitPublicEstimateApprovalActionResult = {
  error?: string;
};

export async function submitPublicEstimateApprovalAction(
  rawToken: string,
  formData: FormData,
): Promise<SubmitPublicEstimateApprovalActionResult> {
  const signerName = String(formData.get("signerName") ?? "");
  const signatureData = String(formData.get("signatureData") ?? "");
  const authorized = formData.get("authorized") === "on";

  if (!authorized) {
    return {
      error:
        "Please confirm that you authorize the proposed work before approving.",
    };
  }

  const validationError = validateCaptureBillingSignatureInput(
    signerName,
    signatureData,
  );

  if (validationError) {
    return { error: validationError };
  }

  const result = await submitPublicEstimateApproval({
    rawToken,
    signerName,
    signatureData,
    authorized: true,
  });

  if (result.error) {
    return { error: result.error };
  }

  if (result.estimateId) {
    revalidatePath("/estimates");
    revalidatePath(`/estimates/${result.estimateId}`);
  }

  redirect(`/estimate-approval/${encodeURIComponent(rawToken)}?approved=1`);
}
