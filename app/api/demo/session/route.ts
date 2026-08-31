/**
 * GET /api/demo/session
 *
 * Dev-only endpoint used by the Altair Demo Tool to ask "is my saved
 * Playwright storage state still a signed-in session?" BEFORE spending a
 * capture run on it. A saved state's Supabase refresh token rotates, so a
 * days-old file looks healthy on disk and silently films the signed-out
 * marketing page — a failure class the demo tool can only diagnose after a
 * 12-second navigation today (see its scripts/session-state.mjs, which
 * concedes "only Altair can answer this").
 *
 * The route answers with the session's VALIDITY only, never its contents:
 * no user id, no email, no token. Sent cookies are evaluated exactly as any
 * app request would evaluate them. Security posture mirrors
 * ../fingerprint/route.ts: 404 outside development.
 *
 * Part of the capture contract (shared/capture/capture-manifest.json).
 */

import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getOptionalUser();
  return NextResponse.json({ signedIn: user !== null });
}
