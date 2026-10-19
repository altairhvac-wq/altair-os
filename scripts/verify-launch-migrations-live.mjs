// READ-ONLY production probes for migrations 199 + 200. No rows are selected,
// no RPC is executed; only HEAD counts and the PostgREST OpenAPI document.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = process.argv[2] ?? ".env.local";
const env = Object.fromEntries(
  readFileSync(envPath, "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim()]; }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
console.log("project host:", new URL(url).host);
const admin = createClient(url, key, { auth: { persistSession: false } });

const openapi = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).then((r) => r.json());
const rpc = (name) => openapi.paths?.[`/rpc/${name}`];

let pass = 0, fail = 0;
function check(name, ok, detail = "") { (ok ? pass++ : fail++); console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); }

// PostgREST answers a HEAD on a table it does not know with 204 and no count,
// and supabase-js reports no error for it. So "no error" proves nothing: the
// probe requires a real count AND a definition in the OpenAPI document.
async function tableExists(table) {
  const { error, status, count } = await admin
    .from(table)
    .select("*", { head: true, count: "exact" });
  const described = Boolean(openapi.definitions?.[table]);
  const ok = !error && status === 200 && typeof count === "number" && described;
  return {
    ok,
    detail: ok
      ? `${count} rows`
      : error
        ? `${error.code ?? ""} ${error.message}`
        : `status ${status}, count ${count}, in schema document: ${described}`,
  };
}
async function columnExists(table, column) {
  const { error } = await admin.from(table).select(column).limit(0);
  return { ok: !error, detail: error ? `${error.code ?? ""} ${error.message}` : "" };
}

console.log("\nMigration 199 — launch safety hardening");
for (const t of ["subscription_dunning_notices"]) { const r = await tableExists(t); check(`table ${t} exists`, r.ok, r.detail); }
{ const r = await columnExists("company_memberships", "invite_expires_at"); check("company_memberships.invite_expires_at exists", r.ok, r.detail); }
check("current_user_email_is_confirmed() is exposed", Boolean(rpc("current_user_email_is_confirmed")));
check("accept_network_help_offer(4 uuid) is exposed", Boolean(rpc("accept_network_help_offer")));
check("can_access_platform_admin() is exposed", Boolean(rpc("can_access_platform_admin")));
{
  const def = openapi.definitions?.subscription_dunning_notices;
  check("dunning table describes provider + event columns", Boolean(def?.properties?.provider && (def?.properties?.provider_event_id || def?.properties?.event_id)), def ? Object.keys(def.properties).join(",") : "no definition");
}

console.log("\nMigration 200 — card-free trial bootstrap");
{ const r = await tableExists("saas_trial_reminders"); check("table saas_trial_reminders exists", r.ok, r.detail); }
{
  const p = rpc("bootstrap_company_for_new_user");
  const text = JSON.stringify(p ?? {});
  check("bootstrap_company_for_new_user is exposed", Boolean(p));
  check("its comment mentions the card-free trial", /card-free trial/i.test(text), p ? (p.post?.summary ?? p.post?.description ?? "").slice(0, 140) : "");
  const params = p?.post?.parameters?.[0]?.schema?.properties ?? {};
  check("it takes two text arguments (text,text overload only after 199)", Object.keys(params).length === 2, Object.keys(params).join(","));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
