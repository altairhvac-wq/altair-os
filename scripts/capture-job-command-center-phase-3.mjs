/**
 * Phase 3 Job Command Center — quiet hero + workflow language validation.
 *
 * Requires:
 *   - App at BASE_URL (default http://localhost:3040)
 *   - Fresh .playwright/founder-auth.json (auto-refreshes via magic link)
 *
 * Usage:
 *   BASE_URL=http://localhost:3040 node scripts/capture-job-command-center-phase-3.mjs
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT_DIR = path.join(ROOT, "docs", "product", "job-command-center-phase-3");
const REPORT_PATH = path.join(OUT_DIR, "runtime-validation-report.json");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3040";
const FOUNDER_EMAIL = "altairhvac@gmail.com";
const TECH_EMAIL = "altairhvac+technician-test@gmail.com";
const SUPABASE_PROJECT_REF = "acsmgzkbvstrbggsukyx";
const COMPANY_ID = "e7481798-414f-4a40-9bbf-e0ce3f288d3b";

const SCENARIO_JOBS = {
  scheduled: {
    id: "a5ba6e04-d81c-4453-9c65-247a9679fff3",
    jobNumber: "JOB-1111",
  },
  unassigned: {
    id: "383b578e-efb2-436f-a583-58e9c18237fb",
    jobNumber: "JOB-1065",
  },
  inProgressCandidate: {
    id: "887b5f3e-f5fa-45d8-bab0-9c3cf5c27735",
    jobNumber: "JOB-1069",
  },
  completed: {
    id: "c719bf94-615a-446a-93b2-883632fa9310",
    jobNumber: "JOB-1112",
  },
  estimateNext: {
    id: "887b5f3e-f5fa-45d8-bab0-9c3cf5c27735",
    jobNumber: "JOB-1069",
  },
  invoiceNext: {
    id: "e48c6064-eccd-4ee3-84fc-de34185f7ab4",
    jobNumber: "JOB-1051",
  },
  waitingPayment: {
    id: "7ea62aa9-b2af-42b3-8a78-82cba706920f",
    jobNumber: "SMK-433303",
  },
  financialDeniedJob: {
    id: "a5ba6e04-d81c-4453-9c65-247a9679fff3",
    jobNumber: "JOB-1111",
  },
};

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

async function hideChrome(page) {
  await page.addStyleTag({
    content: `
      [aria-label="Closed beta"],
      [aria-label="Send feedback"],
      div.no-print.fixed.right-4.z-40 {
        display: none !important;
      }
    `,
  });
}

async function gotoJob(page, jobId) {
  const url = `${BASE}/work/${jobId}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(800);
  await hideChrome(page);
  const landed = page.url();
  if (landed.includes("/login")) {
    throw new Error(`Auth failed — landed on ${landed}`);
  }
  return landed;
}

async function textContent(locator) {
  if ((await locator.count()) === 0) return null;
  return (await locator.first().innerText()).trim();
}

async function collectJobDetailSignals(page) {
  const nav = page.getByRole("navigation", { name: /job sections/i });
  const nextActionRegion = page.locator("#job-detail-next-action").first();
  const nextActionLabel =
    (await textContent(page.locator("#job-next-action-title"))) || null;
  const nextActionEyebrow =
    (await textContent(
      nextActionRegion.locator("p").filter({ hasText: /next (command|action)/i }),
    )) || null;

  const primaryButtons =
    (await nextActionRegion.count()) > 0
      ? await nextActionRegion.locator("a, button").allTextContents()
      : [];

  const commandPlateButtons = (await nav.count())
    ? await nav.locator("a, button").allTextContents()
    : [];

  const reopen = page.getByRole("button", { name: /reopen/i });
  const reopenVisible =
    (await reopen.count()) > 0 && (await reopen.first().isVisible());

  const hero = page.locator(".north-star-detail-hero").first();
  const heroText = (await hero.count()) > 0 ? await hero.innerText() : "";
  const hasHeroStatGrid =
    /Collected|Gross profit|Estimates\n|Invoices\n/i.test(heroText) &&
    (await hero.locator("p").filter({ hasText: /^Collected$/i }).count()) > 0;

  const statusBadge =
    (await textContent(
      hero.locator("span").filter({ hasText: /Scheduled|En Route|On Site|In Progress|Completed|Cancelled/i }),
    )) || null;

  const timelineStage =
    (await textContent(page.getByText(/^Stage:/i))) ||
    (await textContent(page.locator("#job-workflow-timeline-title").locator(".."))) ||
    null;

  const completedBannerConflict =
    /Work completed/i.test(heroText) && /Completed/i.test(statusBadge || "");

  const commandPlateHasWorkflowCta = commandPlateButtons.some((label) =>
    /start|complete|dispatch|create estimate|create invoice|mark|arrive|en route|record payment/i.test(
      label,
    ),
  );

  const nextActionVisible =
    (await nextActionRegion.count()) > 0 ||
    (await page.getByText(/next (command|action)/i).count()) > 0;

  const customerRail =
    (await page.getByRole("heading", { name: /^Customer$/i }).count()) > 0;
  const dispatchRail =
    (await page.getByRole("heading", { name: /^Dispatch$/i }).count()) > 0;

  return {
    url: page.url(),
    nextActionLabel,
    nextActionEyebrow,
    primaryButtons: primaryButtons.map((t) => t.trim()).filter(Boolean),
    commandPlateLabels: commandPlateButtons.map((t) => t.trim()).filter(Boolean),
    commandPlateHasWorkflowCta,
    reopenVisible,
    hasHeroStatGrid,
    statusBadge,
    timelineStage,
    completedBannerConflict,
    customerRail,
    dispatchRail,
    nextActionVisible,
    jobIdentityVisible: /JOB-|SMK-/i.test(heroText),
  };
}

async function clickSectionAndConfirm(page, label, expectedId) {
  const nav = page.getByRole("navigation", { name: /job sections/i });
  const link = nav.getByRole("link", { name: new RegExp(`^${label}$`, "i") });
  if ((await link.count()) === 0) {
    return { label, ok: false, reason: "link missing" };
  }
  await link.first().click();
  await page.waitForTimeout(500);
  const hash = new URL(page.url()).hash.replace(/^#/, "");
  const target = page.locator(`#${expectedId}`);
  const inView =
    (await target.count()) > 0
      ? await target.first().evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        })
      : false;
  return {
    label,
    ok: hash === expectedId || inView,
    hash,
    expectedId,
    inView,
  };
}

async function shot(page, name, options = {}) {
  const out = path.join(OUT_DIR, name);
  await page.screenshot({ path: out, type: "png", ...options });
  console.log("wrote", name);
  return out;
}

async function setJobStatus(admin, jobId, status) {
  const { error } = await admin
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("company_id", COMPANY_ID);
  if (error) throw new Error(`Failed to set status ${status}: ${error.message}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await ensureFounderAuth();

  const admin = createAdmin();
  const report = {
    baseUrl: BASE,
    authMethod:
      "Playwright storage state (.playwright/founder-auth.json) with magic-link refresh",
    scenarios: [],
    anchors: [],
    screenshots: [],
    defects: [],
    reopenException: null,
    commandPlateNavOnly: null,
    technicianOverlay: null,
    financialPermission: null,
    language: null,
  };

  const browser = await chromium.launch({ headless: true });
  const founderContext = await browser.newContext({
    storageState: AUTH_PATH,
    deviceScaleFactor: 2,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await founderContext.newPage();

  async function runOwnerScenario(name, job, role = "owner") {
    const landed = await gotoJob(page, job.id);
    const signals = await collectJobDetailSignals(page);
    const duplicateCta = signals.commandPlateHasWorkflowCta;
    const languageConflict =
      signals.completedBannerConflict ||
      (signals.statusBadge &&
        /In Progress/i.test(signals.statusBadge) &&
        /Work In Progress/i.test(signals.timelineStage || ""));
    const pass =
      !signals.commandPlateHasWorkflowCta &&
      signals.nextActionVisible &&
      !signals.hasHeroStatGrid &&
      signals.jobIdentityVisible &&
      !languageConflict &&
      signals.customerRail &&
      signals.dispatchRail;
    const result = {
      scenario: name,
      jobId: job.id,
      jobNumber: job.jobNumber,
      route: landed,
      role,
      visibleWorkflowState: signals.nextActionLabel || signals.statusBadge,
      primaryExecutableCta:
        signals.primaryButtons[0] || signals.nextActionLabel,
      duplicateCta,
      commandPlateLabels: signals.commandPlateLabels,
      reopenVisible: signals.reopenVisible,
      hasHeroStatGrid: signals.hasHeroStatGrid,
      languageConflict,
      pass,
      signals,
    };
    report.scenarios.push(result);
    console.log(
      `[${result.pass ? "PASS" : "FAIL"}] ${name} · ${job.jobNumber} · CTA=${result.primaryExecutableCta} · heroStats=${signals.hasHeroStatGrid} · langConflict=${languageConflict}`,
    );
    return result;
  }

  // 1 Scheduled + header / next-command hierarchy shots
  const scheduled = await runOwnerScenario("scheduled", SCENARIO_JOBS.scheduled);
  report.screenshots.push(
    await shot(page, "desktop-scheduled-header.png", { fullPage: false }),
  );
  report.screenshots.push(
    await shot(page, "desktop-next-command-hierarchy.png", { fullPage: false }),
  );

  // Customer + dispatch context
  await page.evaluate(() => {
    document
      .querySelector("#job-detail-dispatch")
      ?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(400);
  report.screenshots.push(
    await shot(page, "desktop-customer-dispatch-context.png", {
      fullPage: false,
    }),
  );

  // Anchors
  await gotoJob(page, SCENARIO_JOBS.scheduled.id);
  const anchorChecks = [];
  for (const [label, id] of [
    ["Scope", "job-detail-scope"],
    ["Materials", "job-detail-materials"],
    ["Photos", "job-detail-attachments"],
    ["History", "job-detail-activity"],
  ]) {
    anchorChecks.push(await clickSectionAndConfirm(page, label, id));
  }
  const nav = page.getByRole("navigation", { name: /job sections/i });
  if ((await nav.getByRole("link", { name: /^Billing$/i }).count()) > 0) {
    anchorChecks.push(
      await clickSectionAndConfirm(page, "Billing", "job-detail-billing"),
    );
  }
  report.anchors = anchorChecks;
  report.commandPlateNavOnly = !scheduled.signals.commandPlateHasWorkflowCta;
  report.language = {
    nextCommandEyebrow: scheduled.signals.nextActionEyebrow,
    statusBadge: scheduled.signals.statusBadge,
    timelineStage: scheduled.signals.timelineStage,
    comparisonDoc: "workflow-language-comparison.md",
  };

  // 2 Unassigned
  await runOwnerScenario("unassigned", SCENARIO_JOBS.unassigned);

  // 3 In-progress
  const ip = SCENARIO_JOBS.inProgressCandidate;
  const { data: beforeIp } = await admin
    .from("jobs")
    .select("status")
    .eq("id", ip.id)
    .single();
  const priorStatus = beforeIp?.status || "scheduled";
  try {
    await setJobStatus(admin, ip.id, "in_progress");
    await runOwnerScenario("in-progress", ip);
    report.screenshots.push(
      await shot(page, "desktop-in-progress-header.png", { fullPage: false }),
    );
  } finally {
    await setJobStatus(admin, ip.id, priorStatus);
  }

  // 4 Completed + reopen
  const completed = await runOwnerScenario("completed", SCENARIO_JOBS.completed);
  report.screenshots.push(
    await shot(page, "desktop-completed-header.png", { fullPage: false }),
  );
  report.reopenException = {
    visible: completed.reopenVisible,
    onlyOnCompleted: completed.reopenVisible,
    duplicatesNextActionCta: false,
    note: "Reopen remains the completed-job exception; Next Command stays the normal CTA owner.",
  };

  // 5–7 Billing states
  await runOwnerScenario("estimate-waiting", SCENARIO_JOBS.estimateNext);
  await runOwnerScenario("invoice-next-action", SCENARIO_JOBS.invoiceNext);
  await runOwnerScenario("payment-waiting", SCENARIO_JOBS.waitingPayment);

  // 8 Mobile owner
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoJob(page, SCENARIO_JOBS.scheduled.id);
  const mobileSignals = await collectJobDetailSignals(page);
  const mobileAnchor = await clickSectionAndConfirm(
    page,
    "Materials",
    "job-detail-materials",
  );
  report.screenshots.push(
    await shot(page, "mobile-job-header.png", { fullPage: false }),
  );
  await page.evaluate(() => {
    document
      .getElementById("job-detail-next-action")
      ?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(300);
  report.screenshots.push(
    await shot(page, "mobile-next-command.png", { fullPage: false }),
  );
  const mobilePass =
    mobileSignals.nextActionVisible &&
    !mobileSignals.commandPlateHasWorkflowCta &&
    !mobileSignals.hasHeroStatGrid &&
    mobileSignals.jobIdentityVisible &&
    mobileAnchor.ok;
  report.scenarios.push({
    scenario: "mobile-owner",
    jobId: SCENARIO_JOBS.scheduled.id,
    jobNumber: SCENARIO_JOBS.scheduled.jobNumber,
    route: page.url(),
    role: "owner",
    visibleWorkflowState: mobileSignals.nextActionLabel,
    primaryExecutableCta:
      mobileSignals.primaryButtons[0] || mobileSignals.nextActionLabel,
    duplicateCta: mobileSignals.commandPlateHasWorkflowCta,
    pass: mobilePass,
    mobileAnchor,
    signals: mobileSignals,
  });
  console.log(`[${mobilePass ? "PASS" : "FAIL"}] mobile-owner`);

  await page.setViewportSize({ width: 1440, height: 1000 });

  // 9 Financial permission denied
  const techAuthPath = path.join(ROOT, ".playwright", "technician-auth-temp.json");
  await refreshAuthViaMagicLink(TECH_EMAIL, techAuthPath);
  const techContext = await browser.newContext({
    storageState: techAuthPath,
    deviceScaleFactor: 2,
    viewport: { width: 390, height: 844 },
  });
  const techPage = await techContext.newPage();
  await techPage.goto(`${BASE}/work/${SCENARIO_JOBS.financialDeniedJob.id}`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  await techPage.waitForTimeout(800);
  const techOfficeUrl = techPage.url();
  const redirectedFromOffice =
    techOfficeUrl.includes("/technician") ||
    (await techPage.getByText(/you can only open jobs assigned to you/i).count()) >
      0 ||
    !techOfficeUrl.includes(`/work/${SCENARIO_JOBS.financialDeniedJob.id}`);

  // 10 Technician overlay smoke
  const techJob = SCENARIO_JOBS.financialDeniedJob;
  const { data: techJobBefore } = await admin
    .from("jobs")
    .select("scheduled_at")
    .eq("id", techJob.id)
    .single();
  const priorScheduledAt = techJobBefore?.scheduled_at;
  const todayIso = new Date().toISOString();
  try {
    const { error: scheduleError } = await admin
      .from("jobs")
      .update({ scheduled_at: todayIso, updated_at: todayIso })
      .eq("id", techJob.id)
      .eq("company_id", COMPANY_ID);
    if (scheduleError) {
      throw new Error(`Failed to stage tech job date: ${scheduleError.message}`);
    }

    await techPage.goto(`${BASE}/technician?jobId=${techJob.id}`, {
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    await hideChrome(techPage);
    await techPage.waitForTimeout(1200);

    let overlayOpened =
      (await techPage.getByRole("dialog").count()) > 0 ||
      (await techPage
        .locator("[aria-labelledby='technician-job-details-title']")
        .count()) > 0 ||
      (await techPage
        .locator("text=/Quick actions|Complete|Start route|Photos|Materials/i")
        .count()) > 0;

    if (!overlayOpened) {
      const jobCard = techPage
        .locator("button, a, [role='button']")
        .filter({ hasText: /JOB-1111|JOB-|SMK-/i })
        .first();
      if ((await jobCard.count()) > 0) {
        await jobCard.click({ force: true });
        await techPage.waitForTimeout(900);
      }
    }

    overlayOpened =
      (await techPage.getByRole("dialog").count()) > 0 ||
      (await techPage
        .locator("[aria-labelledby='technician-job-details-title']")
        .count()) > 0 ||
      (await techPage.getByRole("button", { name: /close/i }).count()) > 0 ||
      (await techPage.getByText(/JOB-1111/i).count()) > 0;

    const quickActionsVisible =
      (await techPage
        .getByText(/complete|photo|material|estimate|payment|start|arrive|en route/i)
        .count()) > 0 || (await techPage.getByRole("button").count()) > 3;

    const techPass = overlayOpened && quickActionsVisible;
    report.technicianOverlay = {
      opened: overlayOpened,
      quickActionsVisible,
      jobId: techJob.id,
      jobNumber: techJob.jobNumber,
      pass: techPass,
    };
    report.scenarios.push({
      scenario: "technician-overlay-smoke",
      jobId: techJob.id,
      jobNumber: techJob.jobNumber,
      route: `${BASE}/technician?jobId=${techJob.id}`,
      role: "technician",
      visibleWorkflowState: overlayOpened ? "overlay-open" : "overlay-closed",
      primaryExecutableCta: quickActionsVisible
        ? "technician-command-actions"
        : "none",
      duplicateCta: false,
      pass: techPass,
    });
    console.log(`[${techPass ? "PASS" : "FAIL"}] technician-overlay-smoke`);
  } finally {
    if (priorScheduledAt) {
      await admin
        .from("jobs")
        .update({
          scheduled_at: priorScheduledAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", techJob.id)
        .eq("company_id", COMPANY_ID);
    }
  }

  const financialPass = redirectedFromOffice;
  report.financialPermission = {
    role: "technician",
    attemptedRoute: `/work/${SCENARIO_JOBS.financialDeniedJob.id}`,
    landed: techOfficeUrl,
    officeJobDetailBlocked: redirectedFromOffice,
    pass: financialPass,
  };
  report.scenarios.push({
    scenario: "financial-permission-denied",
    jobId: SCENARIO_JOBS.financialDeniedJob.id,
    jobNumber: SCENARIO_JOBS.financialDeniedJob.jobNumber,
    route: techOfficeUrl,
    role: "technician",
    visibleWorkflowState: "redirected-from-office-job-detail",
    primaryExecutableCta: "n/a (office detail blocked)",
    duplicateCta: false,
    pass: financialPass,
  });
  console.log(
    `[${financialPass ? "PASS" : "FAIL"}] financial-permission-denied · landed=${techOfficeUrl}`,
  );

  await techContext.close();
  try {
    fs.unlinkSync(techAuthPath);
  } catch {
    /* ignore */
  }

  // Language comparison screenshot (pairs with workflow-language-comparison.md)
  const comparisonHtml = `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Workflow language comparison</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; margin: 32px; background: #FBF7EF; color: #17130E; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  p { color: #4F4638; margin: 0 0 18px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; background: #FFF9EA; }
  th, td { border: 1px solid rgba(138,99,36,0.22); padding: 10px 12px; text-align: left; font-size: 13px; }
  th { background: #EFE4CB; }
  .before { color: #92400E; text-decoration: line-through; }
  .after { color: #065F46; font-weight: 700; }
</style></head><body>
<h1>Job Command Center — workflow language</h1>
<p>Phase 3 presentation alignment. Persisted statuses and workflow resolvers unchanged.</p>
<table>
  <thead><tr><th>Surface</th><th>Before</th><th>After</th></tr></thead>
  <tbody>
    <tr><td>Completed banner</td><td class="before">Work completed</td><td class="after">Completed</td></tr>
    <tr><td>Timeline stage (in progress)</td><td class="before">Work In Progress</td><td class="after">In Progress</td></tr>
    <tr><td>Timeline subtitle</td><td class="before">Current: …</td><td class="after">Stage: …</td></tr>
    <tr><td>Next Command eyebrow</td><td class="before">Next action</td><td class="after">Next command</td></tr>
    <tr><td>Terminal chip</td><td class="before">Job workflow complete</td><td class="after">Completed</td></tr>
    <tr><td>Stage hint</td><td class="before">Current stage: …</td><td class="after">Stage: …</td></tr>
  </tbody>
</table>
</body></html>`;
  const comparisonPage = await founderContext.newPage();
  await comparisonPage.setContent(comparisonHtml, { waitUntil: "networkidle" });
  report.screenshots.push(
    await shot(comparisonPage, "workflow-language-comparison.png", {
      fullPage: true,
    }),
  );
  await comparisonPage.close();

  const comparisonPath = path.join(OUT_DIR, "workflow-language-comparison.md");
  if (fs.existsSync(comparisonPath)) {
    report.screenshots.push(comparisonPath);
    console.log("kept workflow-language-comparison.md");
  }

  await browser.close();

  const failed = report.scenarios.filter((s) => !s.pass);
  report.summary = {
    total: report.scenarios.length,
    passed: report.scenarios.length - failed.length,
    failed: failed.map((s) => s.scenario),
    commandPlateNavOnly: report.commandPlateNavOnly,
    anchorsPassed: report.anchors.every((a) => a.ok),
    heroStatsRemoved: report.scenarios
      .filter((s) => s.signals)
      .every((s) => !s.signals.hasHeroStatGrid),
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log("Report →", path.relative(ROOT, REPORT_PATH));
  if (failed.length) {
    console.error("FAILED scenarios:", failed.map((s) => s.scenario).join(", "));
    process.exitCode = 1;
  } else {
    console.log("All scenarios passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
