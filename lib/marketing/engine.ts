import "server-only";

// Marketing AI HQ engine: orchestration + run ledger. The ONLY module that
// invokes AI for the HQ, and it writes results exclusively into the
// approval queue (marketing_items). It never publishes anything.
// Architecture: docs/product/MARKETING_AI_HQ.md

import { generateDraftText } from "@/lib/ai/provider";
import { loadMarketingHqContext } from "@/lib/marketing/brand";
import {
  buildCopywriterBatchRequest,
  parseCopywriterBatchResponse,
} from "@/lib/marketing/roles/copywriter";
import {
  buildSeoBatchRequest,
  parseSeoBatchResponse,
} from "@/lib/marketing/roles/seo";
import {
  buildStrategistRequest,
  extractStrategistFocus,
  parseStrategistResponse,
} from "@/lib/marketing/roles/strategist";
import {
  buildVideoBriefRequest,
  parseVideoBriefResponse,
} from "@/lib/marketing/roles/video";
import {
  getLatestSuccessfulMarketingRun,
  getMarketingItemFlowStats,
  insertMarketingItems,
  listCompaniesWithActiveMarketingHq,
  listMarketingItems,
  recordMarketingRunFinished,
  recordMarketingRunStarted,
  sanitizeMarketingErrorSummary,
} from "@/lib/marketing/store";
import { isMarketingHqConfigComplete } from "@/shared/types/marketing-ai-hq";
import type { MarketingRunTrigger } from "@/shared/types/marketing-ai-hq";

const WEEK_MS = 6 * 24 * 60 * 60 * 1000; // "due" threshold: >6 days since success

export type MarketingEngineRunResult = {
  ok: boolean;
  runKey: string;
  itemsCreated: number;
  error?: string;
};

/**
 * Copywriter batch: drafts N social posts into the approval queue.
 */
export async function runMarketingCopywriterBatch(
  companyId: string,
  trigger: MarketingRunTrigger,
): Promise<MarketingEngineRunResult> {
  const runKey = "copywriter_batch";
  const { runId, startedAt } = await recordMarketingRunStarted(
    companyId,
    runKey,
    trigger,
  );

  try {
    const context = await loadMarketingHqContext(companyId);

    if (!context.hasConfig || !isMarketingHqConfigComplete(context.config)) {
      const error =
        "Set up the HQ mission, audience, and goals before running the copywriter.";
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: error,
      });
      return { ok: false, runKey, itemsCreated: 0, error };
    }

    const [recentItems, latestStrategistRun] = await Promise.all([
      listMarketingItems(companyId, { limit: 30 }),
      getLatestSuccessfulMarketingRun(companyId, "strategist_weekly"),
    ]);

    const recentTitles = recentItems
      .filter((item) => item.kind === "social_post")
      .map((item) => item.title);

    const request = buildCopywriterBatchRequest({
      context,
      recentTitles,
      strategistFocus: extractStrategistFocus(latestStrategistRun?.report ?? null),
      batchSize: context.config.weeklyPostTarget,
    });

    const outcome = await generateDraftText(request);

    if (!outcome.ok) {
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: outcome.error.message,
      });
      return { ok: false, runKey, itemsCreated: 0, error: outcome.error.message };
    }

    const items = parseCopywriterBatchResponse(outcome.result.draftText);

    if (items.length === 0) {
      const snippet = outcome.result.draftText
        .replace(/\s+/g, " ")
        .slice(0, 180);
      const error = `The copywriter returned no usable drafts. Response began: ${snippet}`;
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: error,
      });
      return { ok: false, runKey, itemsCreated: 0, error };
    }

    const insertResult = await insertMarketingItems(companyId, runId, items);

    if (insertResult.error) {
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: insertResult.error,
      });
      return { ok: false, runKey, itemsCreated: 0, error: insertResult.error };
    }

    await recordMarketingRunFinished(runId, {
      companyId,
      runKey,
      trigger,
      startedAt,
      status: "succeeded",
      totals: {
        requested: context.config.weeklyPostTarget,
        created: insertResult.inserted,
      },
    });

    return { ok: true, runKey, itemsCreated: insertResult.inserted };
  } catch (error) {
    await recordMarketingRunFinished(runId, {
      companyId,
      runKey,
      trigger,
      startedAt,
      status: "failed",
      errorSummary: sanitizeMarketingErrorSummary(error),
    });
    return {
      ok: false,
      runKey,
      itemsCreated: 0,
      error: "Copywriter run failed.",
    };
  }
}

/**
 * Strategist: weekly report + next-week focus into the approval queue.
 * The report jsonb on the run row is what the copywriter reads next batch.
 */
