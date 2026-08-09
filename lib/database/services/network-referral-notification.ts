/**
 * Best-effort email notification to the receiving company when a network
 * referral lands. Runs after the referral + target lead already exist — a
 * delivery failure never affects the referral itself.
 *
 * Uses the service-role client to look up the TARGET company's active
 * owner/admin recipients (the sender's session has no RLS access to another
 * company's memberships). Read-only lookup of names/emails; scope-limited to
 * exactly what the notification needs.
 */

import { createServiceRoleClient } from "@/lib/supabase/service";
import { getAppBaseUrl } from "@/lib/email/env";
import { sendNetworkReferralNotificationEmail } from "@/lib/email/network-referral";
import type { NetworkReferralUrgency } from "@/lib/database/types/enums";

const MAX_RECIPIENTS = 5;

type NotifyTargetCompanyInput = {
  targetCompanyId: string;
  targetCompanyName: string;
  sourceCompanyName: string;
  requestedService: string;
  urgency: NetworkReferralUrgency;
  city?: string;
  state?: string;
};

type RecipientRow = {
  role: string;
  profile: { email: string | null; full_name: string | null } | null;
};

async function listTargetCompanyAdminRecipients(
  targetCompanyId: string,
): Promise<{ email: string; name: string | null }[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("company_memberships")
    .select(
      "role, profile:profiles!company_memberships_user_id_fkey(email, full_name)",
    )
    .eq("company_id", targetCompanyId)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);

  if (error) {
    console.error(
      "[network-referral-notification] recipient lookup failed:",
      error,
    );
    return [];
  }

  const seen = new Set<string>();
  const recipients: { email: string; name: string | null }[] = [];

  for (const row of (data ?? []) as RecipientRow[]) {
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

export async function notifyTargetCompanyOfNetworkReferral(
  input: NotifyTargetCompanyInput,
): Promise<void> {
  try {
    const recipients = await listTargetCompanyAdminRecipients(
      input.targetCompanyId,
    );

    if (recipients.length === 0) {
      console.info(
        "[network-referral-notification] no active owner/admin recipients found",
        { targetCompanyId: input.targetCompanyId },
      );
      return;
    }

    // Plain /community — the Community tabs are client state (no query-param
    // deep link exists yet), and the Home tab's Needs Attention section
    // surfaces pending received referrals first anyway.
    const appBaseUrl = getAppBaseUrl();
    const referralUrl = appBaseUrl
      ? `${appBaseUrl.replace(/\/$/, "")}/community`
      : undefined;

    const locationLine = [input.city?.trim(), input.state?.trim()]
      .filter(Boolean)
      .join(", ");

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        sendNetworkReferralNotificationEmail({
          to: recipient.email,
          recipientName: recipient.name,
          targetCompanyName: input.targetCompanyName,
          sourceCompanyName: input.sourceCompanyName,
          requestedService: input.requestedService,
          urgency: input.urgency,
          locationLine: locationLine || undefined,
          referralUrl,
        }),
      ),
    );

    const failed = results.filter(
      (result) =>
        result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.ok),
    ).length;

    if (failed > 0) {
      console.error("[network-referral-notification] some sends failed:", {
        targetCompanyId: input.targetCompanyId,
        attempted: recipients.length,
        failed,
      });
    }
  } catch (error) {
    console.error("[network-referral-notification] unexpected failure:", error);
  }
}
