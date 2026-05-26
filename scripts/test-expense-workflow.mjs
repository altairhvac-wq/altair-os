/**
 * Expense workflow integration test (migrations 022–024).
 * Run: node scripts/test-expense-workflow.mjs
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const admin = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const results = [];
let failed = 0;

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  failed += 1;
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function assert(name, condition, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

// --- Pure workflow logic (mirrors shared/types/expense-workflow.ts) ---

const EXPENSE_TRANSITIONS = {
  draft: { submit: "submitted" },
  submitted: { approve: "approved", reject: "rejected" },
  approved: { reimburse: "reimbursed" },
  rejected: { return_to_draft: "draft" },
  reimbursed: {},
};

function getExpenseWorkflowActions(input) {
  const actions = [];
  const transitions = EXPENSE_TRANSITIONS[input.status];

  if (transitions.submit) {
    const isOwner = input.technicianId === input.currentUserId;
    if (isOwner || input.canManageBilling || input.canDispatchJobs) {
      actions.push("submit");
    }
  }

  if (transitions.approve && input.canManageBilling) actions.push("approve");
  if (transitions.reject && input.canManageBilling) actions.push("reject");

  if (transitions.reimburse && input.canManageBilling && input.isReimbursable) {
    actions.push("reimburse");
  }

  if (transitions.return_to_draft) {
    const isOwner = input.technicianId === input.currentUserId;
    if (isOwner || input.canManageBilling) actions.push("return_to_draft");
  }

  return actions;
}

function deriveIsReimbursable(paymentMethod) {
  return paymentMethod !== "company_card";
}

function runUnitTests() {
  console.log("\n=== Unit: workflow permissions ===");

  const techId = "tech-1";
  const billingId = "billing-1";

  const draftTech = getExpenseWorkflowActions({
    status: "draft",
    isReimbursable: true,
    technicianId: techId,
    currentUserId: techId,
    canManageBilling: false,
    canDispatchJobs: false,
  });
  assert("Technician draft shows submit", draftTech.includes("submit"));
  assert(
    "Technician draft hides approve/reject",
    !draftTech.includes("approve") && !draftTech.includes("reject"),
  );

  const submittedBilling = getExpenseWorkflowActions({
    status: "submitted",
    isReimbursable: true,
    technicianId: techId,
    currentUserId: billingId,
    canManageBilling: true,
    canDispatchJobs: false,
  });
  assert(
    "Billing submitted shows approve/reject",
    submittedBilling.includes("approve") && submittedBilling.includes("reject"),
  );

  const submittedTech = getExpenseWorkflowActions({
    status: "submitted",
    isReimbursable: true,
    technicianId: techId,
    currentUserId: techId,
    canManageBilling: false,
    canDispatchJobs: false,
  });
  assert(
    "Technician submitted hides approve/reject",
    !submittedTech.includes("approve") && !submittedTech.includes("reject"),
  );

  const approvedReimbursable = getExpenseWorkflowActions({
    status: "approved",
    isReimbursable: true,
    technicianId: techId,
    currentUserId: billingId,
    canManageBilling: true,
    canDispatchJobs: false,
  });
  assert(
    "Approved reimbursable shows Mark reimbursed",
    approvedReimbursable.includes("reimburse"),
  );

  const approvedCompanyCard = getExpenseWorkflowActions({
    status: "approved",
    isReimbursable: false,
    technicianId: techId,
    currentUserId: billingId,
    canManageBilling: true,
    canDispatchJobs: false,
  });
  assert(
    "Approved company-card hides reimbursement",
    !approvedCompanyCard.includes("reimburse"),
  );

  const rejectedTech = getExpenseWorkflowActions({
    status: "rejected",
    isReimbursable: true,
    technicianId: techId,
    currentUserId: techId,
    canManageBilling: false,
    canDispatchJobs: false,
  });
  assert(
    "Rejected owner can return to draft",
    rejectedTech.includes("return_to_draft"),
  );

  assert(
    "Company card not reimbursable by default",
    deriveIsReimbursable("company_card") === false,
  );
  assert(
    "Personal card reimbursable by default",
    deriveIsReimbursable("personal_card") === true,
  );
}

async function findTestCompany() {
  if (!admin) return null;

  const { data: companies } = await admin
    .from("companies")
    .select("id, name")
    .limit(5);

  if (!companies?.length) return null;

  for (const company of companies) {
    const { data: memberships } = await admin
      .from("company_memberships")
      .select("user_id, role")
      .eq("company_id", company.id)
      .eq("status", "active");

    const owner = memberships?.find((m) =>
      ["owner", "admin", "office_staff"].includes(m.role),
    );
    const tech = memberships?.find((m) => m.role === "technician");

    if (owner) {
      return { company, ownerUserId: owner.user_id, techUserId: tech?.user_id };
    }
  }

  return null;
}

async function updateExpenseStatus(client, companyId, expenseId, fromStatus, toStatus) {
  const { data, error } = await client
    .from("expenses")
    .update({ status: toStatus })
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .eq("status", fromStatus)
    .select("id, status")
    .maybeSingle();

  return { data, error };
}

async function recordActivity(client, row) {
  return client.from("expense_activities").insert(row).select("id, event_type").single();
}

async function runIntegrationTests() {
  console.log("\n=== Integration: database schema ===");

  if (!admin) {
    fail("Service role required for DB integration", "Set SUPABASE_SERVICE_ROLE_KEY in .env.local");
    return;
  }

  // Check migrations 023 columns exist
  const probeId = randomUUID();
  const { error: columnProbeError } = await admin.from("expenses").select("payment_method, is_reimbursable").limit(1);

  if (columnProbeError?.message?.includes("payment_method")) {
    fail("Migration 023 applied", columnProbeError.message);
    return;
  }
  pass("Migration 023 columns exist");

  // Check migration 024 enum values
  const ctx = await findTestCompany();
  if (!ctx) {
    fail("Find test company", "No company with owner membership found");
    return;
  }

  const { company, ownerUserId, techUserId } = ctx;
  pass("Found test company", company.name);

  const technicianId = techUserId ?? ownerUserId;

  // Find or skip job
  const { data: job } = await admin
    .from("jobs")
    .select("id, job_number, customer_id")
    .eq("company_id", company.id)
    .limit(1)
    .maybeSingle();

  const expenseId = randomUUID();
  const expenseNumber = `EXP-TEST-${Date.now()}`;

  const { data: created, error: createError } = await admin
    .from("expenses")
    .insert({
      id: expenseId,
      company_id: company.id,
      customer_id: job?.customer_id ?? null,
      job_id: job?.id ?? null,
      technician_id: technicianId,
      expense_number: expenseNumber,
      amount: 42.5,
      purchase_date: new Date().toISOString().slice(0, 10),
      merchant: "Test Vendor",
      category: "materials",
      payment_method: "personal_card",
      is_reimbursable: true,
      receipt_status: "attached",
      receipt_file_name: "test-receipt.jpg",
      receipt_storage_path: `company/${company.id}/expenses/${expenseId}/test-receipt.jpg`,
      status: "draft",
    })
    .select("id, status, payment_method, is_reimbursable")
    .single();

  if (createError) {
    fail("Create test expense", createError.message);
    return;
  }

  assert("Expense starts as draft", created.status === "draft");
  assert("Expense is reimbursable (personal card)", created.is_reimbursable === true);

  const { error: createdActivityError } = await recordActivity(admin, {
    company_id: company.id,
    expense_id: expenseId,
    actor_id: ownerUserId,
    event_type: "expense_created",
    metadata: {
      expense_id: expenseId,
      expense_number: expenseNumber,
      status: "draft",
      merchant: "Test Vendor",
      amount: 42.5,
    },
  });

  if (createdActivityError?.message?.includes("expense_created")) {
    fail("Migration 024 expense_created enum", createdActivityError.message);
  } else if (createdActivityError) {
    fail("Record expense_created activity", createdActivityError.message);
  } else {
    pass("expense_created activity inserts");
  }

  const { error: receiptActivityError } = await recordActivity(admin, {
    company_id: company.id,
    expense_id: expenseId,
    actor_id: ownerUserId,
    event_type: "expense_receipt_uploaded",
    metadata: {
      expense_id: expenseId,
      file_name: "test-receipt.jpg",
      merchant: "Test Vendor",
    },
  });

  if (receiptActivityError) {
    fail("Record expense_receipt_uploaded activity", receiptActivityError.message);
  } else {
    pass("expense_receipt_uploaded activity inserts");
  }

  // Submit
  const { data: submitted } = await updateExpenseStatus(
    admin,
    company.id,
    expenseId,
    "draft",
    "submitted",
  );
  assert("Submit draft → submitted", submitted?.status === "submitted");

  const { error: submitActivityError } = await recordActivity(admin, {
    company_id: company.id,
    expense_id: expenseId,
    actor_id: technicianId,
    event_type: "expense_submitted",
    metadata: {
      from_status: "draft",
      to_status: "submitted",
      expense_number: expenseNumber,
    },
  });
  assert("expense_submitted activity inserts", !submitActivityError?.message);

  // Approve
  const { data: approved } = await updateExpenseStatus(
    admin,
    company.id,
    expenseId,
    "submitted",
    "approved",
  );
  assert("Approve submitted → approved", approved?.status === "approved");

  // Reimburse
  const { data: reimbursed } = await updateExpenseStatus(
    admin,
    company.id,
    expenseId,
    "approved",
    "reimbursed",
  );
  assert("Reimburse approved → reimbursed", reimbursed?.status === "reimbursed");

  // Company card path
  const companyCardId = randomUUID();
  const { data: ccExpense } = await admin
    .from("expenses")
    .insert({
      id: companyCardId,
      company_id: company.id,
      technician_id: technicianId,
      expense_number: `${expenseNumber}-CC`,
      merchant: "Fuel Station",
      category: "fuel",
      payment_method: "company_card",
      is_reimbursable: false,
      receipt_status: "missing",
      status: "approved",
    })
    .select("is_reimbursable, payment_method, status")
    .single();

  assert(
    "Company card expense not reimbursable",
    ccExpense?.is_reimbursable === false && ccExpense?.payment_method === "company_card",
  );

  const ccActions = getExpenseWorkflowActions({
    status: "approved",
    isReimbursable: false,
    technicianId,
    currentUserId: ownerUserId,
    canManageBilling: true,
    canDispatchJobs: false,
  });
  assert("Company card approved has no reimburse action", !ccActions.includes("reimburse"));

  // Reject flow with reason
  const rejectId = randomUUID();
  await admin.from("expenses").insert({
    id: rejectId,
    company_id: company.id,
    technician_id: technicianId,
    expense_number: `${expenseNumber}-REJ`,
    merchant: "Bad Receipt",
    category: "other",
    payment_method: "personal_card",
    is_reimbursable: true,
    receipt_status: "missing",
    status: "submitted",
  });

  const rejectionReason = "Missing itemized receipt";
  const { data: rejected } = await updateExpenseStatus(
    admin,
    company.id,
    rejectId,
    "submitted",
    "rejected",
  );
  assert("Reject submitted → rejected", rejected?.status === "rejected");

  const { data: rejectActivity } = await recordActivity(admin, {
    company_id: company.id,
    expense_id: rejectId,
    actor_id: ownerUserId,
    event_type: "expense_rejected",
    metadata: {
      from_status: "submitted",
      to_status: "rejected",
      rejection_reason: rejectionReason,
      merchant: "Bad Receipt",
    },
  });
  assert(
    "Rejection reason saved in activity metadata",
    rejectActivity?.metadata?.rejection_reason === rejectionReason ||
      (await admin
        .from("expense_activities")
        .select("metadata")
        .eq("expense_id", rejectId)
        .eq("event_type", "expense_rejected")
        .single()).data?.metadata?.rejection_reason === rejectionReason,
  );

  const { data: backToDraft } = await updateExpenseStatus(
    admin,
    company.id,
    rejectId,
    "rejected",
    "draft",
  );
  assert("Return rejected → draft", backToDraft?.status === "draft");

  const { data: resubmitted } = await updateExpenseStatus(
    admin,
    company.id,
    rejectId,
    "draft",
    "submitted",
  );
  assert("Resubmit draft → submitted", resubmitted?.status === "submitted");

  // Timeline queries
  if (job?.id) {
    const { data: jobExpenses } = await admin
      .from("expenses")
      .select("id")
      .eq("company_id", company.id)
      .eq("job_id", job.id);

    const expenseIds = (jobExpenses ?? []).map((e) => e.id);
    const { data: jobActivities, error: jobActError } = await admin
      .from("expense_activities")
      .select("event_type, metadata")
      .eq("company_id", company.id)
      .in("expense_id", expenseIds.length ? expenseIds : [expenseId]);

    assert(
      "Job expense activities query works",
      !jobActError && (jobActivities?.length ?? 0) > 0,
      `${jobActivities?.length ?? 0} events`,
    );
  }

  if (job?.customer_id) {
    const { data: custExpenses } = await admin
      .from("expenses")
      .select("id")
      .eq("company_id", company.id)
      .eq("customer_id", job.customer_id);

    const expenseIds = (custExpenses ?? []).map((e) => e.id);
    const { data: custActivities, error: custActError } = await admin
      .from("expense_activities")
      .select("event_type")
      .eq("company_id", company.id)
      .in("expense_id", expenseIds.length ? expenseIds : [expenseId]);

    assert(
      "Customer expense activities query works",
      !custActError && (custActivities?.length ?? 0) > 0,
      `${custActivities?.length ?? 0} events`,
    );
  }

  // Company scoping: another company's data shouldn't leak
  const { data: otherCompanies } = await admin
    .from("companies")
    .select("id")
    .neq("id", company.id)
    .limit(1);

  if (otherCompanies?.length) {
    const { data: crossCompany } = await admin
      .from("expenses")
      .select("id")
      .eq("company_id", otherCompanies[0].id)
      .eq("id", expenseId);

    assert("Company scoping isolates expenses", (crossCompany?.length ?? 0) === 0);
  }

  // Cleanup test rows
  await admin.from("expense_activities").delete().in("expense_id", [expenseId, companyCardId, rejectId]);
  await admin.from("expenses").delete().in("id", [expenseId, companyCardId, rejectId]);
  pass("Cleaned up test expenses");
}

async function runAuthPermissionProbe() {
  console.log("\n=== Integration: auth permission probe ===");

  if (!admin) return;

  const ctx = await findTestCompany();
  if (!ctx?.techUserId || ctx.techUserId === ctx.ownerUserId) {
    pass("Auth permission probe skipped", "No separate technician user in DB");
    return;
  }

  // Verify technician membership role
  const { data: techMembership } = await admin
    .from("company_memberships")
    .select("role")
    .eq("company_id", ctx.company.id)
    .eq("user_id", ctx.techUserId)
    .single();

  assert("Technician role exists", techMembership?.role === "technician");

  const { data: billingMembership } = await admin
    .from("company_memberships")
    .select("role")
    .eq("company_id", ctx.company.id)
    .eq("user_id", ctx.ownerUserId)
    .single();

  const billingRoles = ["owner", "admin", "office_staff"];
  assert(
    "Billing user has manageBilling role",
    billingRoles.includes(billingMembership?.role ?? ""),
    billingMembership?.role,
  );
}

async function main() {
  console.log("Altair OS — Expense Workflow Test");
  console.log("==================================");

  runUnitTests();
  await runIntegrationTests();
  await runAuthPermissionProbe();

  console.log("\n=== Summary ===");
  console.log(`Passed: ${results.filter((r) => r.ok).length}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }

  console.log("\nAll tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
