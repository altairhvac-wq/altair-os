/**
 * The agent queues, EXECUTED.
 *
 * ==================== WHY THIS VERIFIER EXISTS ====================
 * `verify-work-requests.mjs` and `verify-marketing-command.mjs` read these
 * modules as text. They were green while both pull queries applied a global
 * limit before the company filter — a defect that starves a tenant forever
 * and that no amount of grepping for `company_id` can see, because the
 * identifier is right there in the route.
 *
 * This one runs the real query modules against a fake PostgREST and asserts
 * the properties that matter operationally rather than textually:
 *
 *   FAIRNESS      one company's backlog cannot consume another's delivery
 *   SETTLEMENT    "recorded" means a row actually moved
 *   IDENTITY      an answer is bound to its question, not to a caller's key
 *   MONOTONICITY  a terminal row is never rewritten by a late callback
 *   HONESTY       every submitted item is accounted for by name
 *
 * Each is written adversarially: the setup is the situation that broke, and
 * the assertion fails on the OLD behaviour. Where a check would still pass if
 * the fix were reverted, it is marked and strengthened.
 *
 * Run: node scripts/verify-agent-queue-integrity.mjs
 */
import { createFakeSupabase } from "./lib/fake-supabase.mjs";
import { loadQueryModule } from "./lib/load-query-module.mjs";

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail === undefined ? "" : detail);
  }
}

const OURS = "company-ours";
const THEIRS = "company-theirs";

const { client, store } = createFakeSupabase();

const chief = await loadQueryModule(
  "lib/database/queries/agent-chief-messages.ts",
  client,
  "chief-q",
);
const work = await loadQueryModule(
  "lib/database/queries/agent-work-requests.ts",
  client,
  "work-q",
);

function seedQuestion(companyId, overrides = {}) {
  return store.seed("agent_chief_messages", {
    company_id: companyId,
    conversation_id: `conv-${companyId}`,
    role: "user",
    status: "queued",
    body: "a question",
    request_key: `ask-${Math.abs(store.idCounter + 1)}-${companyId}`,
    ...overrides,
  });
}

function seedRequest(companyId, overrides = {}) {
  return store.seed("agent_work_requests", {
    company_id: companyId,
    kind: "finance_report",
    request_key: `work-${Math.abs(store.idCounter + 1)}-${companyId}`,
    applied_at: null,
    outcome: null,
    ...overrides,
  });
}

/* ==================================================================== */
/* FAIRNESS — the P1                                                    */
/* ==================================================================== */

console.log("\nOne tenant's backlog cannot starve another (P1-1)");

{
  store.reset();
  // The exact production shape: a large foreign backlog queued FIRST, so it
  // owns every low seq, then our question. Under the old query — global
  // order+limit, company filtered afterwards — this returned zero of ours.
  for (let index = 0; index < 60; index += 1) seedQuestion(THEIRS);
  const mine = seedQuestion(OURS);

  const page = await chief.listQueuedChiefQuestions({
    companyId: OURS,
    afterSeq: 0,
    limit: 10,
  });

  check(
    "A NOISY TENANT'S 60-ROW BACKLOG DOES NOT CONSUME OUR PAGE",
    Array.isArray(page) && page.length === 1 && page[0].id === mine.id,
    page,
  );
  check(
    "and nothing foreign is returned at all",
    Array.isArray(page) && page.every((q) => q.companyId === OURS),
  );
}

{
  store.reset();
  for (let index = 0; index < 60; index += 1) seedRequest(THEIRS);
  const mine = seedRequest(OURS);

  const page = await work.listUnappliedWorkRequests({
    companyId: OURS,
    afterSeq: 0,
    limit: 5,
  });

  check(
    "the same holds for work requests",
    Array.isArray(page) && page.length === 1 && page[0].id === mine.id,
    page,
  );
}

{
  store.reset();
  // Repeated cycles: tenant A keeps arriving, tenant B asks once. B must be
  // serviced on its VERY NEXT poll, not eventually — the bound is one cycle.
  let servicedOnCycle = -1;
  const quiet = [];
  for (let cycle = 0; cycle < 5; cycle += 1) {
    for (let index = 0; index < 25; index += 1) seedQuestion(THEIRS);
    if (cycle === 2) quiet.push(seedQuestion(OURS));

    const page = await chief.listQueuedChiefQuestions({
      companyId: OURS,
      afterSeq: 0,
      limit: 10,
    });
    if (servicedOnCycle === -1 && page.length > 0) servicedOnCycle = cycle;
  }
  check(
    "FRESH WORK IS SERVICED ON THE NEXT CYCLE, not after the backlog drains",
    servicedOnCycle === 2,
    { servicedOnCycle, quiet: quiet.length },
  );
}

