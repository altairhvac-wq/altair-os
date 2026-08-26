import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { captureMonitoredEvent } from "@/lib/operations/monitoring";

/**
 * Bounded, resumable tenant-wide cron sweeps.
 *
 * ==================== THE PROBLEM ====================
 * `evaluateWorkflowRemindersForAllCompanies` selected every company, unfiltered,
 * and processed them serially with an `await` per company. There was no time
 * budget, so the platform eventually killed the function mid-loop. Every company
 * after the cut got nothing that day, the run record stayed 'started' forever,
 * and nothing reported either fact.
 *
 * ==================== THE INVARIANT ====================
 * The cursor records the last company whose attempt COMPLETED, and it advances
 * only after that attempt returns — success or caught failure, never before.
 * That single rule gives the property that matters:
 *
 *     a crash can cause work to be REPEATED, never SKIPPED.
 *
 * Repeating is safe because the per-company work is already idempotent —
 * `workflow_reminders` has a natural unique key on
 * (company_id, reminder_kind, source_entity_type, source_entity_id), and the
 * marketing engine gates every task on its last successful run. So this needs no
 * queue, no lock service, and no distributed coordination: a row with a cursor
 * is sufficient, and anything more would be infrastructure to back up and
 * operate for no additional safety.
 *
 * ==================== ORDERING ====================
 * Companies are swept in (created_at, id) order. `companies.id` is a random v4
 * uuid so ordering by it alone is arbitrary, and `created_at` alone is not
 * unique — the pair is a total order, which is what a resumable scan requires.
 *
 * ==================== FAILURE HANDLING ====================
 * A company that throws is recorded, reported, and the sweep MOVES ON — the
 * cursor advances past it.
 *
 * The alternative was considered and rejected. Holding the cursor at a failed
 * company retries it next invocation, which sounds safer, but it means one
 * permanently broken tenant stalls the sweep for every tenant behind it: they
 * stop receiving reminders entirely, which is strictly worse than the
 * unbounded-loop behaviour this module replaces. Advancing past a handled
 * failure keeps the cycle moving, and the tenant is retried on the next cycle
 * anyway because the sweep restarts from the beginning.
 *
 * The distinction that preserves the no-skip guarantee is HANDLED versus
 * CRASHED. The cursor advances only after a company's attempt COMPLETES —
 * success or caught failure. If the function is killed mid-company the cursor
 * still points before it, so it is retried. A crash can therefore repeat work;
 * it can never skip a tenant.
 *
 * Every failure is surfaced through the monitoring seam, so a tenant failing
 * silently forever is not a possible outcome.
 */

const DEFAULT_BATCH_SIZE = 50;
/**
 * Stop starting new companies past this point.
 *
 * Set well under the route's configured maxDuration so the sweep always has
 * room to write its checkpoint and its run record before the platform reclaims
 * the function. A checkpoint that never gets written is the failure this whole
 * module exists to prevent.
 */
const DEFAULT_TIME_BUDGET_MS = 45_000;

export type TenantSweepCursor = {
  createdAt: string;
  companyId: string;
};

export type TenantSweepCompany = {
  id: string;
  created_at: string;
};

export type TenantSweepOutcome = {
  /** Companies attempted in this invocation. */
  attempted: number;
  /** Companies that completed without throwing. */
  succeeded: number;
  /** Per-company failures. The sweep continues past these. */
  errors: { companyId: string; message: string }[];
  /** True when this invocation reached the end of the tenant list. */
  cycleComplete: boolean;
  /** True when the invocation stopped because it ran out of time. */
  stoppedForTime: boolean;
  /** Cursor persisted at the end of this invocation, if any. */
  cursor: TenantSweepCursor | null;
};

type SweepClient = ReturnType<typeof createServiceRoleClient>;

function checkpointsTable(client: SweepClient) {
  // cron_checkpoints: migration 152 — wire into Database types on next gen run.
  return (
    client as SweepClient & {
      from(table: "cron_checkpoints"): ReturnType<SweepClient["from"]>;
    }
  ).from("cron_checkpoints");
}

export async function readTenantSweepCursor(
  automationKey: string,
): Promise<TenantSweepCursor | null> {
  const client = createServiceRoleClient();
  const { data, error } = await checkpointsTable(client)
    .select("cursor_created_at, cursor_company_id")
    .eq("automation_key", automationKey)
    .maybeSingle();

  if (error) {
    console.error("[tenant-sweep] checkpoint read failed:", {
      automationKey,
      code: error.code,
      message: error.message,
    });
    // Fail forward: a missing cursor restarts the cycle, which repeats work
    // rather than skipping it.
    return null;
  }

  const row = data as
    | { cursor_created_at: string | null; cursor_company_id: string | null }
    | null;

  if (!row?.cursor_created_at || !row.cursor_company_id) {
    return null;
  }

  return { createdAt: row.cursor_created_at, companyId: row.cursor_company_id };
}

