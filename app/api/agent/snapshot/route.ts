import { NextResponse } from "next/server";
import {
  getAgentIngestCompanyId,
  getAgentPlatformCompanyId,
  getMissingAgentBridgeEnvVars,
  isAgentBridgeConfigured,
  isAuthorizedAgentRequest,
} from "@/lib/agent-bridge/env";
import { storeAgentMarketingSnapshot } from "@/lib/database/queries/agent-snapshots";
import {
  AGENT_SNAPSHOT_CONTRACT_VERSION,
  parseAgentMarketingSnapshot,
} from "@/shared/types/agent-snapshot";
import {
  createRequestId,
  requestIdFromHeaders,
  runOperation,
} from "@/lib/operations";

/**
 * Marketing snapshot ingest — the ONE inbound surface the Agent Platform uses.
 *
 * WHY IT EXISTS. The platform is laptop-side behind NAT, so this deployment
 * can never call it. Every message is platform-initiated, and this is where
 * its outbound push lands.
 *
 * AUTHORIZATION. A shared bearer secret (`AGENT_INGEST_SECRET`), compared
 * without early byte-wise exit, exactly as the cron routes compare
 * `CRON_SECRET`. This route is public at the middleware layer by design —
 * like every cron and webhook route here — and enforces its own credential.
 * 503 when unconfigured, 401 when the credential is wrong. Neither response
 * reveals whether the payload would have been valid.
 *
 * COMPANY BINDING IS SERVER-SIDE. The target company uuid comes from
 * configuration, never from the payload. The payload's own `companyId` is the
 * platform's slug and is merely CHECKED against the configured mapping; a
 * mismatch is a 403. A caller therefore cannot choose which company it writes
 * to even with a valid credential.
 *
 * VALIDATION BEFORE STORAGE. The body is size-capped, JSON-parsed, and run
 * through the mirrored contract parser. A wrong `contractVersion` is a 400,
 * not a partial ingest.
 *
 * IDEMPOTENT. Storage is an upsert keyed by company, and a `producedAt` no
 * newer than the stored one returns 200 with `superseded: true` rather than
 * rewriting. Re-delivery is a no-op; the pusher treats it as success.
 *
 * THIS ROUTE PUBLISHES NOTHING. It stores a read model. It cannot cause a
 * post, a spend, or any external effect.
 */

export const runtime = "nodejs";

const ROUTE_NAME = "agent-snapshot";
const OPERATION_NAME = "agent.snapshot.ingest";
/** Mirrors the pusher's own MAX_SNAPSHOT_BYTES. */
const MAX_BODY_BYTES = 2_000_000;

export async function POST(request: Request) {
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

  const requestId = requestIdFromHeaders(request.headers) ?? createRequestId();

  const opResult = await runOperation({
    operationName: OPERATION_NAME,
    context: { requestId, route: "/api/agent/snapshot" },
    throwOnFailure: false,
    callback: async () => {
      const rawBody = await request.text();
      if (rawBody.length > MAX_BODY_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            route: ROUTE_NAME,
            error: `Payload exceeds ${MAX_BODY_BYTES} bytes`,
          },
          { status: 413 },
        );
      }

      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { ok: false, route: ROUTE_NAME, error: "Body is not valid JSON" },
          { status: 400 },
        );
      }

      const parsed = parseAgentMarketingSnapshot(json);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            ok: false,
            route: ROUTE_NAME,
            error: parsed.error,
            expectedContractVersion: AGENT_SNAPSHOT_CONTRACT_VERSION,
          },
          { status: 400 },
        );
      }

      const expectedPlatformCompany = getAgentPlatformCompanyId();
      if (parsed.snapshot.companyId !== expectedPlatformCompany) {
        // A valid credential does not authorize writing an arbitrary company.
        return NextResponse.json(
          {
            ok: false,
            route: ROUTE_NAME,
            error: "Snapshot company does not match the configured mapping",
          },
          { status: 403 },
        );
      }

      const companyId = getAgentIngestCompanyId();
      if (!companyId) {
        return NextResponse.json(
          { ok: false, route: ROUTE_NAME, error: "Agent bridge is not configured" },
          { status: 503 },
        );
      }

      const result = await storeAgentMarketingSnapshot({
        companyId,
        platformCompanyId: parsed.snapshot.companyId,
        snapshot: parsed.snapshot,
        droppedItems: parsed.droppedItems,
        payloadBytes: rawBody.length,
      });

      if (result.stored) {
        return NextResponse.json({
          ok: true,
          route: ROUTE_NAME,
          superseded: false,
          producedAt: parsed.snapshot.producedAt,
          droppedItems: parsed.droppedItems,
        });
      }

      if (result.superseded) {
        // A success for the caller: this deployment already holds state at
        // least as new. Re-delivery must never look like a failure.
        return NextResponse.json({
          ok: true,
          route: ROUTE_NAME,
          superseded: true,
          producedAt: result.storedProducedAt,
        });
      }

      return NextResponse.json(
        { ok: false, route: ROUTE_NAME, error: result.error },
        { status: 500 },
      );
    },
  });

  if (!opResult.success || !opResult.value) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Snapshot ingest failed" },
      { status: 500 },
    );
  }

  return opResult.value;
}
