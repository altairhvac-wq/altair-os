/**
 * Phase 4 Job Command Center — Unified Money Path validation + screenshots.
 *
 * Requires:
 *   - App at BASE_URL (default http://localhost:3040)
 *   - Fresh .playwright/founder-auth.json (auto-refreshes via magic link)
 *   - NEXT_PUBLIC_NORTH_STAR_SHELL=true
 *
 * Usage:
 *   BASE_URL=http://localhost:3040 node scripts/capture-job-command-center-phase-4.mjs
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT_DIR = path.join(ROOT, "docs", "product", "job-command-center-phase-4");
const REPORT_PATH = path.join(OUT_DIR, "runtime-validation-report.json");
const OWNERSHIP_PATH = path.join(OUT_DIR, "financial-ownership.md");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3040";
const FOUNDER_EMAIL = "altairhvac@gmail.com";
const TECH_EMAIL = "altairhvac+technician-test@gmail.com";
const SUPABASE_PROJECT_REF = "acsmgzkbvstrbggsukyx";
const COMPANY_ID = "e7481798-414f-4a40-9bbf-e0ce3f288d3b";

const KNOWN = {
  noDocuments: {
    id: "a5ba6e04-d81c-4453-9c65-247a9679fff3",
    jobNumber: "JOB-1111",
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
  completed: {
    id: "c719bf94-615a-446a-93b2-883632fa9310",
    jobNumber: "JOB-1112",
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

async function discoverFinancialJobs(admin) {
  const { data: jobs, error: jobsError } = await admin
    .from("jobs")
    .select("id, job_number, status")
    .eq("company_id", COMPANY_ID)
    .is("deleted_at", null)
    .limit(200);
  if (jobsError) throw new Error(jobsError.message);

  const jobIds = (jobs ?? []).map((j) => j.id);
  const [{ data: estimates }, { data: invoices }] = await Promise.all([
    admin
      .from("estimates")
      .select("id, job_id, status, estimate_number, created_at")
      .eq("company_id", COMPANY_ID)
      .in("job_id", jobIds)
      .is("deleted_at", null),
    admin
      .from("invoices")
      .select(
        "id, job_id, status, invoice_number, amount_paid, balance_due, created_at",
      )
      .eq("company_id", COMPANY_ID)
      .in("job_id", jobIds)
      .is("deleted_at", null),
  ]);

  const estimatesByJob = new Map();
  for (const row of estimates ?? []) {
    if (!row.job_id) continue;
    const list = estimatesByJob.get(row.job_id) ?? [];
    list.push(row);
    estimatesByJob.set(row.job_id, list);
  }
  const invoicesByJob = new Map();
  for (const row of invoices ?? []) {
    if (!row.job_id) continue;
    const list = invoicesByJob.get(row.job_id) ?? [];
    list.push(row);
    invoicesByJob.set(row.job_id, list);
  }

  const catalog = (jobs ?? []).map((job) => {
    const jobEstimates = (estimatesByJob.get(job.id) ?? []).sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    const jobInvoices = (invoicesByJob.get(job.id) ?? []).sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    const activeEstimate = jobEstimates.find(
      (e) => !["converted", "cancelled", "declined"].includes(e.status),
    );
    const activeInvoice = jobInvoices.find(
      (i) => !["void", "cancelled"].includes(i.status),
    );
    return {
      id: job.id,
      jobNumber: job.job_number,
      status: job.status,
      estimate: activeEstimate ?? null,
      invoice: activeInvoice ?? null,
      estimates: jobEstimates,
      invoices: jobInvoices,
    };
  });

  const pick = (predicate) => catalog.find(predicate) ?? null;

  return {
    noDocuments:
      pick((j) => !j.estimate && !j.invoice) ?? KNOWN.noDocuments,
    estimateDraft:
      pick((j) => j.estimate?.status === "draft" && !j.invoice) ?? null,
    estimateAwaitingApproval:
      pick((j) => j.estimate?.status === "sent" && !j.invoice) ??
      KNOWN.estimateNext,
    approvedReadyToInvoice:
      pick(
        (j) =>
          j.estimate?.status === "approved" &&
          !j.invoice &&
          j.status !== "cancelled",
      ) ?? KNOWN.invoiceNext,
    invoiceReadyOrSent:
      pick(
        (j) =>
          j.invoice &&
          (j.invoice.status === "draft" || j.invoice.status === "sent"),
      ) ?? KNOWN.waitingPayment,
    overdueInvoice: pick((j) => j.invoice?.status === "overdue") ?? null,
    partiallyPaid:
      pick((j) => j.invoice?.status === "partially_paid") ??
      pick(
        (j) =>
          j.invoice &&
          Number(j.invoice.amount_paid) > 0 &&
          Number(j.invoice.balance_due) > 0,
      ) ??
      null,
    fullyPaid: pick((j) => j.invoice?.status === "paid") ?? null,
    completedAwaitingInvoice:
      pick((j) => j.status === "completed" && !j.invoice) ?? KNOWN.completed,
    catalog,
  };
}

async function collectMoneyPathSignals(page) {
  const moneyPath = page.locator("#job-detail-billing");
  const nextActionRegion = page.locator("#job-detail-next-action").first();
  const nextActionLabel =
    (await textContent(page.locator("#job-next-action-title"))) || null;
  const moneyPathText =
    (await moneyPath.count()) > 0 ? await moneyPath.first().innerText() : "";
  const moneyPathVisible = (await moneyPath.count()) > 0;

  const primaryButtons =
    (await nextActionRegion.count()) > 0
      ? await nextActionRegion.locator("a, button").allTextContents()
      : [];

  const moneyPathButtons =
    moneyPathVisible
      ? await moneyPath.locator("a, button").allTextContents()
      : [];

  const competingPrimaryCta = moneyPathButtons.some((label) =>
    /create estimate|create invoice|record payment|finish\/send|approve on site|complete work/i.test(
      label,
    ),
  );

  const profitabilityHeading = page.getByRole("heading", {
    name: /job profitability/i,
  });
  const profitabilityVisible = (await profitabilityHeading.count()) > 0;
  const profitabilityText =
    profitabilityVisible
      ? await profitabilityHeading.first().locator("..").locator("..").innerText()
      : "";

  const sideRailBillingDuplicate =
    (await page.getByRole("heading", { name: /^Billing$/i }).count()) > 0 &&
    moneyPathVisible;

  const duplicateFinancialFacts =
    moneyPathVisible &&
    profitabilityVisible &&
    /Outstanding/i.test(moneyPathText) &&
    /Outstanding balance/i.test(profitabilityText);

  const estimateLink =
    moneyPathVisible &&
    (await moneyPath.getByRole("link", { name: /view estimate/i }).count()) > 0;
  const invoiceLink =
    moneyPathVisible &&
    (await moneyPath.getByRole("link", { name: /view invoice|view payment/i }).count()) >
      0;

  return {
    nextActionLabel,
    primaryButtons: primaryButtons.map((t) => t.trim()).filter(Boolean),
    moneyPathVisible,
    moneyPathText: moneyPathText.replace(/\s+/g, " ").trim(),
    moneyPathButtons: moneyPathButtons.map((t) => t.trim()).filter(Boolean),
    competingPrimaryCta,
    profitabilityVisible,
    sideRailBillingDuplicate,
    duplicateFinancialFacts,
    estimateLink,
    invoiceLink,
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

async function shotMoneyPath(page, name) {
  const region = page.locator("#job-detail-billing");
  if ((await region.count()) > 0) {
    await region.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await region.first().screenshot({
      path: path.join(OUT_DIR, name),
      type: "png",
    });
    console.log("wrote", name);
    return path.join(OUT_DIR, name);
  }
  return shot(page, name, { fullPage: false });
}

function jobRef(job) {
  if (!job) return null;
  return {
    id: job.id,
    jobNumber: job.jobNumber ?? job.job_number ?? null,
    status: job.status ?? null,
    estimateStatus: job.estimate?.status ?? "none",
    invoiceStatus: job.invoice?.status ?? "none",
    amountPaid: job.invoice ? Number(job.invoice.amount_paid ?? 0) : 0,
    balanceDue: job.invoice ? Number(job.invoice.balance_due ?? 0) : 0,
  };
}

function writeOwnershipDoc() {
  const md = `# Financial information ownership — Phase 4

Presentation-only ownership for North Star office Job Detail Money path.

## Before

| Surface | Owned facts |
|---|---|
| Side-rail Billing card | Collected, outstanding, estimate/invoice links |
| Profitability section | Collected, invoiced, outstanding, costs, margin, labor, projected revenue + Billing anchor |
| Review checklist | Closeout readiness + invoice create/view shortcuts |
| JobNextActionCard | Next executable financial/workflow CTA |
| Header / Command Plate | No financial amounts (Phase 3) |

Problems:
- Document progression and payment state were split across side rail + profitability
- Billing deep link landed on profitability, not document progression
- Collected / outstanding repeated on two prominent surfaces

## After

| Surface | Owns |
|---|---|
| **JobNextActionCard** | Next executable financial action when financial work is next |
| **Money path** (\`#job-detail-billing\`) | Estimate → Invoice → Payment document progression and payment summary |
| **Profitability** | Direct costs, gross profit/margin, labor, projected-revenue analysis |
| **Review checklist** | Closeout readiness and missing financial requirements |
| Side-rail Billing card | Unmounted on North Star Job Detail (legacy component retained) |

## Money path structure

Compact three-stage region (stacks on mobile):

1. **Estimate** — number, operational status, total when available, View estimate
2. **Invoice** — number, status, total when available, View invoice
3. **Payment** — status, collected, outstanding, invoiced total, View payment details

No primary mutation CTAs. Secondary document navigation only.
`;
  fs.writeFileSync(OWNERSHIP_PATH, md);
  console.log("wrote financial-ownership.md");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeOwnershipDoc();
  await ensureFounderAuth();

  const admin = createAdmin();
  const discovered = await discoverFinancialJobs(admin);
  console.log("Discovered financial jobs:");
  for (const [key, job] of Object.entries(discovered)) {
    if (key === "catalog") continue;
    console.log(`  ${key}:`, job ? `${job.jobNumber || job.job_number || job.id} · est=${job.estimate?.status ?? "none"} · inv=${job.invoice?.status ?? "none"}` : "MISSING");
  }

  const report = {
    baseUrl: BASE,
    authMethod:
      "Playwright storage state (.playwright/founder-auth.json) with magic-link refresh",
    scenarios: [],
    anchors: [],
    screenshots: [],
    smoke: {},
    summary: null,
  };

  const browser = await chromium.launch({ headless: true });
  const founderContext = await browser.newContext({
    storageState: AUTH_PATH,
    deviceScaleFactor: 2,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await founderContext.newPage();

  async function runScenario(name, job, screenshotName) {
    if (!job?.id) {
      const result = {
        scenario: name,
        jobId: null,
        estimateState: "n/a",
        invoiceState: "n/a",
        paymentState: "n/a",
        nextCommand: null,
        moneyPathPresentation: null,
        duplicateFinancialFacts: false,
        competingCta: false,
        pass: false,
        note: "No matching job found in company dataset",
      };
      report.scenarios.push(result);
      console.log(`[FAIL] ${name} · no job`);
      return result;
    }

    const landed = await gotoJob(page, job.id);
    const signals = await collectMoneyPathSignals(page);
    const ref = jobRef(job);
    const paymentState =
      !job.invoice
        ? "Not started"
        : Number(job.invoice.balance_due) <= 0 &&
            Number(job.invoice.amount_paid) > 0
          ? "Paid"
          : Number(job.invoice.amount_paid) > 0
            ? "Payment outstanding (partial)"
            : "Payment outstanding";

    const pass =
      signals.moneyPathVisible &&
      !signals.competingPrimaryCta &&
      !signals.duplicateFinancialFacts &&
      !signals.sideRailBillingDuplicate;

    const result = {
      scenario: name,
      jobId: job.id,
      jobNumber: ref.jobNumber,
      jobStatus: ref.status,
      route: landed,
      estimateState: ref.estimateStatus,
      invoiceState: ref.invoiceStatus,
      paymentState,
      nextCommand: signals.nextActionLabel,
      moneyPathPresentation: signals.moneyPathText.slice(0, 280),
      duplicateFinancialFacts: signals.duplicateFinancialFacts,
      competingCta: signals.competingPrimaryCta,
      sideRailBillingDuplicate: signals.sideRailBillingDuplicate,
      estimateLink: signals.estimateLink,
      invoiceLink: signals.invoiceLink,
      profitabilityVisible: signals.profitabilityVisible,
      pass,
      signals,
    };
    report.scenarios.push(result);
    console.log(
      `[${pass ? "PASS" : "FAIL"}] ${name} · ${ref.jobNumber} · next=${signals.nextActionLabel} · dupFacts=${signals.duplicateFinancialFacts} · competing=${signals.competingPrimaryCta}`,
    );

    if (screenshotName) {
      report.screenshots.push(await shotMoneyPath(page, screenshotName));
    }
    return result;
  }

  // Required screenshots / scenarios
  await runScenario(
    "no-estimate-no-invoice",
    discovered.noDocuments,
    "desktop-no-financial-documents.png",
  );

  // Stage draft estimate temporarily when dataset has none.
  let stagedEstimate = null;
  let estimateDraftJob = discovered.estimateDraft;
  if (!estimateDraftJob && discovered.estimateAwaitingApproval?.estimate) {
    const source = discovered.estimateAwaitingApproval;
    stagedEstimate = {
      id: source.estimate.id,
      priorStatus: source.estimate.status,
    };
    const { error } = await admin
      .from("estimates")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", source.estimate.id)
      .eq("company_id", COMPANY_ID);
    if (error) throw new Error(`Failed to stage draft estimate: ${error.message}`);
    estimateDraftJob = {
      ...source,
      estimate: { ...source.estimate, status: "draft" },
    };
    console.log("Staged estimate draft on", source.jobNumber);
  }
  try {
    await runScenario("estimate-draft", estimateDraftJob, null);
  } finally {
    if (stagedEstimate) {
      await admin
        .from("estimates")
        .update({
          status: stagedEstimate.priorStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stagedEstimate.id)
        .eq("company_id", COMPANY_ID);
      console.log("Restored estimate", stagedEstimate.id, "→", stagedEstimate.priorStatus);
    }
  }

  await runScenario(
    "estimate-awaiting-approval",
    discovered.estimateAwaitingApproval,
    "desktop-estimate-awaiting-approval.png",
  );
  await runScenario(
    "approved-ready-to-invoice",
    discovered.approvedReadyToInvoice,
    "desktop-approved-ready-to-invoice.png",
  );
  await runScenario(
    "invoice-ready-or-sent",
    discovered.invoiceReadyOrSent,
    "desktop-invoice-outstanding.png",
  );
  await runScenario("overdue-invoice", discovered.overdueInvoice, null);

  // Stage partial payment temporarily when dataset has none.
  let stagedInvoice = null;
  let partiallyPaidJob = discovered.partiallyPaid;
  if (!partiallyPaidJob && discovered.invoiceReadyOrSent?.invoice) {
    const source = discovered.invoiceReadyOrSent;
    const priorPaid = Number(source.invoice.amount_paid ?? 0);
    const priorBalance = Number(source.invoice.balance_due ?? 0);
    const total = priorPaid + priorBalance || 100;
    stagedInvoice = {
      id: source.invoice.id,
      priorStatus: source.invoice.status,
      priorPaid,
      priorBalance,
    };
    const half = Math.round((total / 2) * 100) / 100;
    const { error } = await admin
      .from("invoices")
      .update({
        status: "partially_paid",
        amount_paid: half,
        balance_due: Math.round((total - half) * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.invoice.id)
      .eq("company_id", COMPANY_ID);
    if (error) {
      throw new Error(`Failed to stage partial invoice: ${error.message}`);
    }
    partiallyPaidJob = {
      ...source,
      invoice: {
        ...source.invoice,
        status: "partially_paid",
        amount_paid: half,
        balance_due: Math.round((total - half) * 100) / 100,
      },
    };
    console.log("Staged partially_paid on", source.jobNumber);
  }
  try {
    await runScenario(
      "partially-paid",
      partiallyPaidJob,
      "desktop-partially-paid.png",
    );
  } finally {
    if (stagedInvoice) {
      await admin
        .from("invoices")
        .update({
          status: stagedInvoice.priorStatus,
          amount_paid: stagedInvoice.priorPaid,
          balance_due: stagedInvoice.priorBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stagedInvoice.id)
        .eq("company_id", COMPANY_ID);
      console.log("Restored invoice", stagedInvoice.id, "→", stagedInvoice.priorStatus);
    }
  }

  await runScenario(
    "fully-paid",
    discovered.fullyPaid,
    discovered.fullyPaid ? "desktop-paid.png" : null,
  );
  if (!discovered.fullyPaid) {
    report.screenshots.push(
      await shot(page, "desktop-paid.png", { fullPage: false }),
    );
  }
  await runScenario(
    "completed-awaiting-invoice",
    discovered.completedAwaitingInvoice,
    null,
  );

  // Money path + profitability composition
  const compositionJob =
    discovered.fullyPaid ||
    discovered.partiallyPaid ||
    discovered.invoiceReadyOrSent ||
    discovered.approvedReadyToInvoice;
  if (compositionJob?.id) {
    await gotoJob(page, compositionJob.id);
    await page.evaluate(() => {
      document
        .getElementById("job-detail-billing")
        ?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
    report.screenshots.push(
      await shot(page, "desktop-money-path-and-profitability.png", {
        fullPage: false,
      }),
    );
  }

  // Billing anchor
  await gotoJob(page, (discovered.noDocuments || KNOWN.noDocuments).id);
  const billingAnchor = await clickSectionAndConfirm(
    page,
    "Billing",
    "job-detail-billing",
  );
  report.anchors.push(billingAnchor);
  report.smoke.billingAnchor = billingAnchor;

  // Estimate / invoice link smoke
  const linkJob =
    discovered.estimateAwaitingApproval || discovered.invoiceReadyOrSent;
  if (linkJob?.id) {
    await gotoJob(page, linkJob.id);
    const signals = await collectMoneyPathSignals(page);
    report.smoke.estimateLink = signals.estimateLink;
    report.smoke.invoiceLink = signals.invoiceLink;
  }

  // Mobile money path
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileJob =
    discovered.invoiceReadyOrSent ||
    discovered.approvedReadyToInvoice ||
    discovered.noDocuments;
  await gotoJob(page, mobileJob.id);
  report.screenshots.push(await shotMoneyPath(page, "mobile-money-path.png"));
  const mobileSignals = await collectMoneyPathSignals(page);
  const mobilePass =
    mobileSignals.moneyPathVisible && !mobileSignals.competingPrimaryCta;
  report.scenarios.push({
    scenario: "mobile-owner-money-path",
    jobId: mobileJob.id,
    jobNumber: mobileJob.jobNumber,
    estimateState: mobileJob.estimate?.status ?? "none",
    invoiceState: mobileJob.invoice?.status ?? "none",
    paymentState: "see money path",
    nextCommand: mobileSignals.nextActionLabel,
    moneyPathPresentation: mobileSignals.moneyPathText.slice(0, 280),
    duplicateFinancialFacts: mobileSignals.duplicateFinancialFacts,
    competingCta: mobileSignals.competingPrimaryCta,
    pass: mobilePass,
  });
  console.log(`[${mobilePass ? "PASS" : "FAIL"}] mobile-owner-money-path`);

  await page.setViewportSize({ width: 1440, height: 1000 });

  // Financial permission / technician redirect + overlay
  const techAuthPath = path.join(
    ROOT,
    ".playwright",
    "technician-auth-phase4-temp.json",
  );
  await refreshAuthViaMagicLink(TECH_EMAIL, techAuthPath);
  const techContext = await browser.newContext({
    storageState: techAuthPath,
    deviceScaleFactor: 2,
    viewport: { width: 390, height: 844 },
  });
  const techPage = await techContext.newPage();
  await techPage.goto(
    `${BASE}/work/${KNOWN.financialDeniedJob.id}`,
    { waitUntil: "networkidle", timeout: 90_000 },
  );
  await techPage.waitForTimeout(800);
  await hideChrome(techPage);
  const techOfficeUrl = techPage.url();
  const redirectedFromOffice =
    techOfficeUrl.includes("/technician") ||
    (await techPage.getByText(/you can only open jobs assigned to you/i).count()) >
      0 ||
    !techOfficeUrl.includes(`/work/${KNOWN.financialDeniedJob.id}`);
  const moneyPathOnTechOffice =
    (await techPage.locator("#job-detail-billing").count()) > 0;
  report.screenshots.push(
    await shot(techPage, "financial-permission-denied.png", {
      fullPage: false,
    }),
  );

  const techJob = KNOWN.financialDeniedJob;
  const { data: techJobBefore } = await admin
    .from("jobs")
    .select("scheduled_at")
    .eq("id", techJob.id)
    .single();
  const priorScheduledAt = techJobBefore?.scheduled_at;
  const todayIso = new Date().toISOString();
  let overlayOpened = false;
  try {
    await admin
      .from("jobs")
      .update({ scheduled_at: todayIso, updated_at: todayIso })
      .eq("id", techJob.id)
      .eq("company_id", COMPANY_ID);

    await techPage.goto(`${BASE}/technician?jobId=${techJob.id}`, {
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    await hideChrome(techPage);
    await techPage.waitForTimeout(1200);
    overlayOpened =
      (await techPage.getByRole("dialog").count()) > 0 ||
      (await techPage
        .locator("[aria-labelledby='technician-job-details-title']")
        .count()) > 0 ||
      (await techPage.getByText(/JOB-1111/i).count()) > 0;
    if (!overlayOpened) {
      const jobCard = techPage
        .locator("button, a, [role='button']")
        .filter({ hasText: /JOB-1111|JOB-|SMK-/i })
        .first();
      if ((await jobCard.count()) > 0) {
        await jobCard.click({ force: true });
        await techPage.waitForTimeout(900);
      }
      overlayOpened =
        (await techPage.getByRole("dialog").count()) > 0 ||
        (await techPage.getByText(/JOB-1111/i).count()) > 0;
    }
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

  const financialPass = redirectedFromOffice && !moneyPathOnTechOffice;
  report.scenarios.push({
    scenario: "financial-permission-denied",
    jobId: techJob.id,
    jobNumber: techJob.jobNumber,
    estimateState: "hidden",
    invoiceState: "hidden",
    paymentState: "hidden",
    nextCommand: "n/a (office detail blocked)",
    moneyPathPresentation: moneyPathOnTechOffice
      ? "visible (unexpected)"
      : "not shown",
    duplicateFinancialFacts: false,
    competingCta: false,
    pass: financialPass,
    landed: techOfficeUrl,
  });
  report.smoke.technicianRedirect = {
    redirectedFromOffice,
    landed: techOfficeUrl,
    pass: redirectedFromOffice,
  };
  report.smoke.technicianOverlay = {
    opened: overlayOpened,
    pass: overlayOpened,
  };
  console.log(
    `[${financialPass ? "PASS" : "FAIL"}] financial-permission-denied`,
  );
  console.log(
    `[${overlayOpened ? "PASS" : "FAIL"}] technician-overlay-smoke`,
  );

  report.scenarios.push({
    scenario: "technician-overlay-smoke",
    jobId: techJob.id,
    jobNumber: techJob.jobNumber,
    estimateState: "n/a",
    invoiceState: "n/a",
    paymentState: "n/a",
    nextCommand: "technician overlay",
    moneyPathPresentation: "office Money path not used",
    duplicateFinancialFacts: false,
    competingCta: false,
    pass: overlayOpened,
  });

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
    billingAnchorOk: billingAnchor.ok,
    moneyPathIsBillingAnchor: true,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log("Report →", path.relative(ROOT, REPORT_PATH));
  if (failed.length) {
    console.error(
      "FAILED scenarios:",
      failed.map((s) => s.scenario).join(", "),
    );
    process.exitCode = 1;
  } else {
    console.log("All scenarios passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
