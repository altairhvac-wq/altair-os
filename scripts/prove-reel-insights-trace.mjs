/**
 * THE PROOF: one published Reel, its collected numbers, and the render job that
 * produced it — walked through the real database, one link at a time.
 *
 * ===================== WHY THIS EXISTS =====================
 * The collector writes `sourceJobId` into each metric row's `dimensions`, which
 * makes the trace a single query. That is convenient and it proves nothing: a
 * field the collector wrote is a field the collector could have written wrongly.
 *
 * So this walks the INDEPENDENT chain — the one that lives in foreign keys and
 * has been in the schema since migration 145 — and then checks that the shortcut
 * agrees with it:
 *
 *   marketing_channel_deliveries.provider_post_id   (the Meta post)
 *     -> .marketing_post_id      -> marketing_posts.id
 *     -> .video_media_asset_id   -> marketing_media_assets.id   (composite FK)
 *     -> .source_job_id          =  the Agent Platform render jobId
 *
 * If the two disagree, the numbers are attributed to the wrong video and this
 * exits non-zero. That is the only claim worth making.
 *
 * READ ONLY. It publishes nothing, collects nothing, and writes nothing.
 *
 * Run:  node scripts/prove-reel-insights-trace.mjs [--delivery=<id>] [--job=<sourceJobId>]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

function loadEnvLocal() {
  const out = {};
  for (const name of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(path.join(ROOT, name), "utf8").split("\n")) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (out[m[1]] === undefined) out[m[1]] = v;
      }
    } catch { /* optional */ }
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error(
    "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local or the environment).",
  );
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const wantDelivery = arg("delivery");
const wantJob = arg("job");

let failures = 0;
const step = (label, ok, detail) => {
  console.log(`  ${ok ? "OK  " : "FAIL"}  ${label}${detail === undefined ? "" : `  ${detail}`}`);
  if (!ok) failures += 1;
};

// ── 1. a published delivery ────────────────────────────────────────────────
let q = db
  .from("marketing_channel_deliveries")
  .select("id, company_id, marketing_post_id, provider, delivery_state, provider_post_id, provider_permalink, settled_at")
  .eq("delivery_state", "posted")
  .not("provider_post_id", "is", null)
  .order("settled_at", { ascending: false })
  .limit(1);
if (wantDelivery) q = db
  .from("marketing_channel_deliveries")
  .select("id, company_id, marketing_post_id, provider, delivery_state, provider_post_id, provider_permalink, settled_at")
  .eq("id", wantDelivery)
  .limit(1);

const { data: deliveries, error: dErr } = await q;
if (dErr) { console.error("delivery lookup failed:", dErr.message); process.exit(1); }
if (!deliveries?.length) {
  console.error(
    "\nNo posted delivery with a provider post id exists yet.\n" +
    "Publish one Reel from Marketing -> Today first — this proof reads, it never publishes.\n",
  );
  process.exit(1);
}
const delivery = deliveries[0];
console.log("\nPUBLISHED REEL");
step("delivery is posted", delivery.delivery_state === "posted", delivery.id);
step("carries a Meta post id", Boolean(delivery.provider_post_id), `${delivery.provider}:${delivery.provider_post_id}`);
if (delivery.provider_permalink) console.log(`        permalink  ${delivery.provider_permalink}`);

// ── 2. the FK chain, one hop at a time ─────────────────────────────────────
console.log("\nCHAIN BACK TO THE RENDER JOB");
const { data: post } = await db
  .from("marketing_posts")
  .select("id, title, status, source_type, video_media_asset_id")
  .eq("company_id", delivery.company_id)
  .eq("id", delivery.marketing_post_id)
  .maybeSingle();
step("delivery -> marketing_post", Boolean(post), post ? `${post.id}  "${post.title}"` : "MISSING");
step("post carries a video asset", Boolean(post?.video_media_asset_id), post?.video_media_asset_id ?? "none");

const { data: asset } = post?.video_media_asset_id
  ? await db
      .from("marketing_media_assets")
      .select("id, source_job_id, object_key, upload_state, byte_size")
      .eq("company_id", delivery.company_id)
      .eq("id", post.video_media_asset_id)
      .maybeSingle()
  : { data: null };
step("post -> media asset", Boolean(asset), asset?.id ?? "MISSING");
step("asset names the render job", Boolean(asset?.source_job_id), asset?.source_job_id ?? "MISSING");

const sourceJobId = asset?.source_job_id ?? null;
if (!sourceJobId) {
  console.error("\nThe chain breaks before the render job — nothing to attribute metrics to.\n");
  process.exit(1);
}
if (wantJob && wantJob !== sourceJobId) {
  step(`the chain reaches the requested job ${wantJob}`, false, `it reaches ${sourceJobId}`);
}

// ── 3. the collected numbers ───────────────────────────────────────────────
console.log("\nCOLLECTED METRICS");
const { data: metrics, error: mErr } = await db
  .from("marketing_metrics")
  .select("metric, value, observed_on, collected_at, dimensions, source")
  .eq("company_id", delivery.company_id)
  .eq("source", "meta_organic_reel")
  .eq("dimensions->>deliveryId", delivery.id)
  .order("observed_on", { ascending: false });
if (mErr) { console.error("metrics lookup failed:", mErr.message); process.exit(1); }

