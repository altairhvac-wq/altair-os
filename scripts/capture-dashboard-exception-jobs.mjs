/**
 * Capture Dashboard exception board with Jobs bucket expanded.
 * Creates a temporary unassigned job for today (deleted afterward) when
 * the Jobs bucket is absent, so Dispatch overload can stay visible too.
 *
 * Usage:
 *   node scripts/capture-dashboard-exception-jobs.mjs
 *   BASE_URL=http://localhost:3000 node scripts/capture-dashboard-exception-jobs.mjs
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUTPUT_DIR = path.join(
  ROOT,
  "public",
  "marketing",
  "screenshots",
  "comparison",
);
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";
const COMPANY_ID = "e7481798-414f-4a40-9bbf-e0ce3f288d3b";
const SUPABASE_PROJECT_REF = "acsmgzkbvstrbggsukyx";
const TEMPLATE_JOB_ID = "20577284-3ab0-4fbf-a7ff-dff80416f587";

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
      .filter(([key]) => key),
  );
}

function getServiceRoleKey(env) {
  const fromEnv =
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const raw = execSync(
      `npx supabase projects api-keys --project-ref ${SUPABASE_PROJECT_REF} -o json`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) return null;
    const keys = JSON.parse(raw.slice(start, end + 1));
    return keys.find((key) => key.name === "service_role")?.api_key ?? null;
  } catch {
    return null;
  }
}

function createAdmin() {
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = getServiceRoleKey(env);
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing Supabase URL or service role key");
  }
  return createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createTempUnassignedJob(admin) {
  const { data: template, error } = await admin
    .from("jobs")
    .select("*")
    .eq("id", TEMPLATE_JOB_ID)
    .single();
  if (error || !template) {
    throw new Error(
      `Template job missing: ${error?.message ?? TEMPLATE_JOB_ID}`,
    );
  }

  // Schedule inside the company timezone's current calendar day
  // (America/New_York). Wall-clock UTC can already be "tomorrow".
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  // 15:00 UTC ≈ 11:00 EDT — safely inside the NY day window.
  const scheduledAt = `${y}-${m}-${d}T15:00:00.000Z`;

  const suffix = Date.now().toString().slice(-6);
  const insert = {
    company_id: COMPANY_ID,
    customer_id: template.customer_id,
    job_number: `JOB-EXC-${suffix}`,
    service_address: template.service_address,
    city: template.city,
    state: template.state,
    postal_code: template.postal_code,
    job_type: "Exception board capture",
    scheduled_at: scheduledAt,
    status: "scheduled",
    priority: "high",
    description: "Temporary unassigned job for Dashboard Jobs bucket capture.",
    notes: null,
    assigned_technician_id: null,
    is_demo: true,
  };

  const { data: created, error: insertError } = await admin
    .from("jobs")
    .insert(insert)
    .select("id, job_number")
    .single();
  if (insertError || !created) {
    throw new Error(`Failed to create temp job: ${insertError?.message}`);
  }
  console.log(`Created temp unassigned job ${created.job_number} (${created.id})`);
  return created.id;
}

async function deleteTempJob(admin, jobId) {
  const { error } = await admin.from("jobs").delete().eq("id", jobId);
  if (error) {
    throw new Error(`Failed to delete temp job ${jobId}: ${error.message}`);
  }
  console.log(`Deleted temp job ${jobId}`);
}

async function bucketTitles(page) {
  const board = page.locator('[aria-label="Needs attention"]');
  return board.locator("summary p, a p").evaluateAll((nodes) => {
    const seen = [];
    for (const node of nodes) {
      if (!String(node.className || "").includes("font-semibold")) continue;
      const text = node.textContent?.trim();
      if (text && !seen.includes(text)) seen.push(text);
    }
    return seen;
  });
}

async function findJobsBucket(page) {
  return page
    .locator('[aria-label="Needs attention"] details')
    .filter({ has: page.locator("summary p", { hasText: /^Jobs$/ }) })
    .first();
}

async function main() {
  if (!fs.existsSync(AUTH_PATH)) {
    throw new Error(
      `Missing founder auth at ${AUTH_PATH}. Run: npm run capture:founder-auth`,
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const admin = createAdmin();
  let tempJobId = null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(1000);

    let titles = await bucketTitles(page);
    console.log(`Initial buckets (${titles.length}): ${titles.join(" → ")}`);

    if (!titles.includes("Jobs")) {
      tempJobId = await createTempUnassignedJob(admin);
      await page.goto(`${BASE_URL}/`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await page.waitForTimeout(1200);
      titles = await bucketTitles(page);
      console.log(`After seed (${titles.length}): ${titles.join(" → ")}`);
    }

    if (!titles.includes("Jobs")) {
      throw new Error("Jobs bucket still absent after seeding unassigned job.");
    }

    const dispatchIdx = titles.indexOf("Dispatch");
    const jobsIdx = titles.indexOf("Jobs");
    const estimatesIdx = titles.indexOf("Estimates");
    if (
      dispatchIdx !== -1 &&
      estimatesIdx !== -1 &&
      !(dispatchIdx < jobsIdx && jobsIdx < estimatesIdx)
    ) {
      throw new Error(
        `Jobs order wrong among present buckets: ${titles.join(" → ")}`,
      );
    }
    if (dispatchIdx !== -1 && !(dispatchIdx < jobsIdx)) {
      throw new Error(
        `Jobs should follow Dispatch when both present: ${titles.join(" → ")}`,
      );
    }

    const boardPath = path.join(
      OUTPUT_DIR,
      "dashboard-exception-board-dark.png",
    );
    await page.screenshot({ path: boardPath, fullPage: true });
    console.log(`Wrote ${boardPath}`);
    // Keep legacy filename in sync for prior references.
    fs.copyFileSync(
      boardPath,
      path.join(OUTPUT_DIR, "dashboard-exception-board-jobs.png"),
    );

    const jobsBucket = await findJobsBucket(page);
    if ((await jobsBucket.count()) === 0) {
      throw new Error("Jobs details bucket not found.");
    }

    const openDetails = page.locator(
      '[aria-label="Needs attention"] details[open]',
    );
    while ((await openDetails.count()) > 0) {
      await openDetails.first().locator("summary").click();
      await page.waitForTimeout(150);
    }

    await jobsBucket.locator("summary").click();
    await page.waitForTimeout(500);

    const itemCount = await jobsBucket.locator("ul a[href]").count();
    const firstHref =
      itemCount > 0
        ? await jobsBucket.locator("ul a[href]").first().getAttribute("href")
        : null;
    const firstLabel =
      itemCount > 0
        ? (
            await jobsBucket.locator("ul a[href] p").first().innerText()
          ).trim()
        : null;
    console.log(
      `Jobs drill-down items: ${itemCount}; first=${firstLabel} -> ${firstHref}`,
    );

    if (!firstHref?.startsWith("/work/")) {
      throw new Error(`Expected Jobs item href under /work/, got ${firstHref}`);
    }

    const expandedPath = path.join(
      OUTPUT_DIR,
      "dashboard-exception-jobs-dark-expanded.png",
    );
    await page.screenshot({ path: expandedPath, fullPage: true });
    console.log(`Wrote ${expandedPath}`);
    fs.copyFileSync(
      expandedPath,
      path.join(OUTPUT_DIR, "dashboard-exception-jobs-expanded.png"),
    );
    console.log(`Final bucket order: ${titles.join(" → ")}`);
  } finally {
    await browser.close();
    if (tempJobId) {
      try {
        await deleteTempJob(admin, tempJobId);
      } catch (error) {
        console.error(error);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
