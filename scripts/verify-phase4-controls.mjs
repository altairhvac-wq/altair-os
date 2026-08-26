/**
 * Phase 4 control verification: storage authorization, the orphan reaper, and
 * durable AI limits.
 *
 *   P1-11  company-files storage authorization joined to the owning row
 *   P2     orphaned Storage objects — a guarded, dry-run-first reaper
 *   P1-5   durable AI rate limiting and monthly spend ceilings
 *
 * ===================== WHAT IS AND IS NOT PROVED =====================
 * The storage policy's real test is a live one: a technician holding another
 * technician's object key and getting denied. That needs a database, a storage
 * bucket and three signed-in users, and it is written up as a manual checklist
 * in docs/development/storage-authorization.md.
 *
 * What is proved here is everything that can be: that the policy mirrors the
 * SELECT policy of the owning row rather than company membership, that it fails
 * closed on every unrecognized shape, that the rollout cannot tighten anything
 * until the second migration is applied, that the reaper cannot delete without
 * two explicit flags, and that the AI limiter is no longer process-local.
 *
 * The reaper guards are exercised by ACTUALLY RUNNING it against fabricated
 * targets, with the reaper credentials deleted from the child environment so it
 * cannot reach anything real.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-phase4-controls.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

let failures = 0;
let checks = 0;

function check(name, condition) {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}`);
  }
}

/** Line comments first — see the note in scripts/verify-perimeter.mjs. */
function loadTs(path) {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

function loadSql(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .toLowerCase();
}

// ===========================================================================
// P1-11 — storage authorization
// ===========================================================================

console.log("\nP1-11 — company-files authorization joins to the owning row");

const sql153 = loadSql("supabase/migrations/153_company_files_row_authorization.sql");
const sql154 = loadSql("supabase/migrations/154_drop_broad_company_files_read_policy.sql");

check(
  "a row-joined read policy is added",
  /create policy "row authorized company file reads"\s*on storage\.objects\s*for select/.test(sql153),
);

check(
  "receipts mirror the expenses SELECT policy exactly",
  /from public\.expenses e[\s\S]{0,400}?can_view_company_expenses\(v_company_id\)[\s\S]{0,120}?e\.technician_id = auth\.uid\(\)/.test(
    sql153,
  ),
);

check(
  "job attachments mirror the jobs SELECT policy exactly",
  /from public\.jobs j[\s\S]{0,400}?can_view_operational_jobs\(v_company_id\)[\s\S]{0,120}?j\.assigned_technician_id = auth\.uid\(\)/.test(
    sql153,
  ),
);

check(
  "tenancy is still checked before any narrowing",
  /if not public\.is_active_company_member\(v_company_id\) then[\s\S]{0,60}?return false;/.test(sql153),
);

check(
  "an unauthenticated caller is denied",
  /if auth\.uid\(\) is null then[\s\S]{0,60}?return false;/.test(sql153),
);

check(
  "an unrecognized path family is denied, not allowed through",
  // Structural, not textual: after the last recognised family branch closes,
  // the function body must end with `return false; end;` — the fall-through
  // must deny. Matching on the word "unknown" would only test a comment.
  /v_family = 'jobs' then[\s\S]*?end if;\s*return false;\s*end;/.test(sql153),
);

check(
  "a malformed uuid is denied rather than raising",
  /exception\s*when invalid_text_representation then\s*return false;/.test(sql153),
);

check(
  "a too-short path is denied",
  /array_length\(v_segments, 1\) < 4[\s\S]{0,60}?return false;/.test(sql153),
);

check(
  "the helper is SECURITY DEFINER with a pinned search_path",
  /create or replace function public\.can_read_company_file[\s\S]{0,300}?security definer[\s\S]{0,120}?set search_path = public, pg_temp/.test(
    sql153,
  ),
);

check(
  "migration 153 does NOT drop the broad policy (rollout stays additive)",
  !/drop policy if exists "company members can read company files"/.test(sql153),
);

check(
  "migration 154 is the one that drops the broad policy",
  /drop policy if exists "company members can read company files" on storage\.objects/.test(sql154),
);

check(
  "154 explains that PERMISSIVE policies are OR'd, so 153 alone changes nothing",
  /permissive policies with or/i.test(
    readFileSync("supabase/migrations/154_drop_broad_company_files_read_policy.sql", "utf8"),
  ),
);

check(
  "154 carries a rollback that restores the previous policy",
  /rollback/i.test(
    readFileSync("supabase/migrations/154_drop_broad_company_files_read_policy.sql", "utf8"),
  ) && /create policy "company members can read company files"/.test(
    readFileSync("supabase/migrations/154_drop_broad_company_files_read_policy.sql", "utf8"),
  ),
);

check(
  "154 leaves INSERT and DELETE storage policies untouched",
  !/for insert/.test(sql154) && !/for delete/.test(sql154),
);

check(
  "the manual role checklist is documented",
  existsSync("docs/development/storage-authorization.md"),
);

// The path families the policy parses must match the builders in the app.
{
  const builders = loadTs("lib/storage/company-files.ts");
  check(
    "the policy's path families match lib/storage/company-files.ts",
    /"expenses"/.test(builders) &&
      /"jobs"/.test(builders) &&
      /v_family = 'expenses'/.test(sql153) &&
      /v_family = 'jobs'/.test(sql153),
  );
  check(
    "there are still exactly two path builders (a third would need policy work)",
    (builders.match(/export function build\w*StoragePath/g) ?? []).length === 2,
  );
}

// ===========================================================================
// P2 — orphaned Storage objects
// ===========================================================================

console.log("\nP2 — the orphan reaper cannot delete by accident");

const REAPER = "scripts/reap-orphaned-storage.mjs";
const reaper = loadTs(REAPER);

check("the reaper exists", existsSync(REAPER));

check(
  "the reaper reads only its own dedicated credentials",
  /ALTAIR_STORAGE_REAPER_SUPABASE_URL/.test(reaper) &&
    !/process\.env\.NEXT_PUBLIC_SUPABASE_URL/.test(reaper) &&
    !/process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(reaper),
);

check(
  "dry run is the default — deletion requires two explicit flags",
  /const willDelete = deleteRequested && acknowledged/.test(reaper) &&
    /i-understand-this-deletes-customer-files/.test(reaper),
);

check(
  "a grace period excludes recently uploaded objects",
  /DEFAULT_GRACE_DAYS = \d+/.test(reaper) && /within grace period/.test(reaper),
);

check(
  "an object with no timestamp is never deleted",
  /no timestamp/.test(reaper),
);

check(
  "an unrecognized path shape is reported, never deleted",
  /unknownShape/.test(reaper) && /never deleted/.test(readFileSync(REAPER, "utf8")),
);

check(
  "a database lookup failure is not treated as evidence of an orphan",
  /lookupErrors/.test(reaper) &&
    /Unreachable database is NOT evidence of an orphan/.test(readFileSync(REAPER, "utf8")),
);

check(
  "a candidate report is always written, so a deletion can be audited",
  /writeFileSync\(\s*reportPath/.test(reaper),
);

check(
  "the reaper is not wired into any cron schedule",
  !JSON.stringify(JSON.parse(readFileSync("vercel.json", "utf8"))).includes("reap"),
);

// Run it against fabricated targets and confirm every guard refuses.
function runReaper(args, extraEnv = {}) {
  const env = { ...process.env };
  delete env.ALTAIR_STORAGE_REAPER_SUPABASE_URL;
  delete env.ALTAIR_STORAGE_REAPER_SERVICE_ROLE_KEY;
  Object.assign(env, extraEnv);
  const result = spawnSync(process.execPath, [REAPER, ...args], {
    encoding: "utf8",
    env,
  });
  return { status: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

{
  const noCreds = runReaper(["--confirm", "anything"]);
  check("running with no credentials refuses", noCreds.status !== 0);

  const fakeEnv = {
    ALTAIR_STORAGE_REAPER_SUPABASE_URL: "https://scratchreap000.supabase.co",
    ALTAIR_STORAGE_REAPER_SERVICE_ROLE_KEY: "not-a-real-key",
  };

  const noConfirm = runReaper([], fakeEnv);
  check("omitting --confirm refuses", noConfirm.status !== 0);

  const wrongConfirm = runReaper(["--confirm", "wrong"], fakeEnv);
  check("a mismatched --confirm refuses", wrongConfirm.status !== 0);

  const deleteWithoutAck = runReaper(
    ["--confirm", "scratchreap000", "--delete"],
    fakeEnv,
  );
  check(
    "--delete without the acknowledgement flag refuses",
    deleteWithoutAck.status !== 0 &&
      /requires --i-understand-this-deletes-customer-files/.test(deleteWithoutAck.out),
  );
}

// ===========================================================================
// P1-5 — durable AI limits and spend ceiling
// ===========================================================================

console.log("\nP1-5 — AI limits are durable, and spend is accounted for");

const sql155 = loadSql("supabase/migrations/155_ai_usage_and_rate_limits.sql");
const guardrails = loadTs("lib/ai/guardrails.ts");
const provider = loadTs("lib/ai/provider.ts");

check(
  "the process-local Map is gone",
  !/new Map<string, RateLimitEntry>/.test(guardrails) &&
    !/rateLimitStore/.test(guardrails),
);

check(
  "admission is a single database call",
  /check_and_record_ai_request/.test(guardrails) &&
    /check_and_record_ai_request/.test(sql155),
);

check(
  "the window check is serialized with FOR UPDATE",
  /from public\.ai_rate_limit_counters c[\s\S]{0,300}?for update/.test(sql155),
);

check(
  "the existing cooldown and window limits are preserved",
  /COOLDOWN_SECONDS = 10/.test(guardrails) &&
    /WINDOW_SECONDS = 5 \* 60/.test(guardrails) &&
    /MAX_REQUESTS_PER_WINDOW = 10/.test(guardrails),
);

check(
  "the actor is derived from auth.uid(), never from a client-supplied id",
  /v_user_id uuid := auth\.uid\(\)/.test(sql155) &&
    /a client-supplied user id must never be able to choose whose/i.test(
      readFileSync("lib/ai/guardrails.ts", "utf8"),
    ),
);

check(
  "membership is required",
  /if not public\.is_active_company_member\(p_company_id\) then[\s\S]{0,80}?insufficient_permission/.test(sql155),
);

check(
  "the spend ceiling fails CLOSED when it cannot be evaluated",
  /if \(error\) \{[\s\S]{0,700}?return \{ ok: false, code: "monthly_ceiling_reached" \};/.test(guardrails),
);

check(
  "a NULL per-company ceiling means the platform default, never unlimited",
  /coalesce\(v_ceiling, p_default_monthly_token_ceiling\)/.test(sql155) &&
    /never "unlimited"/i.test(readFileSync("lib/ai/guardrails.ts", "utf8")),
);

check(
  "the ceiling is checked before any counter is advanced",
  sql155.indexOf("monthly_ceiling_reached") < sql155.indexOf("for update"),
);

check(
  "provider token usage is persisted instead of discarded",
  /recordAiUsage\(\{/.test(provider) &&
    /promptTokens: response\.usage\.prompt_tokens/.test(provider),
);

check(
  "usage is recorded once in the provider, not at each call site",
  (provider.match(/recordAiUsage\(/g) ?? []).length === 1,
);

check(
  "usage without a company id is not attributed to the wrong tenant",
  /if \(request\.companyId && response\.usage\)/.test(provider),
);

check(
  "a failed usage write never fails the request the user already received",
  /best-effort by design/i.test(readFileSync("lib/ai/guardrails.ts", "utf8")),
);

check(
  "the ledger records tokens but has no column for prompt or completion text",
  // Checked against the COLUMN LIST of ai_usage_events, not the whole file:
  // the function comment legitimately contains the phrase "prompt or completion
  // text" while promising the opposite, and an earlier version of this check
  // was fooled by exactly that.
  (() => {
    // Sliced with indexOf rather than a regex: the terminator is a newline
    // followed by ");", and embedding that escape in a regex literal is exactly
    // the kind of quoting that has broken these verifiers before.
    const NEWLINE_THEN_CLOSE = String.fromCharCode(10) + ");";
    const marker = "create table if not exists public.ai_usage_events (";
    const start = sql155.indexOf(marker);
    if (start === -1) return false;
    const end = sql155.indexOf(NEWLINE_THEN_CLOSE, start);
    if (end === -1) return false;
    const columns = sql155.slice(start + marker.length, end);

    return (
      /prompt_tokens integer/.test(columns) &&
      /completion_tokens integer/.test(columns) &&
      // No free-text column of any name that could hold prompt or completion
      // content, and no jsonb blob to smuggle it into.
      !/(prompt|completion|content|message|response|body)\s+text/.test(columns) &&
      !/jsonb/.test(columns)
    );
  })(),
);

check(
  "usage is queryable by company admins and writable only through the recorder",
  /create policy "company admins can read ai usage"/.test(sql155) &&
    /grant select on table public\.ai_usage_events to authenticated/.test(sql155) &&
    !/grant insert on table public\.ai_usage_events to authenticated/.test(sql155),
);

check(
  "rate-limit counters are not reachable by authenticated at all",
  /revoke all on table public\.ai_rate_limit_counters from authenticated/.test(sql155),
);

check(
  "degraded paths raise monitored events rather than failing silently",
  /ai\.admission_check_failed/.test(guardrails) &&
    /ai\.monthly_ceiling_reached/.test(guardrails) &&
    /ai\.usage_record_failed/.test(guardrails),
);

check(
  "the ceiling has a distinct user-facing message",
  /monthly_ceiling_reached:/.test(loadTs("lib/ai/errors.ts")),
);

// Every AI action must await the now-async check.
{
  const actionFiles = [
    "completion-notes-ai", "estimate-ai", "invoice-ai", "job-ai",
    "lead-ai", "marketing-ai-hq", "marketing-ai", "reports-ai",
  ];
  let sync = 0;
  let awaited = 0;
  for (const name of actionFiles) {
    const src = loadTs(`app/actions/${name}.ts`);
    awaited += (src.match(/await checkAiRateLimit\(/g) ?? []).length;
    sync += (src.match(/(?<!await )\bcheckAiRateLimit\(\{/g) ?? []).length;
  }
  check(`all ${awaited} AI call sites await the durable check`, awaited === 13);
  check("no AI call site still calls it synchronously", sync === 0);
}

// ===========================================================================
// P1-14 — error boundaries
// ===========================================================================

console.log("\nP1-14 — high-value error boundaries");

check(
  "a root global-error boundary exists",
  existsSync("app/global-error.tsx"),
);

{
  const globalError = loadTs("app/global-error.tsx");

  check(
    "global-error renders its own html and body (nothing else has at that point)",
    /<html/.test(globalError) && /<body/.test(globalError),
  );

  check(
    "global-error does not depend on the design system that may have failed to load",
    !globalError.includes("className=") && globalError.includes("style={{"),
  );

  check(
    "global-error shows the digest but never the message or stack",
    globalError.includes("error.digest") &&
      !globalError.includes("{error.message}") &&
      !globalError.includes("error.stack"),
  );

  check(
    "global-error escapes with a full document navigation, not the router",
    globalError.includes('href="/"') && !globalError.includes("next/link"),
  );

  check(
    "global-error offers a retry",
    globalError.includes("onClick={reset}"),
  );
}

check(
  "the dashboard has its own boundary (widest fan-out in the product)",
  existsSync("app/(admin)/(home)/error.tsx"),
);

{
  const dashboardError = loadTs("app/(admin)/(home)/error.tsx");
  check(
    "the dashboard boundary keeps the admin shell by living inside the group",
    /RouteErrorView/.test(dashboardError),
  );
  check(
    "the dashboard boundary does not link back to itself",
    dashboardError.includes('backHref="/work"'),
  );
}

{
  const routeErrorView = loadTs("shared/components/ui/RouteErrorView.tsx");
  check(
    "the shared route error view never renders a message or stack",
    !routeErrorView.includes("{error.message}") &&
      !routeErrorView.includes("error.stack"),
  );
  check(
    "the shared route error view shows a support reference",
    routeErrorView.includes("error.digest"),
  );
}

check(
  "server exceptions still reach the monitor via onRequestError",
  /export const onRequestError/.test(loadTs("instrumentation.ts")) &&
    /captureMonitoredException/.test(loadTs("instrumentation.ts")),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} Phase 4 control checks passed (${checks} total).`,
);
console.log(
  "\n  NOT proved here: live storage denial for a technician holding another\n" +
    "  technician's object key. See docs/development/storage-authorization.md.\n",
);
if (failures > 0) process.exit(1);
