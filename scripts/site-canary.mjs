/**
 * The supervised Altair-website publish canary.
 *
 * ===================== WHAT THIS IS =====================
 * A one-shot operator command that publishes ONE real SEO page through the
 * ordinary first-party path, so the first live page is created with a human
 * watching. Not a cron, not a worker, not autonomous SEO publishing: it runs
 * once, when a person types it, and exits.
 *
 * ===================== WHAT IT DOES NOT BYPASS =====================
 * It assembles real rows and calls `dispatchPublish` — the same function any
 * caller uses. The kill switch is resolved by the gate from the real
 * environment (no `env` is passed), the approval is a real
 * `marketing_publish_jobs` row with a real approver, the duplicate guard is
 * `claimDelivery`, and the page's own rules — metadata, the 600-character
 * floor, the canonical, internal links, no script tags — live in the adapter
 * and in migration 187's CHECK constraints.
 *
 * --dry-run is the default; --apply is required to write.
 * --confirm <project-ref> must match the configured project.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/site-canary.mjs --confirm <ref> --article ./.tmp/canary-article.json \
 *        --approved-by you@example.com [--apply] [--revise "why"]
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { dispatchPublish } from "@/lib/publishing/dispatch";
import { capabilityFor } from "@/shared/types/integration-capability";
import { deriveMarketingChannelState } from "@/shared/types/marketing-channel-connection";
import { isAltairSiteConfigured, getAltairSiteConfig } from "@/lib/integrations/altair-site/env";
import { canonicalUrlFor, isValidSlug } from "@/shared/types/site-page";

const PROVIDER = "altair_site";
const ROOT = path.resolve(import.meta.dirname, "..");

for (const [k, v] of Object.entries(
  Object.fromEntries(
    fs
      .readFileSync(path.join(ROOT, ".env.local"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        let v = l.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        return [l.slice(0, i).trim(), v];
      }),
  ),
)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

const argv = process.argv.slice(2);
const flag = (n) => {
  const eq = argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3).trim();
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1].trim() : undefined;
};
const APPLY = argv.includes("apply") || argv.includes("--apply");
const CONFIRM = flag("confirm");
const ARTICLE = flag("article");
const APPROVER = flag("approved-by");
const REVISE = flag("revise");

let failed = false;
const fail = (m, d) => {
  failed = true;
  console.error(`\nREFUSED: ${m}`);
  if (d !== undefined) console.error(d);
};
const step = (m) => console.log(`  ${m}`);
const die = () => {
  console.error("\nNothing was published and nothing was written.\n");
  process.exit(1);
};

console.log("\nPreflight");

if (!CONFIRM) fail("--confirm <project-ref> is required.");
if (!ARTICLE) fail("--article <path-to-json> is required.");
if (!APPROVER) fail("--approved-by <email> is required.");
if (failed) die();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!SUPABASE_URL || !SERVICE_KEY) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.");
  die();
}

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== CONFIRM) {
  fail(`--confirm ${CONFIRM} does not match the configured project '${projectRef}'.`);
  die();
}
step(`project           ${projectRef}`);

const publishMode = process.env.MARKETING_PUBLISH_MODE ?? "(unset)";
if (publishMode !== "live") {
  fail(
    `MARKETING_PUBLISH_MODE is '${publishMode}', not 'live'.`,
    "Publishing is disarmed. Set MARKETING_PUBLISH_MODE=live in .env.local, then disarm it afterwards.",
  );
  die();
}
step(`publish mode      live`);

if (!isAltairSiteConfigured()) {
  fail(
    "The Altair site origin is not configured.",
    "Set ALTAIR_SITE_ORIGIN to the https origin the site is served from (NEXT_PUBLIC_APP_URL is http/localhost here).",
  );
  die();
}
const siteOrigin = getAltairSiteConfig().siteOrigin;
step(`site origin       ${siteOrigin}`);

const article = JSON.parse(fs.readFileSync(path.resolve(ARTICLE), "utf8"));
if (!isValidSlug(article.slug)) {
  fail(`The article slug '${article.slug}' is not a valid URL segment.`);
  die();
}
step(`slug              ${article.slug}`);
step(`body length       ${article.bodyMarkdown.length} characters`);
step(`canonical         ${canonicalUrlFor(siteOrigin, article.slug)}`);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: account, error: acctErr } = await supabase
  .from("marketing_connected_accounts")
  .select(
    "id, company_id, provider, provider_account_id, provider_account_name, provider_resource_id, provider_resource_name, status, integration_kind, granted_scopes, publish_capability, capability_detail, token_expires_at, last_error",
  )
  .eq("provider", PROVIDER)
  .eq("status", "connected")
  .maybeSingle();

if (acctErr || !account) {
  fail("No connected altair_site account.", "Enable it in Settings → Integrations first.");
  die();
}

const facts = {
  status: account.status,
  publishCapability: account.publish_capability,
  tokenExpiresAt: account.token_expires_at,
  hasRefreshToken: false,
  lastError: account.last_error,
  capabilityDetail: account.capability_detail,
  accountName: account.provider_account_name,
  resourceName: account.provider_resource_name,
};
const nowIso = new Date().toISOString();
const channelState = deriveMarketingChannelState({ configured: true, account: facts, nowIso });
step(`connection state  ${channelState}`);

if (channelState !== "DIRECT_PUBLISH_READY") {
  fail(`The connection is ${channelState}.`, "Re-enable it in Settings → Integrations.");
  die();
}

const { data: approver } = await supabase
  .from("profiles").select("id, email").eq("email", APPROVER.toLowerCase()).maybeSingle();
if (!approver) {
  fail(`No profile for ${APPROVER}.`);
  die();
}
const { data: membership } = await supabase
  .from("company_memberships").select("role, status")
  .eq("company_id", account.company_id).eq("user_id", approver.id).maybeSingle();
if (!membership || !["owner", "admin"].includes(membership.role) || membership.status !== "active") {
  fail(`${APPROVER} is not an active owner or admin of this company.`);
  die();
}
step(`approver          ${approver.email} (${membership.role})`);

console.log("\nPlan");
step(`title             ${article.title}`);
step(`public path       /insights/${article.slug}`);
step(`keyword           ${article.primaryKeyword}`);
if (REVISE) step(`revision note     ${REVISE}`);

if (!APPLY) {
  console.log("\nDRY RUN — nothing was published and nothing was written.\nRe-run with --apply.\n");
  process.exit(0);
}

console.log("\nApplying");

// ---- content package: one per (company, source_type, source_id) ------------
const SOURCE_ID = "00000000-0000-4000-8000-0000000000c1";
// Migration 182's package key is a PARTIAL unique index
// (`where source_id is not null`), and Postgres cannot use a partial index
// as an ON CONFLICT target without repeating its predicate — the first
// version of this script tried and was refused. Lookup-then-insert is what
// that index actually supports, and the index still prevents a race.
const existingPkg = await supabase
  .from("marketing_content_packages")
  .select("id")
  .eq("company_id", account.company_id)
  .eq("source_type", "other")
  .eq("source_id", SOURCE_ID)
  .maybeSingle();

let packageId = existingPkg.data?.id;
if (!packageId) {
  const pkgInsert = await supabase
    .from("marketing_content_packages")
    .insert({
      company_id: account.company_id,
      title: article.title,
      source_type: "other",
      source_id: SOURCE_ID,
      package_state: "approved",
      created_by: approver.id,
      approved_by: approver.id,
      approved_at: nowIso,
      brief: {
        seo: {
          slug: article.slug,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          keywords: article.keywords,
        },
        primaryKeyword: article.primaryKeyword,
        searchIntent: article.searchIntent,
        cta: article.cta,
      },
    })
    .select("id")
    .single();

  if (pkgInsert.error) {
    fail("Could not create the content package.", pkgInsert.error.message);
    die();
  }
  packageId = pkgInsert.data.id;
}
step(`content package   ${packageId}`);

// ---- marketing post: the publishable unit the ledger keys on ---------------
// ============ WHY A REVISION GETS ITS OWN POST ============
// 143's ledger is keyed `unique (company_id, marketing_post_id, provider)`,
// so one post publishes to one provider exactly once — forever. That is the
// duplicate guard working, and a revision must not weaken it.
//
// A revision is NEW editorial work: different copy, published deliberately,
// deserving its own approval and its own ledger entry. So it gets its own
// post. The PAGE is the durable thing and keeps its slug; the post is the
// record of one publish attempt. Nothing is bypassed — the revision passes
// the same gate, the same approval and the same claim as the first publish.
const existingPost = REVISE
  ? { data: null }
  : await supabase
      .from("marketing_posts").select("id")
      .eq("company_id", account.company_id).eq("content_package_id", packageId)
      .eq("channel_target", "website").is("deleted_at", null).maybeSingle();

let postId = existingPost.data?.id;
if (!postId) {
  const ins = await supabase.from("marketing_posts").insert({
    company_id: account.company_id,
    title: article.title,
    channel_target: "website",
    post_text: article.metaDescription,
    status: "ready",
    source_type: "other",
    content_package_id: packageId,
    created_by: approver.id,
  }).select("id").single();
  if (ins.error) {
    fail("Could not create the marketing post.", ins.error.message);
    die();
  }
  postId = ins.data.id;
}
step(`marketing post    ${postId}`);

// ---- the approval ---------------------------------------------------------
const jobUpsert = await supabase
  .from("marketing_publish_jobs")
  .upsert(
    {
      company_id: account.company_id,
      marketing_post_id: postId,
      content_package_id: packageId,
      provider: PROVIDER,
      connected_account_id: account.id,
      job_state: "approved",
      requires_approval: true,
      approved_by: approver.id,
      approved_at: nowIso,
      max_attempts: capabilityFor(PROVIDER).maxAttempts,
    },
    { onConflict: "company_id,marketing_post_id,provider" },
  )
  .select("id, approved_at")
  .single();

if (jobUpsert.error) {
  fail("Could not create the approved publish job.", jobUpsert.error.message);
  die();
}
step(`publish job       ${jobUpsert.data.id}`);
step(`approved_at       ${jobUpsert.data.approved_at}`);

// ---- dispatch through the real path ---------------------------------------
console.log("\nDispatching through the ordinary publish path");

const result = await dispatchPublish({
  account: {
    connectedAccountId: account.id,
    companyId: account.company_id,
    provider: PROVIDER,
    integrationKind: account.integration_kind ?? "first_party",
    providerAccountId: account.provider_account_id,
    providerResourceId: account.provider_resource_id,
    grantedScopes: account.granted_scopes ?? [],
    facts,
  },
  marketingPostId: postId,
  jobApprovedAt: jobUpsert.data.approved_at,
  title: article.title,
  body: article.bodyMarkdown,
  hashtags: [],
  link: article.cta?.url ?? null,
  media: [],
  nowIso: new Date().toISOString(),
  configured: true,
  publishedBy: approver.id,
  contentPackageId: packageId,
  seo: {
    slug: article.slug,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    canonicalUrl: null,
    keywords: article.keywords,
  },
  internalLinks: article.internalLinks ?? [],
  changeNote: REVISE ?? "First supervised publish.",
  // No `env`: the gate reads the real kill switch.
});

console.log("\nResult");
if (!result.ok) {
  console.error(`  outcome           REFUSED (${result.refusal})`);
  console.error(`  detail            ${result.detail}`);
  console.error(`  safe to retry     ${result.safeToRetry}`);
  if (result.refusal === "NOT_CLAIMED") {
    console.log("\nThis is the duplicate guard: the page was already published. Nothing was written again.\n");
  }
} else {
  console.log(`  outcome           ${result.outcome.outcome}`);
  console.log(`  page id           ${result.outcome.providerPostId}`);
  console.log(`  permalink         ${result.outcome.providerPermalink}`);
  console.log(`  delivery id       ${result.deliveryId}`);
  const r = result.outcome.providerResult ?? {};
  console.log(`  slug (readback)   ${r.slug}`);
  console.log(`  state (readback)  ${r.pageState}`);
  console.log(`  revision          ${r.revision}`);
  console.log(`  created           ${r.created}`);
}

// ---- the ledger, read back ------------------------------------------------
const del = await supabase
  .from("marketing_channel_deliveries")
  .select("id, delivery_state, provider_post_id, provider_permalink, provider_result, settled_at, failure_detail")
  .eq("company_id", account.company_id).eq("marketing_post_id", postId).eq("provider", PROVIDER)
  .maybeSingle();

console.log("\nDelivery ledger row");
if (del.data) {
  console.log(`  delivery_state    ${del.data.delivery_state}`);
  console.log(`  provider_post_id  ${del.data.provider_post_id}`);
  console.log(`  provider_permalink ${del.data.provider_permalink}`);
  console.log(`  settled_at        ${del.data.settled_at}`);
  if (del.data.failure_detail) console.log(`  failure_detail    ${del.data.failure_detail}`);
  console.log(`  provider_result   ${JSON.stringify(del.data.provider_result)}`);
} else {
  console.error("  (no delivery row)", del.error?.message);
}

// ---- the page and its revisions -------------------------------------------
const { data: pages } = await supabase
  .from("marketing_site_pages")
  .select("id, slug, page_state, revision, canonical_url, meta_title, meta_description, published_at, updated_at")
  .eq("company_id", account.company_id);

console.log("\nSite pages");
for (const p of pages ?? []) {
  console.log(`  /${p.slug}  ${p.page_state}  r${p.revision}  ${p.canonical_url}`);
}
console.log(`  total pages       ${pages?.length ?? 0}`);

const { data: revs } = await supabase
  .from("marketing_site_page_revisions")
  .select("revision, change_note, created_at")
  .eq("company_id", account.company_id)
  .order("revision", { ascending: true });

console.log("\nRevision audit trail");
for (const r of revs ?? []) {
  console.log(`  r${r.revision}  ${r.created_at}  ${r.change_note ?? "(no note)"}`);
}

console.log("\nDisarm publishing when finished: MARKETING_PUBLISH_MODE=off\n");
process.exit(result.ok ? 0 : 1);
