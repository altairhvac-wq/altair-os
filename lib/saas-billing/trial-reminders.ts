import "server-only";

import { sendTrialPaymentReminderEmail } from "@/lib/email/trial-payment-reminder";
import {
  TRIAL_PAYMENT_PROMPT_DAYS_BEFORE_END,
  TRIAL_PAYMENT_REMINDERS,
  isTrialEndingSoon,
  trialDaysRemaining,
  type TrialPaymentReminderKey,
} from "@/lib/saas-billing/trial-policy";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * The daily "add a payment method" reminders for card-free trials.
 *
 * ============ WHO GETS ONE ============
 * Companies whose row is `trialing` with NO Stripe subscription and a
 * trial_ends_at inside the prompt window. Once Stripe holds the subscription,
 * Stripe's own `customer.subscription.trial_will_end` flow covers it and this
 * sweep stays out of the way. Comped companies are excluded: their trial row
 * is not what admits them.
 *
 * ============ WHY IT CANNOT DOUBLE-SEND ============
 * Each reminder is claimed BEFORE it is sent by inserting its
 * (company_id, reminder_key) into saas_trial_reminders with duplicates
 * ignored. A claim that inserts nothing means a previous run already owns it.
 * If every send for a claimed reminder fails, the claim is released so the
 * next run tries again; a partial success keeps the claim, because the
 * company has been told.
 *
 * ============ BOUNDED ============
 * One page of candidates per run. The window is four days wide and a run
 * happens daily, so the backlog a page cannot clear today is cleared
 * tomorrow, and a reminder is at worst a day late rather than skipped.
 */

const CANDIDATE_LIMIT = 200;
const MAX_RECIPIENTS_PER_COMPANY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialReminderSweepResult = {
  candidates: number;
  remindersSent: number;
  remindersSkipped: number;
  errors: string[];
};

type CandidateRow = {
  company_id: string;
  trial_ends_at: string | null;
  status: string;
  stripe_subscription_id: string | null;
  company: { name: string } | null;
};

type RecipientRow = {
  profile: { email: string | null; full_name: string | null } | null;
};

async function listOwnerRecipients(
  companyId: string,
): Promise<{ email: string; name: string | null }[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("company_memberships")
    .select("profile:profiles!company_memberships_user_id_fkey(email, full_name)")
    .eq("company_id", companyId)
    .eq("status", "active")
    .eq("role", "owner")
    .limit(MAX_RECIPIENTS_PER_COMPANY);

  if (error) {
    console.error("[trial-reminders] owner lookup failed:", {
      companyId,
      code: error.code,
    });
    return [];
  }

  const seen = new Set<string>();
  const recipients: { email: string; name: string | null }[] = [];

  for (const row of (data ?? []) as unknown as RecipientRow[]) {
    const email = row.profile?.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, name: row.profile?.full_name ?? null });
  }

  return recipients;
}

/** Claims the reminder. True when THIS run inserted it. */
async function claimReminder(
  companyId: string,
  reminderKey: TrialPaymentReminderKey,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("saas_trial_reminders")
    .upsert(
      { company_id: companyId, reminder_key: reminderKey },
      { onConflict: "company_id,reminder_key", ignoreDuplicates: true },
    )
    .select("company_id");

  if (error) {
    throw new Error(`claim failed (${error.code ?? "unknown"})`);
  }

  return (data?.length ?? 0) > 0;
}

async function releaseReminder(
  companyId: string,
  reminderKey: TrialPaymentReminderKey,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("saas_trial_reminders")
    .delete()
    .eq("company_id", companyId)
    .eq("reminder_key", reminderKey);

  if (error) {
    console.error("[trial-reminders] release failed:", {
      companyId,
      reminderKey,
      code: error.code,
    });
  }
}

export async function runTrialPaymentReminders(
  nowMs: number = Date.now(),
): Promise<TrialReminderSweepResult> {
  const result: TrialReminderSweepResult = {
    candidates: 0,
    remindersSent: 0,
    remindersSkipped: 0,
    errors: [],
  };

  const supabase = createServiceRoleClient();
  const nowIso = new Date(nowMs).toISOString();
  const windowEndIso = new Date(
    nowMs + TRIAL_PAYMENT_PROMPT_DAYS_BEFORE_END * DAY_MS,
  ).toISOString();

  const { data, error } = await supabase
    .from("company_subscriptions")
    .select(
      "company_id, trial_ends_at, status, stripe_subscription_id, company:companies(name)",
    )
    .eq("status", "trialing")
    .is("stripe_subscription_id", null)
    .eq("access_grant", "none")
    .gt("trial_ends_at", nowIso)
    .lte("trial_ends_at", windowEndIso)
    .order("trial_ends_at", { ascending: true })
    .limit(CANDIDATE_LIMIT);

  if (error) {
    result.errors.push(`candidate query failed (${error.code ?? "unknown"})`);
    return result;
  }

  const candidates = (data ?? []) as unknown as CandidateRow[];
  result.candidates = candidates.length;

  for (const row of candidates) {
    const input = {
      status: row.status as "trialing",
      trialEndsAt: row.trial_ends_at,
      stripeSubscriptionId: row.stripe_subscription_id,
    };

    // The query already selected the window; this is the same rule the
    // resolver applies, so a row the UI would not prompt is not emailed.
    if (!isTrialEndingSoon(input, nowMs) || !row.trial_ends_at) {
      continue;
    }

    const daysRemaining = trialDaysRemaining(row.trial_ends_at, nowMs) ?? 0;
    const companyName = row.company?.name?.trim() || "your company";

    for (const reminder of TRIAL_PAYMENT_REMINDERS) {
      if (daysRemaining > reminder.daysBeforeEnd) {
        continue;
      }

      let claimed = false;
      try {
        claimed = await claimReminder(row.company_id, reminder.key);
      } catch (claimError) {
        result.errors.push(
          claimError instanceof Error ? claimError.message : "claim failed",
        );
        continue;
      }

      if (!claimed) {
        result.remindersSkipped += 1;
        continue;
      }

      const recipients = await listOwnerRecipients(row.company_id);

      if (recipients.length === 0) {
        // Nobody to tell. Keep the claim: retrying tomorrow finds the same
        // empty list, and the gate at trial end does not depend on the email.
        result.remindersSkipped += 1;
        continue;
      }

      let delivered = 0;
      for (const recipient of recipients) {
        const sendResult = await sendTrialPaymentReminderEmail({
          to: recipient.email,
          recipientName: recipient.name,
          companyName,
          trialEndsAt: row.trial_ends_at,
          daysRemaining,
        });

        if (sendResult.ok) {
          delivered += 1;
        } else {
          console.error("[trial-reminders] send failed:", {
            companyId: row.company_id,
            reminderKey: reminder.key,
            reason: sendResult.reason,
          });
        }
      }

      if (delivered === 0) {
        await releaseReminder(row.company_id, reminder.key);
        result.errors.push(`send failed for ${reminder.key}`);
        continue;
      }

      result.remindersSent += 1;
    }
  }

  return result;
}
