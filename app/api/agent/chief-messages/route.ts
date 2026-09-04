import { NextResponse } from "next/server";
import {
  getAgentIngestCompanyId,
  getMissingAgentBridgeEnvVars,
  isAgentBridgeConfigured,
  isAuthorizedAgentRequest,
} from "@/lib/agent-bridge/env";
import {
  listQueuedChiefQuestions,
  recordChiefAnswer,
  recordChiefFailure,
} from "@/lib/database/queries/agent-chief-messages";
import { CHIEF_MESSAGE_MAX } from "@/shared/types/marketing-command";
import {
  isDelivered,
  settlementHttpStatus,
} from "@/shared/types/agent-settlement";

/**
 * The Chief of Staff conversation bridge.
 *
 * The Agent Platform is behind NAT and cannot be called, so a question asked
 * in the browser is queued (migration 188) and PULLED here, exactly as
 * decisions are. GET returns queued questions after a cursor; POST writes the
 * Chief's answer back.
 *
 * SAME AUTHORIZATION AS EVERY OTHER AGENT ROUTE: bearer `AGENT_INGEST_SECRET`,
 * with the company bound server-side from configuration. A caller cannot read
 * or answer another company's conversation even with a valid credential,
 * because the company is never taken from the request.
 *
 * THIS ROUTE EXECUTES NOTHING. It moves text. Whatever the Chief decides to
 * do in response still passes the platform's permission engine, approval
 * binding, publish gate and effect ledger — none of which live here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE_NAME = "agent-chief-messages";
const MAX_LIMIT = 25;

function guard(request: Request): NextResponse | null {
  if (!isAgentBridgeConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        route: ROUTE_NAME,
        error: `Agent bridge is not configured (missing: ${getMissingAgentBridgeEnvVars().join(", ")})`,
      },
      { status: 503 },
    );
  }
  if (!isAuthorizedAgentRequest(request)) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Unauthorized" },
      { status: 401 },
    );
  }
  return null;
}

export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const companyId = getAgentIngestCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "No ingest company configured" },
      { status: 503 },
    );
  }

  const params = new URL(request.url).searchParams;
  const afterRaw = Number.parseInt(params.get("after") ?? "0", 10);
  const after = Number.isFinite(afterRaw) && afterRaw > 0 ? afterRaw : 0;
  const limitRaw = Number.parseInt(params.get("limit") ?? "10", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
    : 10;

  // The company goes INTO the query, so the limit applies to this company's
  // rows rather than to a global page that another tenant's backlog can fill.
  const all = await listQueuedChiefQuestions({
    companyId,
    afterSeq: after,
    limit,
  });
  if (all === null) {
    // A read failure is a 503, never an empty work list. Reporting "no
    // questions" over a broken table is how the sequence-grant incident hid.
    return NextResponse.json(
      {
        ok: false,
        route: ROUTE_NAME,
        error: "The question queue could not be read.",
      },
      { status: 503 },
    );
  }
  // Belt and braces. The predicate above is what makes delivery fair; this
  // is a last assertion that nothing foreign can reach the wire, and it
  // shouts if the query layer ever regresses instead of silently leaking.
  const questions = all.filter((q) => q.companyId === companyId);
  if (questions.length !== all.length) {
    console.error("[agent-chief-messages] query returned foreign rows:", {
      returned: all.length,
      kept: questions.length,
    });
  }

  return NextResponse.json({
    ok: true,
    route: ROUTE_NAME,
    companyId,
    cursor: after,
    questions: questions.map((q) => ({
      seq: q.seq,
      id: q.id,
      conversationId: q.conversationId,
      body: q.body,
      askedByEmail: q.askedByEmail,
      createdAt: q.createdAt,
    })),
  });
}

type AnswerPayload = {
  questionId?: unknown;
  body?: unknown;
  requestKey?: unknown;
  error?: unknown;
};

export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const companyId = getAgentIngestCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "No ingest company configured" },
      { status: 503 },
    );
  }

  let payload: AnswerPayload;
  try {
    payload = (await request.json()) as AnswerPayload;
  } catch {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Body is not JSON" },
      { status: 400 },
    );
  }

  const questionId =
    typeof payload.questionId === "string" ? payload.questionId.trim() : "";
  if (!questionId) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "questionId is required" },
      { status: 400 },
    );
  }

  // A reported failure is recorded as a failure rather than as an answer, so
  // the UI can say the Chief could not respond instead of showing an error
  // string as if it were the Chief's words.
  if (typeof payload.error === "string" && payload.error.trim()) {
    const failed = await recordChiefFailure({
      questionId,
      companyId,
      errorDetail: payload.error.trim(),
    });
    if (failed.error) {
      return NextResponse.json(
        { ok: false, route: ROUTE_NAME, error: failed.error },
        { status: 400 },
      );
    }
    // `already_settled` here means the question reached a terminal state
    // before this failure arrived — a late callback for work that finished.
    // It is reported, not applied: the answer stands.
    const outcome = failed.outcome ?? "not_found";
    return NextResponse.json(
      {
        ok: isDelivered(outcome),
        route: ROUTE_NAME,
        questionId,
        outcome,
        error:
          outcome === "not_found"
            ? "No such question for this company."
            : null,
      },
      { status: settlementHttpStatus(outcome) },
    );
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "body is required" },
      { status: 400 },
    );
  }

  // Truncated rather than refused: an over-long answer is the model being
  // verbose, and losing it entirely serves nobody. Migration 188's CHECK is
  // 8000; this is the conversational limit and is the tighter of the two.
  const bounded = body.slice(0, CHIEF_MESSAGE_MAX * 4);

  // `payload.requestKey` is deliberately NOT read. The answer's identity is
  // derived from the question it answers (`chiefAnswerRequestKey`), so a
  // caller cannot present a key belonging to another row and have its answer
  // treated as an already-stored duplicate while the question settles anyway.
  const recorded = await recordChiefAnswer({
    questionId,
    companyId,
    body: bounded,
    nowIso: new Date().toISOString(),
  });

  if (recorded.error) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: recorded.error },
      { status: 400 },
    );
  }

  const outcome = recorded.outcome ?? "not_found";
  return NextResponse.json(
    {
      ok: isDelivered(outcome),
      route: ROUTE_NAME,
      questionId,
      outcome,
      error:
        outcome === "not_found" ? "No such question for this company." : null,
    },
    { status: settlementHttpStatus(outcome) },
  );
}