{
  store.reset();
  // Bounded work per cycle survives the fix: our own backlog is still paged.
  for (let index = 0; index < 40; index += 1) seedQuestion(OURS);
  const page = await chief.listQueuedChiefQuestions({
    companyId: OURS,
    afterSeq: 0,
    limit: 10,
  });
  check(
    "our own backlog is still bounded by the limit",
    page.length === 10,
    page.length,
  );
  const seqs = page.map((q) => q.seq);
  check(
    "and delivered oldest first, with no duplicates",
    seqs.every((value, index) => index === 0 || value > seqs[index - 1]) &&
      new Set(page.map((q) => q.id)).size === page.length,
    seqs,
  );
}

{
  store.reset();
  // A settled row must not be re-offered — otherwise "bounded" work repeats
  // forever and the fairness guarantee is vacuous.
  const first = seedRequest(OURS);
  seedRequest(OURS);
  await work.markWorkRequestApplied({
    requestId: first.id,
    companyId: OURS,
    outcome: "completed",
    detail: null,
    nowIso: "2026-09-02T10:00:00.000Z",
  });
  const page = await work.listUnappliedWorkRequests({
    companyId: OURS,
    afterSeq: 0,
    limit: 10,
  });
  check(
    "a settled request leaves the work list",
    page.length === 1 && page[0].id !== first.id,
    page.map((r) => r.id),
  );
}

/* ==================================================================== */
/* SETTLEMENT — P2-1                                                    */
/* ==================================================================== */

console.log("\n'Recorded' means a row actually moved (P2-1)");

{
  store.reset();
  const request = seedRequest(OURS);

  const first = await work.markWorkRequestApplied({
    requestId: request.id,
    companyId: OURS,
    outcome: "completed",
    detail: "done",
    nowIso: "2026-09-02T10:00:00.000Z",
  });
  check("a real settlement reports `settled`", first.outcome === "settled", first);

  const second = await work.markWorkRequestApplied({
    requestId: request.id,
    companyId: OURS,
    outcome: "failed",
    detail: "a late duplicate",
    nowIso: "2026-09-02T11:00:00.000Z",
  });
  check(
    "A REPLAY IS `already_settled`, NOT SUCCESS",
    second.outcome === "already_settled",
    second,
  );

  const row = store
    .rows("agent_work_requests")
    .find((entry) => entry.id === request.id);
  check(
    "and the replay did NOT overwrite the recorded outcome",
    row.outcome === "completed" && row.outcome_detail === "done",
    row,
  );

  const missing = await work.markWorkRequestApplied({
    requestId: "no-such-request",
    companyId: OURS,
    outcome: "completed",
    detail: null,
    nowIso: "2026-09-02T12:00:00.000Z",
  });
  check(
    "AN UNKNOWN ID IS `not_found`, NOT AN ACKNOWLEDGEMENT",
    missing.outcome === "not_found",
    missing,
  );

  const foreign = seedRequest(THEIRS);
  const crossTenant = await work.markWorkRequestApplied({
    requestId: foreign.id,
    companyId: OURS,
    outcome: "completed",
    detail: null,
    nowIso: "2026-09-02T12:00:00.000Z",
  });
  check(
    "another company's request is not settleable, and reads as not_found",
    crossTenant.outcome === "not_found",
    crossTenant,
  );
  const foreignRow = store
    .rows("agent_work_requests")
    .find((entry) => entry.id === foreign.id);
  check(
    "and that row was not touched",
    foreignRow.applied_at === null && foreignRow.outcome === null,
    foreignRow,
  );
}

{
  store.reset();
  // Racy settlement: two passes settle the same request. Exactly one may win,
  // and the loser must be told it was a replay rather than a success.
  const request = seedRequest(OURS);
  const [a, b] = await Promise.all([
    work.markWorkRequestApplied({
      requestId: request.id,
      companyId: OURS,
      outcome: "completed",
      detail: "pass A",
      nowIso: "2026-09-02T10:00:00.000Z",
    }),
    work.markWorkRequestApplied({
      requestId: request.id,
      companyId: OURS,
      outcome: "refused",
      detail: "pass B",
      nowIso: "2026-09-02T10:00:01.000Z",
    }),
  ]);
  const outcomes = [a.outcome, b.outcome].sort();
  check(
    "CONCURRENT SETTLEMENT PRODUCES ONE WINNER AND ONE REPLAY",
    outcomes[0] === "already_settled" && outcomes[1] === "settled",
    outcomes,
  );
}

