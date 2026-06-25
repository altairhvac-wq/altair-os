/**
 * Workflow reminder evaluation smoke test (Phase 1.1).
 * Run: node scripts/test-workflow-reminder-evaluation.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

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

function ensureServerOnlyStub() {
  const stubDir = path.join(ROOT, "node_modules", "server-only");
  fs.mkdirSync(stubDir, { recursive: true });
  fs.writeFileSync(
    path.join(stubDir, "package.json"),
    JSON.stringify({ name: "server-only", type: "commonjs", main: "index.js" }),
  );
  fs.writeFileSync(path.join(stubDir, "index.js"), "module.exports = {};\n");
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

  const { data, error } = await admin
    .from("companies")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Fallback company lookup failed: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("No company found for smoke test");
  }

  return { companyId: data.id, companyName: data.name };
}

async function countReminders(admin, companyId) {
  const { count, error } = await admin
    .from("workflow_reminders")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    throw new Error(`Reminder count failed: ${error.message}`);
  }

  return count ?? 0;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

  ensureServerOnlyStub();

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { companyId, companyName } = await resolveTestCompanyId(admin);
  console.log(`Using test company: ${companyName}`);

  const { evaluateWorkflowRemindersForCompany } = await import(
    pathToFileURL(
      path.join(ROOT, "lib/database/services/evaluate-workflow-reminders.ts"),
    ).href
  );

  const beforeCount = await countReminders(admin, companyId);
  const firstRun = await evaluateWorkflowRemindersForCompany({ companyId });
  const afterFirstCount = await countReminders(admin, companyId);
  const secondRun = await evaluateWorkflowRemindersForCompany({ companyId });
  const afterSecondCount = await countReminders(admin, companyId);

  console.log("First run:", firstRun);
  console.log("Second run:", secondRun);
  console.log("Reminder row counts:", {
    before: beforeCount,
    afterFirst: afterFirstCount,
    afterSecond: afterSecondCount,
  });

  if (afterSecondCount !== afterFirstCount) {
    throw new Error("Duplicate rows may have been created on second run");
  }

  if (secondRun.created > 0) {
    throw new Error("Second run created new reminders (expected idempotent no-op)");
  }

  if (secondRun.updated > 0) {
    throw new Error("Second run updated reminders (expected idempotent no-op)");
  }

  if (firstRun.errors.length > 0) {
    throw new Error("Evaluator reported errors on first run");
  }

  console.log("Workflow reminder evaluation smoke test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
