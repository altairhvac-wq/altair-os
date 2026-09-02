/**
 * Mutation test for `verify-agent-queue-integrity.mjs`.
 *
 * ==================== WHY ====================
 * A green suite proves nothing until you have watched it go red. Each mutation
 * below reintroduces ONE audited defect by editing the real source, runs the
 * verifier, and demands that it fails — then restores the file byte for byte.
 *
 * ==================== WHAT COUNTS AS A CATCH ====================
 * Only an ASSERTION failure. A mutation that made the verifier crash, or that
 * did not apply because the anchor text had drifted, is reported as a HARNESS
 * DEFECT and fails this script — a harness that cannot apply its own mutation
 * would otherwise score a phantom catch and read as evidence.
 *
 * Run: node scripts/mutate-agent-queue-integrity.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const VERIFIER = "scripts/verify-agent-queue-integrity.mjs";
const CHIEF = "lib/database/queries/agent-chief-messages.ts";
const WORK = "lib/database/queries/agent-work-requests.ts";

/**
 * Each mutation names the invariant it attacks, so a failure here reads as
 * "this property is no longer defended" rather than "a string moved".
 */
const MUTATIONS = [
  {
    invariant: "tenant fairness (questions)",
    file: CHIEF,
    // Exactly the audited defect: filter the company in the route instead of
    // the query, leaving a globally ordered and limited page.
    //
    // The anchor carries the whole pull chain deliberately. The first draft
    // used only the company + role lines, which occur in five places in this
    // module — the mutation never applied and the harness reported it rather
    // than banking a phantom catch.
    from: `    .eq("company_id", input.companyId)
    .eq("role", "user")
    .eq("status", "queued")
    .gt("seq", input.afterSeq)`,
    to: `    .eq("role", "user")
    .eq("status", "queued")
    .gt("seq", input.afterSeq)`,
  },
  {
    invariant: "tenant fairness (work requests)",
    file: WORK,
    from: `    .eq("company_id", input.companyId)
    .is("applied_at", null)
    .gt("seq", input.afterSeq)`,
    to: `    .is("applied_at", null)
    .gt("seq", input.afterSeq)`,
  },
  {
    invariant: "settlement proves a row moved",
    file: WORK,
    // The original bug in its purest form: report success whenever the
    // database did not error, without consulting the affected-row count.
    from: `  if (Array.isArray(data) && data.length > 0) {
    return { outcome: "settled" };
  }

  // Zero rows. Distinguish "already decided" from "no such request for this`,
    to: `  if (true) {
    return { outcome: "settled" };
  }

  // Zero rows. Distinguish "already decided" from "no such request for this`,
  },
  {
    invariant: "settlement is one-way",
    file: WORK,
    from: `    .is("applied_at", null)
    .select("id");`,
    to: `    .select("id");`,
  },
  {
    invariant: "answer identity is bound to the question",
    file: CHIEF,
    // A key that is not derived from the question collapses every answer in a
    // conversation onto one row.
    from: "  return `chief-answer:${questionId}`;",
    to: "  return `chief-answer:shared`;",
  },
  {
    invariant: "a reply is never written before the claim succeeds",
    file: CHIEF,
    // The SECOND Codex pass's residual defect, reintroduced precisely: when
    // the claim (queued -> answered) finds zero rows, fetch the question
    // anyway and insert a reply regardless of whether it is still answerable
    // — exactly what the pre-fix ordering did (insert first, check second).
    // A late answer to an already-`failed` question then writes a chief
    // reply row underneath it: a failed question with an answer no failure
    // message explains.
    from: `  if (!claimed) {
    // Zero rows: the question is already terminal (answered or failed — a
    // late answer, a duplicate answer, or the loser of a concurrent race
    // against \`recordChiefFailure\`) or does not exist for this company. NO
    // REPLY IS WRITTEN in either case — that is the guarantee this reorder
    // exists to provide.
    const existing = await chiefMessagesTable(supabase)
      .select("id")
      .eq("id", input.questionId)
      .eq("company_id", input.companyId)
      .eq("role", "user")
      .maybeSingle();
    return { outcome: existing.data ? "already_settled" : "not_found" };
  }

  const answer = await chiefMessagesTable(supabase).insert({
    company_id: input.companyId,
    conversation_id: claimed.conversation_id,`,
    to: `  let conversationId = claimed?.conversation_id;
  if (!claimed) {
    const existing = await chiefMessagesTable(supabase)
      .select("id, conversation_id")
      .eq("id", input.questionId)
      .eq("company_id", input.companyId)
      .eq("role", "user")
      .maybeSingle();
    if (!existing.data) {
      return { outcome: "not_found" };
    }
    conversationId = existing.data.conversation_id;
  }

  const answer = await chiefMessagesTable(supabase).insert({
    company_id: input.companyId,
    conversation_id: conversationId,`,
  },
  {
    invariant: "answered is terminal (failure path)",
    file: CHIEF,
    from: `    .eq("role", "user")
    .eq("status", "queued")
    .select("id");

  if (error) {
    console.error("[recordChiefFailure] update failed:", {`,
    to: `    .eq("role", "user")
    .select("id");

  if (error) {
    console.error("[recordChiefFailure] update failed:", {`,
  },
  {
    invariant: "answered is terminal (answer path)",
    file: CHIEF,
    // Without `status = 'queued'` guarding the CLAIM itself, an already-
    // ANSWERED or FAILED question would re-satisfy the update, re-stamping
    // answered_at and re-attempting an insert that then collides with its
    // own prior reply — the one-way state machine breaks at its source.
    from: `    .eq("id", input.questionId)
    .eq("company_id", input.companyId)
    .eq("role", "user")
    .eq("status", "queued")
    .select("id, conversation_id");`,
    to: `    .eq("id", input.questionId)
    .eq("company_id", input.companyId)
    .eq("role", "user")
    .select("id, conversation_id");`,
  },
  {
    invariant: "a batch accounts for every item",
    file: WORK,
    // Restore the early return: a mid-batch error abandons the remainder and
    // reports one error for the whole call.
    from: `    failed.push({
      requestKey: key,
      error: mapDatabaseError(insert.error) ?? "A request could not be queued.",
    });`,
    to: `    return {
      received: input.requests.length,
      queued,
      duplicates,
      rejected,
      failed,
    };`,
  },
  {
    invariant: "the conversation window shows the newest turns",
    file: CHIEF,
    // The original defect: ascending order under a LIMIT returns the OLDEST
    // rows, freezing the surface once the window fills.
    from: `    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);`,
    to: `    .order("created_at", { ascending: true })
    .limit(input.limit ?? 100);`,
  },
  {
    invariant: "a failed decisions read is not an empty queue",
    file: "lib/database/queries/agent-decisions.ts",
    from: `    // Null, never an empty list. See the note above this function.
    return null;`,
    to: `    return [];`,
  },
  {
    invariant: "refused items are named",
    file: WORK,
    from: `    const params = validateWorkRequestParams(request.kind, request.params ?? null);
    if (!params.ok) {
      rejected.push({ requestKey: key, error: params.error });
      continue;
    }`,
    to: `    const params = validateWorkRequestParams(request.kind, request.params ?? null);
    if (!params.ok) {
      continue;
    }`,
  },
];