/* ==================================================================== */
/* IDENTITY — P2-2                                                      */
/* ==================================================================== */

console.log("\nAn answer is bound to its question, not to a caller's key (P2-2)");

{
  store.reset();
  const question = seedQuestion(OURS);

  check(
    "the answer key is DERIVED from the question id",
    chief.chiefAnswerRequestKey(question.id) === `chief-answer:${question.id}`,
    chief.chiefAnswerRequestKey(question.id),
  );

  // The attack the audit described: a caller occupies the key an answer would
  // use. With the key derived server-side there is no caller input to do it
  // with, so the only way to reach the collision is to plant the row.
  store.seed("agent_chief_messages", {
    company_id: OURS,
    conversation_id: "conv-other",
    role: "user",
    status: "queued",
    body: "a squatter holding the derived key",
    request_key: `chief-answer:${question.id}`,
  });

  const squatted = await chief.recordChiefAnswer({
    questionId: question.id,
    companyId: OURS,
    body: "the real answer",
    nowIso: "2026-09-02T10:00:00.000Z",
  });

  check(
    "A KEY COLLISION WITH A FOREIGN ROW IS AN ERROR, NOT A SILENT SETTLE",
    typeof squatted.error === "string" && squatted.outcome === undefined,
    squatted,
  );
  const stillQueued = store
    .rows("agent_chief_messages")
    .find((row) => row.id === question.id);
  check(
    "and the question is NOT marked answered when its answer was not stored",
    stillQueued.status === "queued",
    stillQueued,
  );
}

{
  store.reset();
  const question = seedQuestion(OURS);

  const first = await chief.recordChiefAnswer({
    questionId: question.id,
    companyId: OURS,
    body: "the answer",
    nowIso: "2026-09-02T10:00:00.000Z",
  });
  check("a first answer settles the question", first.outcome === "settled", first);

  const replay = await chief.recordChiefAnswer({
    questionId: question.id,
    companyId: OURS,
    body: "the answer",
    nowIso: "2026-09-02T10:05:00.000Z",
  });
  check(
    "re-posting the same answer is a replay, not a second reply",
    replay.outcome === "already_settled",
    replay,
  );
  const replies = store
    .rows("agent_chief_messages")
    .filter((row) => row.role === "chief" && row.in_reply_to === question.id);
  check(
    "EXACTLY ONE CHIEF REPLY EXISTS for the question",
    replies.length === 1,
    replies.length,
  );

  const foreign = seedQuestion(THEIRS);
  const crossTenant = await chief.recordChiefAnswer({
    questionId: foreign.id,
    companyId: OURS,
    body: "an answer for someone else's question",
    nowIso: "2026-09-02T10:10:00.000Z",
  });
  check(
    "a question belonging to another company cannot be answered",
    crossTenant.outcome === "not_found",
    crossTenant,
  );
  check(
    "and no reply row was written for it",
    !store
      .rows("agent_chief_messages")
      .some((row) => row.role === "chief" && row.in_reply_to === foreign.id),
  );
}

{
  store.reset();
  // Two DIFFERENT questions must remain distinct: the derived key must not
  // collapse them (which is how a "bind it to the company" shortcut fails).
  const one = seedQuestion(OURS);
  const two = seedQuestion(OURS);
  await chief.recordChiefAnswer({
    questionId: one.id,
    companyId: OURS,
    body: "answer one",
    nowIso: "2026-09-02T10:00:00.000Z",
  });
  const second = await chief.recordChiefAnswer({
    questionId: two.id,
    companyId: OURS,
    body: "answer two",
    nowIso: "2026-09-02T10:01:00.000Z",
  });
  check(
    "DIFFERENT QUESTIONS GET DIFFERENT ANSWERS",
    second.outcome === "settled" &&
      store
        .rows("agent_chief_messages")
        .filter((row) => row.role === "chief").length === 2,
    second,
  );
}

/* ==================================================================== */
/* MONOTONICITY — P2-3                                                  */
/* ==================================================================== */

console.log("\nAnswered is terminal (P2-3)");

