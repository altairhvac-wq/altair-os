/**
 * Referral job-completion sync — the final link in the referral → revenue
 * chain. Called best-effort from the job-completion workflow action.
 *
 * The heavy lifting (finding whether this job traces back to an unstamped
 * network referral, and stamping job_completed_at atomically) lives in the
 * SECURITY DEFINER RPC `sync_network_referral_job_completion` (migration
 * 138). This service calls it and, when a referral was stamped, emails the
 * SENDING company's owners/admins that their referral turned into completed
 * work. No failure here ever affects the job completion itself.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getAppBaseUrl } from "@/lib/email/env";
import { sendReferralJobCompletedEmail } from "@/lib/email/network-referral";
import type { NetworkReferralRow } from "@/lib/database/types/core-tables";

const MAX_RECIPIENTS = 5;

async function listSourceCompanyAdminRecipients(
  sourceCompanyId: string,
): Promise<{ email: string; name: string | null }[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("company_memberships")
    .select(
      "role, profile:profiles!company_memberships_user_id_fkey(email, full_name)",
    )
    .eq("company_id", sourceCompanyId)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);

  if (error) {
    console.error(
      "[network-referral-job-completion] recipient lookup failed:",
      error,
    );
    return [];
  }

  const seen = new Set<string>();
  const recipients: { email: string; name: string | null }[] = [];

  for (const row of (data ?? []) as {
    role: string;
    profile: { email: string | null; full_name: string | null } | null;
  }[]) {
    const email = row.profile?.email?.trim().toLowerCase();
    if (!email || seen.has(email)) {
      continue;
    }
    seen.add(email);
    recipients.push({ email, name: row.profile?.full_name ?? null });
    if (recipients.length >= MAX_RECIPIENTS) {
      break;
    }
  }

  return recipients;
}

async function getCompanyName(companyId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.name;
}

export async function syncNetworkReferralJobCompletion(input: {
  jobId: string;
  targetCompanyId: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "sync_network_referral_job_completion",
      {
        p_job_id: input.jobId,
        p_target_company_id: input.targetCompanyId,
      },
    );

    if (error) {
      console.error(
        "[network-referral-job-completion] sync RPC failed:",
        error,
      );
      return;
    }

    const referral = (data ?? null) as NetworkReferralRow | null;
    if (!referral) {
      // Common case: this job has nothing to do with a network referral.
      return;
    }

    // A referral was just stamped — tell the sending company their referral
    // became real, finished work.
    const [recipients, sourceCompanyName, targetCompanyName] =
      await Promise.all([
        listSourceCompanyAdminRecipients(referral.source_company_id),
        getCompanyName(referral.source_company_id),
        getCompanyName(referral.target_company_id),
      ]);

    if (recipients.length === 0) {
      return;
    }

    const appBaseUrl = getAppBaseUrl();
    const communityUrl = appBaseUrl
      ? `${appBaseUrl.replace(/\/$/, "")}/community`
      : undefined;

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        sendReferralJobCompletedEmail({
          to: recipient.email,
          recipientName: recipient.name,
          sourceCompanyName: sourceCompanyName ?? "your company",
          targetCompanyName: targetCompanyName ?? "Your network partner",
          requestedService: referral.requested_service,
          referralSentAt: referral.created_at,
          communityUrl,
        }),
      ),
    );

    const failed = results.filter(
      (result) =>
        result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.ok),
    ).length;

    if (failed > 0) {
      console.error(
        "[network-referral-job-completion] some completion emails failed:",
        {
          referralId: referral.id,
          attempted: recipients.length,
          failed,
        },
      );
    }
  } catch (error) {
    console.error(
      "[network-referral-job-completion] unexpected failure:",
      error,
    );
  }
}