async function writeTenantSweepCursor(
  automationKey: string,
  cursor: TenantSweepCursor | null,
  options: { cycleComplete: boolean; processedDelta: number },
): Promise<void> {
  const client = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: existing } = await checkpointsTable(client)
    .select("companies_processed_this_cycle, cycle_started_at")
    .eq("automation_key", automationKey)
    .maybeSingle();

  const previous = existing as
    | { companies_processed_this_cycle: number | null; cycle_started_at: string | null }
    | null;

  const processed = options.cycleComplete
    ? 0
    : (previous?.companies_processed_this_cycle ?? 0) + options.processedDelta;

  const { error } = await checkpointsTable(client).upsert(
    {
      automation_key: automationKey,
      cursor_created_at: options.cycleComplete ? null : (cursor?.createdAt ?? null),
      cursor_company_id: options.cycleComplete ? null : (cursor?.companyId ?? null),
      cycle_started_at: options.cycleComplete
        ? null
        : (previous?.cycle_started_at ?? now),
      last_completed_cycle_at: options.cycleComplete ? now : undefined,
      companies_processed_this_cycle: processed,
      updated_at: now,
    },
    { onConflict: "automation_key" },
  );

  if (error) {
    console.error("[tenant-sweep] checkpoint write failed:", {
      automationKey,
      code: error.code,
      message: error.message,
    });
  }
}

export type RunTenantSweepInput = {
  automationKey: string;
  /**
   * Returns the next page of companies strictly after `cursor`, in
   * (created_at, id) order, at most `limit` rows.
   */
  listCompanies: (
    cursor: TenantSweepCursor | null,
    limit: number,
  ) => Promise<TenantSweepCompany[]>;
  /** Work for one tenant. Throwing marks that tenant failed; the sweep continues. */
  processCompany: (companyId: string) => Promise<void>;
  batchSize?: number;
  timeBudgetMs?: number;
  /** Injected in tests so elapsed time is deterministic. */
  now?: () => number;
};

/**
 * Runs one bounded slice of a tenant sweep and persists where it got to.
 *
 * The loop stops for one of three reasons, and each is reported distinctly:
 *   - the tenant list is exhausted    -> cycleComplete, cursor reset
 *   - the batch size is reached       -> cursor saved, resume next invocation
 *   - the time budget is reached      -> cursor saved, stoppedForTime
 */
export async function runTenantSweep(
  input: RunTenantSweepInput,
): Promise<TenantSweepOutcome> {
  const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
  const timeBudgetMs = input.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const now = input.now ?? (() => Date.now());
  const startedAt = now();

  let cursor = await readTenantSweepCursor(input.automationKey);

  const outcome: TenantSweepOutcome = {
    attempted: 0,
    succeeded: 0,
    errors: [],
    cycleComplete: false,
    stoppedForTime: false,
    cursor,
  };

  const companies = await input.listCompanies(cursor, batchSize);

  if (companies.length === 0) {
    // Nothing after the cursor: the cycle is finished. Reset so the next
    // invocation starts a fresh sweep from the beginning.
    outcome.cycleComplete = true;
    outcome.cursor = null;
    await writeTenantSweepCursor(input.automationKey, null, {
      cycleComplete: true,
      processedDelta: 0,
    });
    return outcome;
  }

  for (const company of companies) {
    // Checked BEFORE starting a company, never mid-company: stopping halfway
    // through a tenant is what the cursor cannot express.
    if (now() - startedAt >= timeBudgetMs) {
      outcome.stoppedForTime = true;
      break;
    }

    outcome.attempted += 1;

    try {
      await input.processCompany(company.id);
      outcome.succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      outcome.errors.push({ companyId: company.id, message });
      console.error("[tenant-sweep] company failed:", {
        automationKey: input.automationKey,
        companyId: company.id,
        message,
      });
      captureMonitoredEvent({
        event: "cron.tenant_sweep_company_failed",
        level: "error",
        companyId: company.id,
        meta: { automationKey: input.automationKey, message },
      });
      // Fall through and advance. See "FAILURE HANDLING" above: holding the
      // cursor here would stall every tenant behind this one.
    }

    // Advance after the attempt COMPLETES, success or handled failure. A crash
    // before this line leaves the cursor pointing before this company, so it is
    // retried — which is why a crash can repeat work but never skip a tenant.
    cursor = { createdAt: company.created_at, companyId: company.id };
    outcome.cursor = cursor;
  }

  await writeTenantSweepCursor(input.automationKey, cursor, {
    cycleComplete: false,
    processedDelta: outcome.succeeded,
  });

  return outcome;
}
