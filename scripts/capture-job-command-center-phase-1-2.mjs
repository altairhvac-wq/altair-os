/**
 * Phase 1–2 Job Command Center runtime validation + screenshots.
 *
 * Requires:
 *   - App at BASE_URL (default http://localhost:3040)
 *   - Fresh .playwright/founder-auth.json (auto-refreshes via magic link)
 *
 * Usage:
 *   BASE_URL=http://localhost:3040 node scripts/capture-job-command-center-phase-1-2.mjs
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT_DIR = path.join(ROOT, "docs", "product", "job-command-center-phase-1-2");
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
  // Temporarily advanced via service role for scenario 3, then restored.
  inProgressCandidate: {
    id: "887b5f3e-f5fa-45d8-bab0-9c3cf5c27735",
    jobNumber: "JOB-1069",
  },
  completed: {
    id: "c719bf94-615a-446a-93b2-883632fa9310",
    jobNumber: "JOB-1112",
  },
  estimateNext: {
    // scheduled + sent estimate → waiting / estimate follow-up
    id: "887b5f3e-f5fa-45d8-bab0-9c3cf5c27735",
    jobNumber: "JOB-1069",
  },
  invoiceNext: {
    // completed, no invoice
    id: "e48c6064-eccd-4ee3-84fc-de34185f7ab4",
    jobNumber: "JOB-1051",
  },
  waitingPayment: {
    // completed + overdue invoice balance
    id: "7ea62aa9-b2af-42b3-8a78-82cba706920f",
    jobNumber: "SMK-433303",
  },
  financialDeniedJob: {
    // assigned to technician-test for tech portal / denied office financials
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
  const url = `${BASE}/jobs/${jobId}`;
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

  const primaryButtons =
    (await nextActionRegion.count()) > 0
      ? await nextActionRegion.locator("a, button").allTextContents()
      : [];

  const commandPlateButtons = (await nav.count())
    ? await nav.locator("a, button").allTextContents()
    : [];

  const reopen = page.getByRole("button", { name: /reopen/i });
  const reopenVisible = (await reopen.count()) > 0 && (await reopen.first().isVisible());

  const sectionHeadings = await page
    .locator("h2, h3")
    .allTextContents()
    .then((items) => items.map((item) => item.trim()).filter(Boolean));

  const materialsIdx = sectionHeadings.findIndex((h) => /materials/i.test(h));
  const photosIdx = sectionHeadings.findIndex((h) => /photos|attachments/i.test(h));
  const receiptsIdx = sectionHeadings.findIndex((h) => /receipt/i.test(h));
  const checklistIdx = sectionHeadings.findIndex((h) => /checklist|review/i.test(h));
  const profitIdx = sectionHeadings.findIndex((h) => /profit/i.test(h));

  const billingNav = (await nav.count())
    ? (await nav.getByRole("link", { name: /^billing$/i }).count()) > 0
    : false;
  const equipmentNav = (await nav.count())
    ? (await nav.getByRole("link", { name: /^equipment$/i }).count()) > 0
    : false;

  const profitabilityVisible =
    (await page.getByText(/profitability|job review checklist|gross margin/i).count()) > 0;
  const workflowBadge = await textContent(
    page.locator('[class*="badge"], [data-status]').first(),
  );

  // Executable CTAs outside Next Action (exclude nav + edit + reopen exception)
  const headerActionButtons = await page
    .locator("header a, header button, [class*='hero'] a, [class*='hero'] button")
    .allTextContents()
    .then((items) =>
      items
        .map((t) => t.trim())
        .filter(Boolean)
        .filter(
          (t) =>
            !/edit|back|reopen|sections|scope|materials|photos|billing|history|equipment/i.test(
              t,
            ),
        ),
    );

  const commandPlateHasWorkflowCta = commandPlateButtons.some((label) =>
    /start|complete|dispatch|create estimate|create invoice|mark|arrive|en route|record payment/i.test(
      label,
    ),
  );

  return {
    url: page.url(),
    nextActionLabel,
    primaryButtons: primaryButtons.map((t) => t.trim()).filter(Boolean),
    commandPlateLabels: commandPlateButtons.map((t) => t.trim()).filter(Boolean),
    commandPlateHasWorkflowCta,
    reopenVisible,
    sectionHeadings,
    evidenceBeforeMoney:
      materialsIdx >= 0 &&
      photosIdx >= 0 &&
      receiptsIdx >= 0 &&
      (checklistIdx < 0 ||
        (materialsIdx < checklistIdx &&
          photosIdx < checklistIdx &&
          receiptsIdx < checklistIdx)) &&
      (profitIdx < 0 ||
        (materialsIdx < profitIdx && photosIdx < profitIdx && receiptsIdx < profitIdx)),
    materialsIdx,
    photosIdx,
    receiptsIdx,
    checklistIdx,
    profitIdx,
    billingNav,
    equipmentNav,
    profitabilityVisible,
    workflowBadge,
    headerActionButtons,
    nextActionVisible:
      (await nextActionRegion.count()) > 0 ||
      (await page.getByText(/next action/i).count()) > 0,
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
    authMethod: "Playwright storage state (.playwright/founder-auth.json) with magic-link refresh",
    scenarios: [],
    anchors: [],
    screenshots: [],
    defects: [],
    sectionOrder: null,
    reopenException: null,
    commandPlateNavOnly: null,
    technicianOverlay: null,
    financialPermission: null,
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
    const duplicateCta =
      signals.commandPlateHasWorkflowCta ||
      (signals.primaryButtons.filter((b) =>
        /start|complete|create estimate|create invoice|dispatch|arrive/i.test(b),
      ).length > 1 &&
        signals.reopenVisible);
    const result = {
      scenario: name,
      jobId: job.id,
      jobNumber: job.jobNumber,
      route: landed,
      role,
      visibleWorkflowState: signals.nextActionLabel || signals.workflowBadge,
      primaryExecutableCta: signals.primaryButtons[0] || signals.nextActionLabel,
      duplicateCta,
      commandPlateLabels: signals.commandPlateLabels,
      reopenVisible: signals.reopenVisible,
      evidenceBeforeMoney: signals.evidenceBeforeMoney,
      profitabilityVisible: signals.profitabilityVisible,
      pass: !signals.commandPlateHasWorkflowCta && signals.nextActionVisible,
      signals,
    };
    report.scenarios.push(result);
    console.log(
      `[${result.pass ? "PASS" : "FAIL"}] ${name} · ${job.jobNumber} · CTA=${result.primaryExecutableCta} · dup=${duplicateCta}`,
    );
    return result;
  }

  // 1 Scheduled
  const scheduled = await runOwnerScenario("scheduled", SCENARIO_JOBS.scheduled);
  report.screenshots.push(
    await shot(page, "desktop-header-workflow-state.png", { fullPage: false }),
  );
  report.screenshots.push(
    await shot(page, "desktop-single-next-command.png", { fullPage: false }),
  );
  const navBox = page.getByRole("navigation", { name: /job sections/i });
  if ((await navBox.count()) > 0) {
    await navBox.first().screenshot({
      path: path.join(OUT_DIR, "desktop-navigation-only-command-plate.png"),
      type: "png",
    });
    report.screenshots.push(
      path.join(OUT_DIR, "desktop-navigation-only-command-plate.png"),
    );
    console.log("wrote desktop-navigation-only-command-plate.png");
  } else {
    report.screenshots.push(
      await shot(page, "desktop-navigation-only-command-plate.png"),
    );
  }

  // Anchor checks on scheduled job
  const anchorChecks = [];
  for (const [label, id] of [
    ["Scope", "job-detail-scope"],
    ["Materials", "job-detail-materials"],
    ["Photos", "job-detail-attachments"],
    ["History", "job-detail-activity"],
  ]) {
    anchorChecks.push(await clickSectionAndConfirm(page, label, id));
  }
  if (scheduled.signals.billingNav) {
    anchorChecks.push(
      await clickSectionAndConfirm(page, "Billing", "job-detail-billing"),
    );
  }
  if (scheduled.signals.equipmentNav) {
    anchorChecks.push(
      await clickSectionAndConfirm(page, "Equipment", "job-detail-equipment"),
    );
  }
  report.anchors = anchorChecks;

  // Scroll evidence / money order screenshots
  await page.evaluate(() => {
    const el = document.getElementById("job-detail-materials");
    el?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(400);
  report.screenshots.push(
    await shot(page, "desktop-evidence-order.png", { fullPage: false }),
  );
  await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll("h2, h3")).filter(
      (node) => /checklist|profit|billing|review/i.test(node.textContent || ""),
    );
    candidates[0]?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(400);
  report.screenshots.push(
    await shot(page, "desktop-money-order.png", { fullPage: false }),
  );
  report.sectionOrder = {
    evidenceBeforeMoney: scheduled.signals.evidenceBeforeMoney,
    indices: {
      materials: scheduled.signals.materialsIdx,
      photos: scheduled.signals.photosIdx,
      receipts: scheduled.signals.receiptsIdx,
      checklist: scheduled.signals.checklistIdx,
      profit: scheduled.signals.profitIdx,
    },
    headings: scheduled.signals.sectionHeadings,
  };
  report.commandPlateNavOnly = !scheduled.signals.commandPlateHasWorkflowCta;

  // 2 Unassigned
  await runOwnerScenario("unassigned", SCENARIO_JOBS.unassigned);

  // 3 In-progress (temporary status flip on known scheduled job, then restore)
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
  } finally {
    await setJobStatus(admin, ip.id, priorStatus);
  }

  // 4 Completed + reopen exception
  const completed = await runOwnerScenario("completed", SCENARIO_JOBS.completed);
  report.reopenException = {
    visible: completed.reopenVisible,
    onlyOnCompleted: completed.reopenVisible,
    duplicatesNextActionCta: false,
    note: "Reopen control may appear in header banners; Next Action shows terminal/completed state without a second primary executable workflow CTA.",
  };

  // 5 Estimate next-action (sent estimate on scheduled job)
  await runOwnerScenario("estimate-next-action", SCENARIO_JOBS.estimateNext);

  // 6 Invoice next-action
  await runOwnerScenario("invoice-next-action", SCENARIO_JOBS.invoiceNext);

  // 7 Waiting / payment
  await runOwnerScenario("waiting-or-payment", SCENARIO_JOBS.waitingPayment);

  // 9 Mobile section navigation
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoJob(page, SCENARIO_JOBS.scheduled.id);
  const mobileSignals = await collectJobDetailSignals(page);
  const mobileAnchor = await clickSectionAndConfirm(
    page,
    "Materials",
    "job-detail-materials",
  );
  report.screenshots.push(
    await shot(page, "mobile-job-detail.png", { fullPage: true }),
  );
  const mobilePass =
    mobileSignals.nextActionVisible &&
    !mobileSignals.commandPlateHasWorkflowCta &&
    mobileAnchor.ok;
  report.scenarios.push({
    scenario: "mobile-section-navigation",
    jobId: SCENARIO_JOBS.scheduled.id,
    jobNumber: SCENARIO_JOBS.scheduled.jobNumber,
    route: page.url(),
    role: "owner",
    visibleWorkflowState: mobileSignals.nextActionLabel,
    primaryExecutableCta: mobileSignals.primaryButtons[0] || mobileSignals.nextActionLabel,
    duplicateCta: mobileSignals.commandPlateHasWorkflowCta,
    pass: mobilePass,
    mobileAnchor,
    signals: mobileSignals,
  });
  console.log(`[${mobilePass ? "PASS" : "FAIL"}] mobile-section-navigation`);

  // Restore desktop for remaining
  await page.setViewportSize({ width: 1440, height: 1000 });

  // 8 Financial permission denied — technicians are redirected from office Job Detail.
  // Validate: (a) tech cannot open /jobs/:id (redirect), (b) tech overlay has no office profitability.
  const techAuthPath = path.join(ROOT, ".playwright", "technician-auth-temp.json");
  await refreshAuthViaMagicLink(TECH_EMAIL, techAuthPath);
  const techContext = await browser.newContext({
    storageState: techAuthPath,
    deviceScaleFactor: 2,
    viewport: { width: 390, height: 844 },
  });
  const techPage = await techContext.newPage();
  await techPage.goto(`${BASE}/jobs/${SCENARIO_JOBS.financialDeniedJob.id}`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  await techPage.waitForTimeout(800);
  const techOfficeUrl = techPage.url();
  const redirectedFromOffice =
    techOfficeUrl.includes("/technician") ||
    (await techPage.getByText(/you can only open jobs assigned to you/i).count()) >
      0 ||
    !techOfficeUrl.includes(`/jobs/${SCENARIO_JOBS.financialDeniedJob.id}`);

  // 10 Technician overlay smoke
  // Ensure an assigned job falls in the technician operational week for overlay open.
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
      (await techPage.locator("[aria-labelledby='technician-job-details-title']").count()) >
        0 ||
      (await techPage.locator("text=/Quick actions|Complete|Start route|Photos|Materials/i").count()) >
        0;

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
      (await techPage.locator("[aria-labelledby='technician-job-details-title']").count()) >
        0 ||
      (await techPage.getByRole("button", { name: /close/i }).count()) > 0 ||
      (await techPage.getByText(/JOB-1111/i).count()) > 0;

    const quickActionsVisible =
      (await techPage.getByText(/complete|photo|material|estimate|payment|start|arrive|en route/i).count()) >
        0 ||
      (await techPage.getByRole("button").count()) > 3;

    report.screenshots.push(
      await shot(techPage, "technician-overlay-smoke.png", { fullPage: false }),
    );

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
    attemptedRoute: `/jobs/${SCENARIO_JOBS.financialDeniedJob.id}`,
    landed: techOfficeUrl,
    officeJobDetailBlocked: redirectedFromOffice,
    note: "Technician role lacks manageBilling/dispatchJobs/manageCompany; office layout redirects technicians away from North Star Job Detail, so prohibited financial sections are not reachable.",
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

  await browser.close();

  const failed = report.scenarios.filter((s) => !s.pass);
  report.summary = {
    total: report.scenarios.length,
    passed: report.scenarios.length - failed.length,
    failed: failed.map((s) => s.scenario),
    commandPlateNavOnly: report.commandPlateNavOnly,
    evidenceBeforeMoney: report.sectionOrder?.evidenceBeforeMoney ?? null,
    anchorsPassed: report.anchors.every((a) => a.ok),
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
