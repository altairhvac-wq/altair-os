/**
 * GET /api/demo/fingerprint
 *
 * Dev-only endpoint used by the Altair Demo Tool's preflight guard to verify
 * it is pointed at the correct local demo environment before any browser
 * automation runs.
 *
 * This route is intentionally unauthenticated — the demo tool fetches it
 * before it has any user session. Security is by NODE_ENV: the route returns
 * 404 in production and staging. No sensitive data is exposed.
 *
 * The fingerprint value is configured via DEMO_TOOL_FINGERPRINT in .env.local
 * and must match ALTAIR_DEMO_FINGERPRINT in the demo tool's .env file.
 * Both default to "altair-demo-local-v1" when the env var is absent.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINGERPRINT =
  process.env.DEMO_TOOL_FINGERPRINT?.trim() || "altair-demo-local-v1";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ fingerprint: FINGERPRINT });
}