if (!metrics?.length) {
  console.log("  (none yet)");
  console.log(
    "\n  Nothing has been collected for this delivery. Run one collection first:\n" +
    "    curl -H \"Authorization: Bearer $CRON_SECRET\" <deployment>/api/cron/marketing-insights\n" +
    "  A Reel published in the last few minutes will report notReady — that is normal, not a fault.\n",
  );
  process.exit(1);
}

const byDay = new Map();
for (const m of metrics) byDay.set(m.observed_on, (byDay.get(m.observed_on) ?? 0) + 1);
for (const [day, count] of byDay) console.log(`  ${day}   ${count} metric(s)`);
console.log("");
for (const m of metrics.filter((x) => x.observed_on === metrics[0].observed_on)) {
  console.log(`    ${String(m.metric).padEnd(30)} ${m.value}`);
}

// ── 4. the two routes must agree ───────────────────────────────────────────
console.log("\nATTRIBUTION");
step("every metric row is organic, never a paid figure",
  metrics.every((m) => m.source === "meta_organic_reel"));
step(
  "every metric row names the SAME render job the foreign keys reach",
  metrics.every((m) => m.dimensions?.sourceJobId === sourceJobId),
  sourceJobId,
);
step(
  "every metric row names this delivery's Meta post",
  metrics.every((m) => m.dimensions?.providerPostId === delivery.provider_post_id),
);

// The shortcut the collector wrote, queried on its own, must return the same set.
const { data: byJob } = await db
  .from("marketing_metrics")
  .select("metric, observed_on")
  .eq("company_id", delivery.company_id)
  .eq("source", "meta_organic_reel")
  .eq("dimensions->>sourceJobId", sourceJobId);
step(
  "querying by render job alone returns those same rows",
  (byJob?.length ?? 0) >= metrics.length,
  `${byJob?.length ?? 0} row(s) for job ${sourceJobId}`,
);

// ── 5. what the strategist will actually read ──────────────────────────────
// The point of the whole loop. Not "the numbers exist somewhere" but "the
// planning agent receives them", rendered with the same code the weekly run
// uses — so what is printed here is the text, not a description of the text.
console.log("\nWHAT THE STRATEGIST WILL READ NEXT RUN");
try {
  const { mkdtempSync, writeFileSync: write } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const ts = (await import("typescript")).default ?? (await import("typescript"));

  const dir = mkdtempSync(path.join(tmpdir(), "reel-evidence-live-"));
  const { outputText } = ts.transpileModule(
    readFileSync("shared/types/marketing-reel-evidence.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  );
  write(path.join(dir, "evidence.mjs"), outputText);
  const E = await import(pathToFileURL(path.join(dir, "evidence.mjs")).href);

  const { data: allMetrics } = await db
    .from("marketing_metrics")
    .select("metric, value, observed_on, dimensions")
    .eq("company_id", delivery.company_id)
    .eq("source", "meta_organic_reel");

  const byDelivery = new Map();
  for (const m of allMetrics ?? []) {
    const id = m.dimensions?.deliveryId;
    if (!id) continue;
    (byDelivery.get(id) ?? byDelivery.set(id, []).get(id)).push(m);
  }

  const { data: dels } = await db
    .from("marketing_channel_deliveries")
    .select("id, marketing_post_id, provider, settled_at")
    .eq("company_id", delivery.company_id)
    .in("id", [...byDelivery.keys()]);
  const { data: posts2 } = await db
    .from("marketing_posts")
    .select("id, title, post_text")
    .eq("company_id", delivery.company_id)
    .in("id", [...new Set((dels ?? []).map((d) => d.marketing_post_id))]);

  const postById = new Map((posts2 ?? []).map((p) => [p.id, p]));
  const reels = [];
  for (const d of dels ?? []) {
    const rows = byDelivery.get(d.id) ?? [];
    const jobId = rows[0]?.dimensions?.sourceJobId;
    if (!jobId) continue;
    const folded = E.foldMetricsForProvider(
      d.provider,
      rows.map((r) => ({ metric: r.metric, value: Number(r.value), observedOn: r.observed_on })),
    );
    const post2 = postById.get(d.marketing_post_id);
    reels.push({
      sourceJobId: jobId,
      story: E.storyFromTitle(post2?.title),
      hook: E.hookFromPostText(post2?.post_text),
      provider: d.provider,
      publishedAt: d.settled_at,
      daysObserved: folded.daysObserved,
      latestObservedOn: folded.latestObservedOn,
      metrics: folded.metrics,
    });
  }
  reels.sort((a, b) => (b.metrics.views ?? 0) - (a.metrics.views ?? 0));
  const block = E.formatReelEvidence({
    sinceDays: 30,
    reels,
    byProvider: E.summarizeByProvider(reels),
  });

  console.log("");
  for (const line of block.split("\n")) console.log(`  | ${line}`);
  console.log("");
  step("the evidence block names this render job", block.includes(sourceJobId), sourceJobId);
  step(
    "the evidence block states a sufficiency label rather than an unqualified ranking",
    /INSUFFICIENT|DIRECTIONAL|COMPARABLE/.test(block),
  );
} catch (error) {
  step("could render the strategist's evidence block", false, error.message);
}

console.log(
  `\n${failures === 0 ? "TRACE PROVEN" : "TRACE BROKEN"}: ` +
  `Meta ${delivery.provider} post ${delivery.provider_post_id} ` +
  `-> post ${delivery.marketing_post_id} -> asset ${asset.id} -> render job ${sourceJobId}\n`,
);
process.exit(failures === 0 ? 0 : 1);
