import "server-only";

import { sendMonthlyStatsEmail } from "@/lib/directory/emails";
import { monthBounds, monthTotals } from "@/lib/directory/stats";
import { isDirectory214Installed } from "@/lib/directory/schema";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * The monthly numbers email run (migration 214), called by
 * /api/cron/directory-stats early each month.
 *
 * For last calendar month, each published listing whose business has not
 * stopped the email gets one message with its views and taps. A month with
 * no views and no taps is recorded as skipped rather than sent: an email
 * that says "nothing happened" every month teaches people to ignore us.
 *
 * ============ NEVER TWICE ============
 * Before sending, the run claims (listing, month) in directory_stats_emails;
 * the primary key makes a second claim fail, so a re-run, an overlapping run
 * or a retry after a timeout cannot send the same month twice. A send that
 * fails is marked "failed" and is not retried automatically.
 *
 * Works through the listings in id order within a time budget and picks up
 * where it stopped on the next call, because finished listings are already
 * claimed.
 */

export type MonthlyStatsRunResult = {
  installed: boolean;
  month: string;
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
  alreadyDone: number;
  stoppedForTime: boolean;
};

function isNotInstalled(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === "42P01" || error.code === "42703" || error.code === "PGRST205" || /does not exist|Could not find/i.test(error.message ?? "")));
}

const BATCH = 200;

export async function runMonthlyStatsEmails(options: { now?: Date; budgetMs?: number } = {}): Promise<MonthlyStatsRunResult> {
  const now = options.now ?? new Date();
  const deadline = Date.now() + (options.budgetMs ?? 45_000);
  const month = monthBounds(now, -1);
  const result: MonthlyStatsRunResult = {
    installed: true,
    month: month.start,
    considered: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    alreadyDone: 0,
    stoppedForTime: false,
  };
  // Before migration 214 there are no numbers to send: a clean no-op.
  if (!(await isDirectory214Installed())) {
    result.installed = false;
    return result;
  }
  const supabase = createServiceRoleClient();

  let after: string | null = null;
  for (;;) {
    let query = supabase
      .from("directory_listings")
      .select("id, slug, business_name, contact_email")
      .eq("status", "published")
      .eq("stats_email_opt_out", false)
      .lt("published_at", month.end)
      .order("id", { ascending: true })
      .limit(BATCH);
    if (after) query = query.gt("id", after);
    const { data: listings, error } = await query;
    if (error) {
      if (isNotInstalled(error)) {
        result.installed = false;
        return result;
      }
      throw error;
    }
    if (!listings || listings.length === 0) break;
    after = listings[listings.length - 1].id;

    const totals = await monthTotals(
      listings.map((listing) => listing.id),
      month,
    );

    for (const listing of listings) {
      if (Date.now() > deadline) {
        result.stoppedForTime = true;
        return result;
      }
      result.considered += 1;
      const stats = totals.get(listing.id) ?? { views: 0, calls: 0, website: 0, directions: 0 };
      const empty = stats.views + stats.calls + stats.website + stats.directions === 0;

      const claim = await supabase
        .from("directory_stats_emails")
        .insert({ listing_id: listing.id, month: month.start, outcome: empty ? "skipped" : "claimed" });
      if (claim.error) {
        if (claim.error.code === "23505") {
          result.alreadyDone += 1;
          continue;
        }
        throw claim.error;
      }
      if (empty) {
        result.skipped += 1;
        continue;
      }

      const mail = await sendMonthlyStatsEmail(
        listing.contact_email,
        { id: listing.id, slug: listing.slug, businessName: listing.business_name },
        month.label,
        stats,
      );
      await supabase
        .from("directory_stats_emails")
        .update({ outcome: mail.ok ? "sent" : "failed" })
        .eq("listing_id", listing.id)
        .eq("month", month.start);
      if (mail.ok) result.sent += 1;
      else result.failed += 1;
    }
    if (listings.length < BATCH) break;
  }
  return result;
}
