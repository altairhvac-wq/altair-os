/**
 * Workflow reminder dashboard surfacing smoke test (Phase 1.2).
 * Run: node scripts/test-workflow-reminder-dashboard.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const envPath = path.join(ROOT, ".env.local");

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env.local");
  }

  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

async function resolveTestCompanyId(admin) {
  const preferredNames = ["Altair HVAC", "Altair Demo", "Demo HVAC"];

  for (const name of preferredNames) {
    const { data, error } = await admin
      .from("companies")
      .select("id, name")
      .ilike("name", `%${name}%`)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Company lookup failed: ${error.message}`);
    }

    if (data?.id) {
      return { companyId: data.id, companyName: data.name };
    }
  }

  throw new Error("No preferred test company found");
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { companyId, companyName } = await resolveTestCompanyId(admin);

  const { count: activeCount, error: countError } = await admin
    .from("workflow_reminders")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");

  if (countError) {
    throw new Error(`Active reminder count failed: ${countError.message}`);
  }

  const { data: preview, error: previewError } = await admin
    .from("workflow_reminders")
    .select("id, title, reminder_kind, source_entity_type, status")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("triggered_at", { ascending: true })
    .limit(8);

  if (previewError) {
    throw new Error(`Dashboard preview query failed: ${previewError.message}`);
  }

  const dashboardLimit = 8;
  const visible = Math.min(activeCount ?? 0, dashboardLimit);

  console.log("Workflow reminder dashboard smoke test");
  console.log(`Company: ${companyName} (${companyId})`);
  console.log(`Active reminders: ${activeCount ?? 0}`);
  console.log(`Dashboard would show: ${visible} of ${activeCount ?? 0}`);
  console.log("Preview rows:");
  for (const row of preview ?? []) {
    console.log(
      `  - [${row.reminder_kind}] ${row.title} (${row.source_entity_type}, ${row.id})`,
    );
  }

  const testReminderId = randomUUID();
  const testSourceEntityId = randomUUID();
  const now = new Date().toISOString();
  const { data: inserted, error: insertError } = await admin
    .from("workflow_reminders")
    .insert({
      id: testReminderId,
      company_id: companyId,
      reminder_kind: "lead_follow_up_due",
      source_entity_type: "lead",
      source_entity_id: testSourceEntityId,
      status: "active",
      title: "Phase 1.2 dashboard action smoke test",
      message: "Temporary reminder for action validation.",
      triggered_at: now,
      metadata: { smokeTest: true },
    })
    .select("id, status")
    .single();

  if (insertError) {
    throw new Error(`Test reminder insert failed: ${insertError.message}`);
  }

  const snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error: snoozeError } = await admin
    .from("workflow_reminders")
    .update({ status: "snoozed", snoozed_until: snoozedUntil })
    .eq("company_id", companyId)
    .eq("id", inserted.id);

  if (snoozeError) {
    throw new Error(`Snooze test failed: ${snoozeError.message}`);
  }

  const { data: snoozed, error: snoozedReadError } = await admin
    .from("workflow_reminders")
    .select("status, snoozed_until")
    .eq("company_id", companyId)
    .eq("id", inserted.id)
    .single();

  if (snoozedReadError) {
    throw new Error(`Snoozed read failed: ${snoozedReadError.message}`);
  }

  console.log(`Action test snooze: status=${snoozed.status}, until=${snoozed.snoozed_until}`);

  const { error: deleteError } = await admin
    .from("workflow_reminders")
    .delete()
    .eq("company_id", companyId)
    .eq("id", inserted.id);

  if (deleteError) {
    throw new Error(`Test reminder cleanup failed: ${deleteError.message}`);
  }

  console.log("Test reminder cleaned up.");
  console.log("Smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