{
  store.reset();
  const question = seedQuestion(OURS);
  await chief.recordChiefAnswer({
    questionId: question.id,
    companyId: OURS,
    body: "the answer the operator can see",
    nowIso: "2026-09-02T10:00:00.000Z",
  });

  // The late callback: a timeout that fires after the answer landed.
  const late = await chief.recordChiefFailure({
    questionId: question.id,
    companyId: OURS,
    errorDetail: "the run timed out",
  });

  const row = store
    .rows("agent_chief_messages")
    .find((entry) => entry.id === question.id);
  check(
    "A LATE FAILURE CANNOT REWRITE AN ANSWERED QUESTION",
    row.status === "answered" && row.error_detail === null,
    row,
  );
  check(
    "and the caller is told it was already settled",
    late.outcome === "already_settled",
    late,
  );
}

{
  store.reset();
  const question = seedQuestion(OURS);
  const first = await chief.recordChiefFailure({
    questionId: question.id,
    companyId: OURS,
    errorDetail: "first failure",
  });
  const second = await chief.recordChiefFailure({
    questionId: question.id,
    companyId: OURS,
    errorDetail: "a duplicate callback",
  });
  const row = store
    .rows("agent_chief_messages")
    .find((entry) => entry.id === question.id);
  check(
    "a duplicated failure callback does not rewrite the first detail",
    first.outcome === "settled" &&
      second.outcome === "already_settled" &&
      row.error_detail === "first failure",
    { first, second, detail: row.error_detail },
  );

  const missing = await chief.recordChiefFailure({
    questionId: "no-such-question",
    companyId: OURS,
    errorDetail: "for a question that does not exist",
  });
  check(
    "a failure for an unknown question is not_found, not success",
    missing.outcome === "not_found",
    missing,
  );

  const foreign = seedQuestion(THEIRS);
  const crossTenant = await chief.recordChiefFailure({
    questionId: foreign.id,
    companyId: OURS,
    errorDetail: "someone else's question",
  });
  const foreignRow = store
    .rows("agent_chief_messages")
    .find((entry) => entry.id === foreign.id);
  check(
    "and another company's question cannot be failed",
    crossTenant.outcome === "not_found" && foreignRow.status === "queued",
    crossTenant,
  );
}

{
  store.reset();
  // An answer must not resurrect a FAILED question either — the transition is
  // one-way in both directions, not just answered-over-failed.
  const question = seedQuestion(OURS, { status: "failed", error_detail: "gave up" });
  const answered = await chief.recordChiefAnswer({
    questionId: question.id,
    companyId: OURS,
    body: "a very late answer",
    nowIso: "2026-09-02T10:00:00.000Z",
  });
  const row = store
    .rows("agent_chief_messages")
    .find((entry) => entry.id === question.id);
  check(
    "A LATE ANSWER DOES NOT REOPEN A FAILED QUESTION",
    row.status === "failed" && answered.outcome === "already_settled",
    { status: row.status, answered },
  );
  check(
    "A LATE ANSWER TO A FAILED QUESTION WRITES NO REPLY ROW",
    // The residual defect the second Codex pass found: the reply insert
    // used to happen BEFORE the guarded settle check, so a late answer to an
    // already-failed question still wrote a chief reply — a failed question
    // sitting above an answer no failure message explained. The claim
    // (queued -> answered) is now attempted FIRST; a question already
    // `failed` is not `queued`, so the claim matches nothing and the reply
    // is never inserted at all.
    !store
      .rows("agent_chief_messages")
      .some((entry) => entry.role === "chief" && entry.in_reply_to === question.id),
    store.rows("agent_chief_messages").filter((entry) => entry.role === "chief"),
  );
  check(
    "and the original failure detail is untouched",
    row.error_detail === "gave up",
    row.error_detail,
  );
}

/* ==================================================================== */
/* RACE — a late answer must never insert a reply for a question that   */
/* concurrently loses the claim to `recordChiefFailure`, in EITHER order */
/* ==================================================================== */

console.log("\nConcurrent answer/failure race: exactly one winner, never a stray reply");

{
  store.reset();
  // Answer arrives first in the array — with the fake store's synchronous
  // `.then()`, Promise.all dispatches thenables in array order, so this
  // pins the ANSWER as the one that wins the underlying CAS.
  const question = seedQuestion(OURS);
  const [answered, failed] = await Promise.all([
    chief.recordChiefAnswer({
      questionId: question.id,
      companyId: OURS,
      body: "the answer that wins the race",
      nowIso: "2026-09-02T10:00:00.000Z",
    }),
    chief.recordChiefFailure({
      questionId: question.id,
      companyId: OURS,
      errorDetail: "arrived a moment later",
    }),
  ]);
  const row = store
    .rows("agent_chief_messages")
    .find((entry) => entry.id === question.id);
  const replies = store
    .rows("agent_chief_messages")
    .filter((entry) => entry.role === "chief" && entry.in_reply_to === question.id);
  check(
    "THE ANSWER WINS: settled, the failure sees already_settled",
    answered.outcome === "settled" && failed.outcome === "already_settled",
    { answered, failed },
  );
  check(
    "the question ends up ANSWERED with EXACTLY ONE reply, no error_detail",
    row.status === "answered" && replies.length === 1 && row.error_detail === null,
    { status: row.status, replies: replies.length, errorDetail: row.error_detail },
  );
}