export async function runMarketingStrategist(
  companyId: string,
  trigger: MarketingRunTrigger,
): Promise<MarketingEngineRunResult> {
  const runKey = "strategist_weekly";
  const { runId, startedAt } = await recordMarketingRunStarted(
    companyId,
    runKey,
    trigger,
  );

  try {
    const context = await loadMarketingHqContext(companyId);

    if (!context.hasConfig || !isMarketingHqConfigComplete(context.config)) {
      const error =
        "Set up the HQ mission, audience, and goals before running the strategist.";
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: error,
      });
      return { ok: false, runKey, itemsCreated: 0, error };
    }

    const [itemFlowStats, previousRun, recentItems] = await Promise.all([
      getMarketingItemFlowStats(companyId, 7),
      getLatestSuccessfulMarketingRun(companyId, runKey),
      listMarketingItems(companyId, { statuses: ["rejected"], limit: 10 }),
    ]);

    const request = buildStrategistRequest({
      context,
      itemFlowStats,
      previousReport: previousRun?.report ?? null,
      recentRejectedTitles: recentItems.map((item) => item.title),
    });

    const outcome = await generateDraftText(request);

    if (!outcome.ok) {
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: outcome.error.message,
      });
      return { ok: false, runKey, itemsCreated: 0, error: outcome.error.message };
    }

    const parsed = parseStrategistResponse(outcome.result.draftText);

    if (!parsed) {
      const error = "The strategist returned an unreadable report.";
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: error,
      });
      return { ok: false, runKey, itemsCreated: 0, error };
    }

    const insertResult = await insertMarketingItems(companyId, runId, [
      parsed.item,
    ]);

    if (insertResult.error) {
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: insertResult.error,
      });
      return { ok: false, runKey, itemsCreated: 0, error: insertResult.error };
    }

    await recordMarketingRunFinished(runId, {
      companyId,
      runKey,
      trigger,
      startedAt,
      status: "succeeded",
      totals: {
        recommendations: parsed.content.recommendations.length,
        focusItems: parsed.content.nextWeekFocus.length,
      },
      report: parsed.content as unknown as Record<string, unknown>,
    });

    return { ok: true, runKey, itemsCreated: insertResult.inserted };
  } catch (error) {
    await recordMarketingRunFinished(runId, {
      companyId,
      runKey,
      trigger,
      startedAt,
      status: "failed",
      errorSummary: sanitizeMarketingErrorSummary(error),
    });
    return {
      ok: false,
      runKey,
      itemsCreated: 0,
      error: "Strategist run failed.",
    };
  }
}

/**
 * SEO batch: one comparison-page draft + one article draft into the queue.
 */
export async function runMarketingSeoBatch(
  companyId: string,
  trigger: MarketingRunTrigger,
): Promise<MarketingEngineRunResult> {
  const runKey = "seo_batch";
  const { runId, startedAt } = await recordMarketingRunStarted(
    companyId,
    runKey,
    trigger,
  );

  try {
    const context = await loadMarketingHqContext(companyId);

    if (!context.hasConfig || !isMarketingHqConfigComplete(context.config)) {
      const error =
        "Set up the HQ mission, audience, and goals before running the SEO specialist.";
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: error,
      });
      return { ok: false, runKey, itemsCreated: 0, error };
    }

    const [recentItems, latestStrategistRun] = await Promise.all([
      listMarketingItems(companyId, { limit: 50 }),
      getLatestSuccessfulMarketingRun(companyId, "strategist_weekly"),
    ]);

    const recentTitles = recentItems
      .filter(
        (item) => item.kind === "seo_page" || item.kind === "blog_article",
      )
      .map((item) => item.title);

    const request = buildSeoBatchRequest({
      context,
      recentTitles,
      strategistFocus: extractStrategistFocus(
        latestStrategistRun?.report ?? null,
      ),
    });

    const outcome = await generateDraftText(request);

    if (!outcome.ok) {
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: outcome.error.message,
      });
      return { ok: false, runKey, itemsCreated: 0, error: outcome.error.message };
    }

    const items = parseSeoBatchResponse(outcome.result.draftText);

    if (items.length === 0) {
      const snippet = outcome.result.draftText
        .replace(/\s+/g, " ")
        .slice(0, 180);
      const error = `The SEO specialist returned no usable drafts. Response began: ${snippet}`;
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: error,
      });
      return { ok: false, runKey, itemsCreated: 0, error };
    }

    const insertResult = await insertMarketingItems(companyId, runId, items);

    if (insertResult.error) {
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: insertResult.error,
      });
      return { ok: false, runKey, itemsCreated: 0, error: insertResult.error };
    }

    await recordMarketingRunFinished(runId, {
      companyId,
      runKey,
      trigger,
      startedAt,
      status: "succeeded",
      totals: { created: insertResult.inserted },
    });

    return { ok: true, runKey, itemsCreated: insertResult.inserted };
  } catch (error) {
    await recordMarketingRunFinished(runId, {
      companyId,
      runKey,
      trigger,
      startedAt,
      status: "failed",
      errorSummary: sanitizeMarketingErrorSummary(error),
    });
    return {
      ok: false,
      runKey,
      itemsCreated: 0,
      error: "SEO run failed.",
    };
  }
}

/**
 * Video brief: one complete short-video brief into the queue. Manual trigger
 * only (not in the cron loop) — video is founder-paced, not calendar-paced.
 */
