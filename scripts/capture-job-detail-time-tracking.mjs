/**
 * Capture Job Detail → Time Tracking tab for a job with real job_labor entries.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/capture-job-detail-time-tracking.mjs
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT_DIR = path.join(
  ROOT,
  "public",
  "marketing",
  "screenshots",
  "comparison",
);
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const FOUNDER_EMAIL = "altairhvac@gmail.com";
const SUPABASE_PROJECT_REF = "acsmgzkbvstrbggsukyx";
const COMPANY_ID = "e7481798-414f-4a40-9bbf-e0ce3f288d3b";

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

function readStoredSession(authPath = AUTH_PATH) {
  if (!fs.existsSync(authPath)) return null;
  try {
    const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
    const chunks = auth.cookies
      .filter((cookie) => cookie.name.includes("auth-token"))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (chunks.length === 0) return null;
    let raw = chunks.map((chunk) => chunk.value).join("");
    if (raw.startsWith("base64-")) raw = raw.slice(7);
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isSessionFresh(session) {
  if (!session?.expires_at) return false;
  return session.expires_at > Math.floor(Date.now() / 1000) + 120;
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

async function refreshAuthViaMagicLink(email, authPath = AUTH_PATH) {
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = getServiceRoleKey(env);
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing Supabase credentials for magic link auth");
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${BASE}/auth/callback` },
  });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`magic link failed for ${email}: ${error?.message}`);
  }

  const callbackUrl = `${BASE}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(callbackUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await context.storageState({ path: authPath });
    console.log(`Refreshed auth for ${email}`);
  } finally {
    await browser.close();
  }
}

async function ensureFounderAuth() {
  if (isSessionFresh(readStoredSession())) {
    console.log("Founder auth still fresh.");
    return;
  }
  console.log("Refreshing founder auth...");
  await refreshAuthViaMagicLink(FOUNDER_EMAIL, AUTH_PATH);
}

async function findJobWithLabor(admin) {
  const { data, error } = await admin
    .from("time_entries")
    .select("job_id, started_at, ended_at, duration_minutes, jobs(job_number)")
    .eq("company_id", COMPANY_ID)
    .eq("entry_type", "job_labor")
    .not("job_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const counts = new Map();
  for (const row of data ?? []) {
    if (!row.job_id) continue;
    const current = counts.get(row.job_id) ?? {
      jobId: row.job_id,
      jobNumber: row.jobs?.job_number ?? row.job_id,
      count: 0,
      closedCount: 0,
    };
    current.count += 1;
    if (row.ended_at != null || row.duration_minutes != null) {
      current.closedCount += 1;
    }
    counts.set(row.job_id, current);
  }

  const ranked = [...counts.values()].sort((a, b) => {
    if (b.closedCount !== a.closedCount) return b.closedCount - a.closedCount;
    return b.count - a.count;
  });

  if (ranked.length === 0) {
    throw new Error("No jobs with job_labor time entries found");
  }

  return ranked[0];
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await ensureFounderAuth();

  const admin = createAdmin();
  const job = await findJobWithLabor(admin);
  console.log(
    `Using ${job.jobNumber} (${job.jobId}) — ${job.count} labor entries (${job.closedCount} closed)`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();

  try {
    const url = `${BASE}/work/${job.jobId}#job-detail-time-tracking`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(1000);

    if (page.url().includes("/login")) {
      throw new Error(`Auth failed — landed on ${page.url()}`);
    }

    const tab = page.getByRole("tab", { name: "Time Tracking" });
    await tab.waitFor({ state: "visible", timeout: 30_000 });
    await tab.click();
    await page.waitForTimeout(500);

    const heading = page.getByRole("heading", { name: "Time tracking" });
    await heading.waitFor({ state: "visible", timeout: 15_000 });

    const empty = page.getByText("No labor time logged yet");
    if ((await empty.count()) > 0 && (await empty.first().isVisible())) {
      throw new Error("Time Tracking tab rendered empty despite labor query hit");
    }

    const outPath = path.join(OUT_DIR, "job-detail-time-tracking.png");
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Wrote ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