{
  store.reset();
  // Same race, opposite array order: the failure now wins the CAS.
  const question = seedQuestion(OURS);
  const [failed, answered] = await Promise.all([
    chief.recordChiefFailure({
      questionId: question.id,
      companyId: OURS,
      errorDetail: "this one wins the race",
    }),
    chief.recordChiefAnswer({
      questionId: question.id,
      companyId: OURS,
      body: "arrives after the question already failed",
      nowIso: "2026-09-02T10:00:01.000Z",
    }),
  ]);
  const row = store
    .rows("agent_chief_messages")
    .find((entry) => entry.id === question.id);
  const replies = store
    .rows("agent_chief_messages")
    .filter((entry) => entry.role === "chief" && entry.in_reply_to === question.id);
  check(
    "THE FAILURE WINS: settled, the answer sees already_settled",
    failed.outcome === "settled" && answered.outcome === "already_settled",
    { failed, answered },
  );
  check(
    "the question ends up FAILED with NO REPLY ROW AT ALL",
    row.status === "failed" &&
      row.error_detail === "this one wins the race" &&
      replies.length === 0,
    { status: row.status, errorDetail: row.error_detail, replies: replies.length },
  );
}

/* ==================================================================== */
/* HONESTY — P2-4 and P3-2                                              */
/* ==================================================================== */

console.log("\nEvery submitted item is accounted for by name (P2-4, P3-2)");

{
  store.reset();
  const report = await work.enqueueWorkRequestsFromAgent({
    companyId: OURS,
    requests: [
      {
        requestKey: "chief-cmd:q1:1-research_topic",
        kind: "research_topic",
        params: { topic: "a perfectly valid topic" },
      },
      {
        requestKey: "chief-cmd:q1:2-seo_draft",
        kind: "seo_draft",
        // Refused by the shared validator: no topic.
        params: { primaryKeyword: "hvac" },
      },
      {
        requestKey: "chief-cmd:q1:3-publish_everything",
        kind: "publish_everything",
        params: { topic: "a valid topic" },
      },
    ],
  });

  check(
    "the arithmetic closes: queued + duplicates + rejected + failed === received",
    report.received === 3 &&
      report.queued + report.duplicates + report.rejected.length + report.failed.length ===
        report.received,
    report,
  );
  check(
    "REFUSED ITEMS ARE NAMED, not silently dropped",
    report.queued === 1 &&
      report.rejected.length === 2 &&
      report.rejected.every((entry) => entry.requestKey && entry.error),
    report.rejected,
  );
  check(
    "and only the valid one was written",
    store.rows("agent_work_requests").length === 1,
    store.rows("agent_work_requests").length,
  );
}

{
  store.reset();
  // A mid-batch database error must not abandon the rest of the batch, and
  // must not claim the prefix was never queued.
  store.failNext("agent_work_requests", "insert", {
    code: "42501",
    message: "permission denied for sequence",
  });
  const report = await work.enqueueWorkRequestsFromAgent({
    companyId: OURS,
    requests: [
      {
        requestKey: "chief-cmd:q2:1-research_topic",
        kind: "research_topic",
        params: { topic: "the item the database refuses" },
      },
      {
        requestKey: "chief-cmd:q2:2-research_topic",
        kind: "research_topic",
        params: { topic: "the item after it, which must still be attempted" },
      },
    ],
  });

  check(
    "A MID-BATCH DATABASE ERROR DOES NOT ABANDON THE REST",
    report.queued === 1 && report.failed.length === 1,
    report,
  );
  check(
    "the failed item is named by its own key",
    report.failed[0]?.requestKey === "chief-cmd:q2:1-research_topic",
    report.failed,
  );
  check(
    "and the arithmetic still closes",
    report.queued + report.duplicates + report.rejected.length + report.failed.length ===
      report.received,
    report,
  );
}