export async function runMarketingVideoBrief(
  companyId: string,
  trigger: MarketingRunTrigger,
): Promise<MarketingEngineRunResult> {
  const runKey = "video_brief";
  const { runId, startedAt } = await recordMarketingRunStarted(
    companyId,
    runKey,
    trigger,
  );

  try {
    const context = await loadMarketingHqContext(companyId);

    if (!context.hasConfig || !isMarketingHqConfigComplete(context.config)) {
      const error =
        "Set up the HQ mission, audience, and goals before running the video producer.";
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: error,
      });
      return { ok: false, runKey, itemsCreated: 0, error };
    }

    const [recentItems, latestStrategistRun] = await Promise.all([
      listMarketingItems(companyId, { limit: 50 }),
      getLatestSuccessfulMarketingRun(companyId, "strategist_weekly"),
    ]);

    const request = buildVideoBriefRequest({
      context,
      recentTitles: recentItems
        .filter((item) => item.kind === "video_brief")
        .map((item) => item.title),
      strategistFocus: extractStrategistFocus(
        latestStrategistRun?.report ?? null,
      ),
    });

    const outcome = await generateDraftText(request);

    if (!outcome.ok) {
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: outcome.error.message,
      });
      return { ok: false, runKey, itemsCreated: 0, error: outcome.error.message };
    }

    const item = parseVideoBriefResponse(outcome.result.draftText);

    if (!item) {
      const error = "The video producer returned an unreadable brief.";
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: error,
      });
      return { ok: false, runKey, itemsCreated: 0, error };
    }

    const insertResult = await insertMarketingItems(companyId, runId, [item]);

    if (insertResult.error) {
      await recordMarketingRunFinished(runId, {
        companyId,
        runKey,
        trigger,
        startedAt,
        status: "failed",
        errorSummary: insertResult.error,
      });
      return { ok: false, runKey, itemsCreated: 0, error: insertResult.error };
    }

    await recordMarketingRunFinished(runId, {
      companyId,
      runKey,
      trigger,
      startedAt,
      status: "succeeded",
      totals: { created: insertResult.inserted },
    });

    return { ok: true, runKey, itemsCreated: insertResult.inserted };
  } catch (error) {
    await recordMarketingRunFinished(runId, {
      companyId,
      runKey,
      trigger,
      startedAt,
      status: "failed",
      errorSummary: sanitizeMarketingErrorSummary(error),
    });
    return {
      ok: false,
      runKey,
      itemsCreated: 0,
      error: "Video brief run failed.",
    };
  }
}

function isRunDue(lastSuccessStartedAt: string | null, now: Date): boolean {
  if (!lastSuccessStartedAt) {
    return true;
  }

  const lastMs = Date.parse(lastSuccessStartedAt);
  if (Number.isNaN(lastMs)) {
    return true;
  }

  return now.getTime() - lastMs > WEEK_MS;
}

export type MarketingEngineCronSummary = {
  companyCount: number;
  runs: { companyId: string; runKey: string; ok: boolean; itemsCreated: number }[];
  errors: string[];
};

/**
 * Cron entry: for every company with an initialized HQ, run whatever is due.
 * Strategist fires on Mondays (UTC); copywriter fires the day after a week
 * has passed since its last success. First run of each happens immediately.
 */
export async function runDueMarketingTasks(
  now = new Date(),
): Promise<MarketingEngineCronSummary> {
  const companyIds = await listCompaniesWithActiveMarketingHq();
  const summary: MarketingEngineCronSummary = {
    companyCount: companyIds.length,
    runs: [],
    errors: [],
  };

  const isMondayUtc = now.getUTCDay() === 1;

  for (const companyId of companyIds) {
    try {
      const [lastStrategist, lastCopywriter, lastSeo] = await Promise.all([
        getLatestSuccessfulMarketingRun(companyId, "strategist_weekly"),
        getLatestSuccessfulMarketingRun(companyId, "copywriter_batch"),
        getLatestSuccessfulMarketingRun(companyId, "seo_batch"),
      ]);

      const strategistDue =
        isRunDue(lastStrategist?.startedAt ?? null, now) &&
        (isMondayUtc || !lastStrategist);

      if (strategistDue) {
        const result = await runMarketingStrategist(companyId, "cron");
        summary.runs.push({
          companyId,
          runKey: result.runKey,
          ok: result.ok,
          itemsCreated: result.itemsCreated,
        });
        if (!result.ok && result.error) {
          summary.errors.push(result.error);
        }
      }

      if (isRunDue(lastCopywriter?.startedAt ?? null, now)) {
        const result = await runMarketingCopywriterBatch(companyId, "cron");
        summary.runs.push({
          companyId,
          runKey: result.runKey,
          ok: result.ok,
          itemsCreated: result.itemsCreated,
        });
        if (!result.ok && result.error) {
          summary.errors.push(result.error);
        }
      }

      if (isRunDue(lastSeo?.startedAt ?? null, now)) {
        const result = await runMarketingSeoBatch(companyId, "cron");
        summary.runs.push({
          companyId,
          runKey: result.runKey,
          ok: result.ok,
          itemsCreated: result.itemsCreated,
        });
        if (!result.ok && result.error) {
          summary.errors.push(result.error);
        }
      }
    } catch (error) {
      summary.errors.push(sanitizeMarketingErrorSummary(error));
    }
  }

  return summary;
}
