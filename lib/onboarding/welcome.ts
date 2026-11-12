import "server-only";

import type { User } from "@supabase/supabase-js";
import { after } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { getLiveOnboardingInfo } from "@/lib/onboarding/live-onboarding";
import { resolveCompanyBillingAccess } from "@/lib/saas-billing/resolver";
import { createClient } from "@/lib/supabase/server";

/**
 * How recently the company must have been created for this call to count as
 * "just created". bootstrap_company_for_new_user returns the caller's existing
 * company when there is one, so the id alone cannot say the workspace is new.
 */
const NEW_COMPANY_WINDOW_MS = 10 * 60 * 1000;

function readFullName(user: User): string | null {
  const value = user.user_metadata?.full_name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Queues the welcome email for a company that was just created by
 * bootstrap_company_for_new_user. Call it right after a successful bootstrap.
 *
 * - Never throws and never delays the signup: the send runs in `after()`, once
 *   the response is on its way.
 * - Sends only when the company was created in the last few minutes, so a
 *   bootstrap that returned an existing workspace sends nothing.
 * - Logs the outcome without the recipient address.
 */
export async function queueWelcomeEmailForNewCompany(input: {
  user: User;
  companyId: string;
}): Promise<void> {
  try {
    const to = input.user.email?.trim();
    if (!to) {
      return;
    }

    const supabase = await createClient();
    const { data: company, error } = await supabase
      .from("companies")
      .select("name, created_at")
      .eq("id", input.companyId)
      .maybeSingle();

    if (error || !company) {
      console.warn("[welcome-email] company not readable; not sent", {
        companyId: input.companyId,
        code: error?.code ?? null,
      });
      return;
    }

    const createdAt = new Date(company.created_at).getTime();
    if (Number.isNaN(createdAt) || Date.now() - createdAt > NEW_COMPANY_WINDOW_MS) {
      return;
    }

    const recipientName = readFullName(input.user);
    const companyName = company.name;
    const companyId = input.companyId;

    after(async () => {
      try {
        const access = await resolveCompanyBillingAccess(companyId);
        const result = await sendWelcomeEmail({
          to,
          recipientName,
          companyName,
          onboarding: getLiveOnboardingInfo(),
          trialStarted: access.state === "TRIAL" && !access.trialHasEnded,
        });

        if (!result.ok) {
          console.warn("[welcome-email] not sent", {
            companyId,
            reason: result.reason,
          });
        }
      } catch (sendError) {
        console.error("[welcome-email] send failed", {
          companyId,
          message: sendError instanceof Error ? sendError.message : "unknown",
        });
      }
    });
  } catch (queueError) {
    console.error("[welcome-email] could not be queued", {
      companyId: input.companyId,
      message: queueError instanceof Error ? queueError.message : "unknown",
    });
  }
}