{
  store.reset();
  const request = {
    requestKey: "chief-cmd:q3:1-research_topic",
    kind: "research_topic",
    params: { topic: "asked once, replayed once" },
  };
  await work.enqueueWorkRequestsFromAgent({ companyId: OURS, requests: [request] });
  const replay = await work.enqueueWorkRequestsFromAgent({
    companyId: OURS,
    requests: [request],
  });
  check(
    "REPLAYING A BATCH QUEUES NOTHING TWICE",
    replay.queued === 0 &&
      replay.duplicates === 1 &&
      store.rows("agent_work_requests").length === 1,
    replay,
  );
}

{
  store.reset();
  // Params must survive the round trip in the shape the runner expects, and
  // an unknown field must be refused rather than stored.
  const report = await work.enqueueWorkRequestsFromAgent({
    companyId: OURS,
    requests: [
      {
        requestKey: "chief-cmd:q4:1-create_video",
        kind: "create_video",
        params: { topic: "a valid topic", command: "rm -rf /" },
      },
    ],
  });
  check(
    "AN UNKNOWN PARAM FIELD IS REFUSED, never stored",
    report.rejected.length === 1 && store.rows("agent_work_requests").length === 0,
    report,
  );
}

/* ==================================================================== */
/* THE DISPLAY WINDOW — found by the post-remediation adversarial sweep  */
/* ==================================================================== */

console.log("\nA bounded conversation read shows the NEWEST turns");

{
  store.reset();
  // 60 rows of history, then the exchange the operator is actually waiting on.
  // Ordering ascending under a LIMIT returned the oldest 50 and froze the
  // surface: every later question was stored, settled, and invisible.
  for (let index = 0; index < 60; index += 1) {
    store.seed("agent_chief_messages", {
      company_id: OURS,
      conversation_id: "conv-ours",
      role: index % 2 === 0 ? "user" : "chief",
      status: "answered",
      body: `old message ${index}`,
      request_key: `old-${index}`,
      created_at: `2026-09-01T00:${String(index).padStart(2, "0")}:00.000Z`,
    });
  }
  const newest = store.seed("agent_chief_messages", {
    company_id: OURS,
    conversation_id: "conv-ours",
    role: "user",
    status: "queued",
    body: "the question I just asked",
    request_key: "the-newest-one",
    created_at: "2026-09-02T12:00:00.000Z",
  });

  const shown = await chief.listChiefMessages({ companyId: OURS, limit: 50 });

  check(
    "THE NEWEST MESSAGE IS IN THE WINDOW",
    shown.some((message) => message.id === newest.id),
    shown.length,
  );
  check(
    "the window is bounded by the limit",
    shown.length === 50,
    shown.length,
  );
  check(
    "and is returned oldest-first, so a conversation still reads downwards",
    shown.every(
      (message, index) =>
        index === 0 ||
        Date.parse(message.createdAt) >= Date.parse(shown[index - 1].createdAt),
    ),
  );
  check(
    "A QUEUED QUESTION IS VISIBLE, so the surface can say it is waiting",
    shown.some((message) => message.role === "user" && message.status === "queued"),
  );
  check(
    "and another company's conversation is never mixed in",
    (
      await (async () => {
        store.seed("agent_chief_messages", {
          company_id: THEIRS,
          conversation_id: "conv-theirs",
          role: "user",
          status: "queued",
          body: "not ours",
          request_key: "theirs-1",
          created_at: "2026-09-02T13:00:00.000Z",
        });
        return chief.listChiefMessages({ companyId: OURS, limit: 50 });
      })()
    ).every((message) => message.body !== "not ours"),
  );
}

/* ==================================================================== */
/* THE THIRD QUEUE — a failed read is not an empty queue                */
/* ==================================================================== */

console.log("\nA failed decisions read is distinguishable from a quiet queue");

{
  store.reset();
  const decisions = await loadQueryModule(
    "lib/database/queries/agent-decisions.ts",
    client,
    "decisions-q",
  );

  const quiet = await decisions.listAgentDecisionsSince(OURS, 0, 100);
  check(
    "a genuinely empty queue is an empty list",
    Array.isArray(quiet) && quiet.length === 0,
    quiet,
  );

  store.failNext("agent_marketing_decisions", "select", {
    code: "42501",
    message: "permission denied for table agent_marketing_decisions",
  });
  const broken = await decisions.listAgentDecisionsSince(OURS, 0, 100);
  check(
    "A BROKEN READ IS NULL, NOT AN EMPTY LIST",
    broken === null,
    broken,
  );
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
