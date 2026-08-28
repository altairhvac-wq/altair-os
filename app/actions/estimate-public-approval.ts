"use server";

import { revalidatePath } from "next/cache";
import {
  enforcePublicRateLimit,
  rateLimitMessage,
  resolveRequestAddress,
} from "@/lib/security/public-rate-limit";
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
  // ============================== THIS ACTION WRITES ==============================
  // It records a signature and converts an estimate into a job, on the strength
  // of a token in a URL and nothing else. Unlimited attempts is a token-guessing
  // oracle against a write.
  //
  // The token dimension bounds attempts against one estimate; the address
  // dimension bounds a client working through many tokens.
  const approvalLimit = await enforcePublicRateLimit(
    "public.estimate_approval",
    { token: rawToken, ip: await resolveRequestAddress() },
  );
  if (!approvalLimit.allowed) {
    return { error: rateLimitMessage(approvalLimit) };
  }

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
    revalidatePath("/sales");
    revalidatePath(`/estimates/${result.estimateId}`);
    revalidatePath("/dispatch");
    revalidatePath("/work");
    if (result.jobId) {
      revalidatePath(`/work/${result.jobId}`);
    }
  }

  redirect(`/estimate-approval/${encodeURIComponent(rawToken)}?approved=1`);
}