function runVerifier() {
  const result = spawnSync(process.execPath, [VERIFIER], {
    encoding: "utf8",
    shell: false,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return { code: result.status, output };
}

console.log("Baseline: the verifier must be green before any mutation.\n");
const baseline = runVerifier();
if (baseline.code !== 0) {
  console.error("BASELINE IS RED. Mutation results would be meaningless.");
  console.error(baseline.output.slice(-3000));
  process.exit(1);
}
console.log(`  baseline green (${baseline.output.match(/(\d+)\/\1 checks passed/)?.[0] ?? "ok"})\n`);

let caught = 0;
let escaped = 0;
let harnessDefects = 0;

for (const mutation of MUTATIONS) {
  const original = readFileSync(mutation.file, "utf8");

  const occurrences = original.split(mutation.from).length - 1;
  if (occurrences !== 1) {
    // The anchor is gone or ambiguous: the mutation never applied, so any
    // red result would be a lie. This is a harness defect, not a catch.
    harnessDefects += 1;
    console.error(
      `  HARNESS  ${mutation.invariant} — anchor matched ${occurrences} times in ${mutation.file}`,
    );
    continue;
  }

  writeFileSync(mutation.file, original.replace(mutation.from, mutation.to));
  let result;
  try {
    result = runVerifier();
  } finally {
    writeFileSync(mutation.file, original);
  }

  const assertedFailure = /check\(s\) failed\./.test(result.output);
  if (result.code !== 0 && assertedFailure) {
    caught += 1;
    const failing = (result.output.match(/ {2}FAIL {2}[^\n]+/g) ?? []).slice(0, 2);
    console.log(`  CAUGHT   ${mutation.invariant}`);
    for (const line of failing) console.log(`             ${line.trim()}`);
  } else if (result.code !== 0) {
    // Non-zero without an assertion tally means the verifier crashed. That is
    // not evidence the property is defended.
    harnessDefects += 1;
    console.error(`  HARNESS  ${mutation.invariant} — verifier crashed rather than asserted`);
    console.error(result.output.slice(-1200));
  } else {
    escaped += 1;
    console.error(`  ESCAPED  ${mutation.invariant} — the suite passed with the defect present`);
  }
}

// Restoration is only trustworthy if it is checked: a mutation left on disk
// would silently poison every later run.
const restored = runVerifier();
console.log(
  `\n${caught} caught, ${escaped} escaped, ${harnessDefects} harness defect(s); ` +
    `post-run baseline ${restored.code === 0 ? "green" : "RED"}`,
);

if (escaped > 0 || harnessDefects > 0 || restored.code !== 0) {
  process.exit(1);
}
