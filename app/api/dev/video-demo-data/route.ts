import { NextResponse } from "next/server";
import {
  clearDemoDataAction,
  getDemoDataStatusAction,
  seedDemoDataAction,
} from "@/app/actions/demo-data";
import { getActiveCompanyContext } from "@/lib/database/company-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev-only endpoint for the Altair Demo Tool's "Prepare video data" button.
 *
 * Resets the signed-in owner's workspace to a pristine seed-pack state in
 * one shot: clear existing demo data (if any) → seed the current pack.
 * Pack v6 always includes a DRAFT invoice (INV-DEMO-3011), so the demo
 * video's "click Send" beat has fuel on every take — a recorded run
 * consumes the draft; this endpoint re-arms it.
 *
 * Security posture mirrors /api/dev/founder-screenshot-capture:
 *   - 404 outside NODE_ENV=development (never exists in production);
 *   - requires a signed-in session (the demo tool reuses the same
 *     Playwright storage state its captures authenticate with);
 *   - owner/admin enforcement comes from the demo-data actions themselves
 *     (assertDemoDataManagementAccess).
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const context = await getActiveCompanyContext();
  if (!context) {
    return NextResponse.json(
      { error: "Not signed in. Regenerate the demo tool's storage state." },
      { status: 401 },
    );
  }

  const companyId = context.company.id;

  const status = await getDemoDataStatusAction(companyId);
  if ("error" in status) {
    return NextResponse.json({ error: status.error }, { status: 403 });
  }

  let cleared = false;
  if (status.hasDemoData) {
    const clearResult = await clearDemoDataAction(companyId);
    if (clearResult.error) {
      return NextResponse.json(
        { error: `Clearing existing demo data failed: ${clearResult.error}` },
        { status: 500 },
      );
    }
    cleared = true;
  }

  const seedResult = await seedDemoDataAction(companyId);
  if (seedResult.error) {
    return NextResponse.json(
      { error: `Seeding failed: ${seedResult.error}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    company: context.company.name,
    cleared,
    seededAt: seedResult.seededAt ?? null,
    note: "Workspace reset to seed pack v6 — draft invoice INV-DEMO-3011 is armed for the send beat.",
  });
}
