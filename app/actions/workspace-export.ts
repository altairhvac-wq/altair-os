"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { streamWorkspaceExport } from "@/lib/database/services/export/workspace-export";
import { recordSecurityAuditEvent } from "@/lib/security/audit";
import { resolveRequestAddress } from "@/lib/security/public-rate-limit";

export type WorkspaceExportActionResult = {
  error?: string;
  /** NDJSON: one `{ table, row }` object per line. */
  ndjson?: string;
  summary?: {
    companyId: string;
    generatedAt: string;
    totalRows: number;
    tables: { table: string; rowCount: number }[];
  };
};

/**
 * Exports the active company's business records.
 *
 * ============================== ONE COMPANY, RESOLVED SERVER-SIDE ==============================
 * The company is taken from the active context, never from an argument. An
 * action that accepted a company id would be a cross-tenant read waiting for
 * someone to call it with a different one — the permission check would pass
 * for the caller's own company while the export came from another.
 *
 * ============================== WHO ==============================
 * manageCompany. An export is every customer record, every invoice and every
 * signature in one file; it is an owner-and-admin action, not a
 * "anyone who can see the data" action, because seeing it inside the product
 * and carrying it out of the building are different things.
 *
 * ============================== WHAT IT LEAVES BEHIND ==============================
 * An audit event. An export is the single largest disclosure the product can
 * perform, and it should not be the one thing nobody can reconstruct later.
 *
 * ============================== SIZE ==============================
 * NDJSON, assembled from a streaming read. A server action must return one
 * value, so the string is built here — but the read underneath is paged, and a
 * tenant large enough for this to matter should be moved to a background job
 * writing to storage. The row count in the summary is what tells an operator
 * when that point has arrived; see the note in the handoff.
 */
export async function exportWorkspaceAction(): Promise<WorkspaceExportActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageCompany) {
    return {
      error: "Only an owner or admin can export the workspace.",
    };
  }

  const companyId = context.company.id;
  const lines: string[] = [];

  try {
    const summary = await streamWorkspaceExport(companyId, (chunk) => {
      for (const row of chunk.rows) {
        lines.push(JSON.stringify({ table: chunk.table, row }));
      }
    });

    await recordSecurityAuditEvent({
      event: "workspace_export.completed",
      outcome: "succeeded",
      userId: context.user.id,
      companyId,
      address: await resolveRequestAddress(),
      metadata: { rowCount: summary.totalRows, tables: summary.tables.length },
    });

    return { ndjson: lines.join("\n"), summary };
  } catch (error) {
    console.error("[exportWorkspaceAction] failed:", {
      companyId,
      error: error instanceof Error ? error.message : "unknown",
    });

    await recordSecurityAuditEvent({
      event: "workspace_export.failed",
      outcome: "failed",
      userId: context.user.id,
      companyId,
      address: await resolveRequestAddress(),
      reason: "export_failed",
    });

    return { error: "Could not build the export. Please try again." };
  }
}
