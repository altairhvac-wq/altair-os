"use server";

import { revalidatePath } from "next/cache";
import { recordSecurityAuditEvent } from "@/lib/security/audit";
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
  const approvalAddress = await resolveRequestAddress();
  const approvalLimit = await enforcePublicRateLimit(
    "public.estimate_approval",
    { token: rawToken, ip: approvalAddress },
  );
  if (!approvalLimit.allowed) {
    await recordSecurityAuditEvent({
      event: "public_estimate_approval.rate_limited",
      outcome: "refused",
      subject: rawToken,
      address: approvalAddress,
      reason: "rate_limited",
    });
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

  // A signature was recorded and an estimate may have become a job, on the
  // strength of a token in a URL. The token is hashed, so this says "this link
  // was used, from this address, at this time" and nothing more.
  await recordSecurityAuditEvent({
    event: "public_estimate_approval.submitted",
    outcome: "succeeded",
    subject: rawToken,
    address: approvalAddress,
  });

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
