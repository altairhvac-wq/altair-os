"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { exportWorkspaceAction } from "@/app/actions/workspace-export";
import { Button } from "@/shared/design-system/components/Button";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

/**
 * "Export your data" on Settings > Company.
 *
 * ============ WHY THIS EXISTS ============
 * `exportWorkspaceAction` could already build a complete, tenant-scoped copy
 * of a company's records, but no screen called it, so the only way out was to
 * email and ask. The public site answers "Can I get my data out if I leave?",
 * and the privacy policy says a customer can export before cancelling; this
 * is the button that makes both true.
 *
 * ============ WHAT THIS COMPONENT DOES NOT DECIDE ============
 * Who may export, which tables and columns are included, and the audit event
 * are all the server action's job (owner or admin only; credentials and
 * platform-internal tables are never in the file). This component only asks
 * for the export and hands the browser the file. Showing the card is not
 * authorization: a person without the permission gets the action's refusal,
 * shown below the button.
 *
 * The file is built in memory and saved with a temporary object URL, so it
 * never touches storage and there is no link to leak.
 */

type ExportDone = { fileName: string; totalRows: number; tableCount: number };

/** A safe file-name stem from the company name: letters, digits and dashes. */
function fileNameStem(companyName: string): string {
  const stem = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return stem || "workspace";
}

export function WorkspaceExportCard({ companyName }: { companyName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ExportDone | null>(null);

  function handleExport() {
    setError(null);
    setDone(null);

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof exportWorkspaceAction>>;
      try {
        result = await exportWorkspaceAction();
      } catch {
        setError("Could not build the export. Check your connection and try again.");
        return;
      }

      if (result.error || result.ndjson === undefined || !result.summary) {
        setError(result.error ?? "Could not build the export. Please try again.");
        return;
      }

      const day = result.summary.generatedAt.slice(0, 10);
      const fileName = `altair-export-${fileNameStem(companyName)}-${day}.ndjson`;
      const url = URL.createObjectURL(
        new Blob([result.ndjson], { type: "application/x-ndjson" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Give the browser a moment to start the save before the URL is released.
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setDone({
        fileName,
        totalRows: result.summary.totalRows,
        tableCount: result.summary.tables.filter((table) => table.rowCount > 0).length,
      });
    });
  }

  return (
    <div className="min-w-0">
      <p className="text-sm leading-6 text-altair-ink-secondary">
        Download every record in this workspace as one file: customers, jobs,
        estimates, invoices, payments, time entries, expenses and the rest.
        Passwords, connection keys and other credentials are never included.
      </p>
      <p className="mt-2 text-xs leading-5 text-altair-ink-muted">
        The file is in JSON Lines format (.ndjson): one record per line, each
        with the name of the list it came from. It opens in any text editor,
        and another system or a developer can import it. Owners and admins can
        export, and each export is recorded in the security log.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleExport}
          loading={isPending}
          leadingIcon={<Download className="h-4 w-4" />}
        >
          {isPending ? "Building the export…" : "Export all data"}
        </Button>
        {isPending ? (
          <span className="text-xs text-altair-ink-muted" aria-live="polite">
            This can take a minute for a large workspace. Keep this page open.
          </span>
        ) : null}
      </div>

      {error ? (
        <SettingsAlertBanner tone="error" className="mt-3">
          {error}
        </SettingsAlertBanner>
      ) : null}
      {done ? (
        <SettingsAlertBanner tone="success" className="mt-3">
          Saved {done.totalRows.toLocaleString("en-US")}{" "}
          {done.totalRows === 1 ? "record" : "records"} from {done.tableCount}{" "}
          {done.tableCount === 1 ? "list" : "lists"} to{" "}
          <span className="font-semibold">{done.fileName}</span>. Check your
          downloads folder.
        </SettingsAlertBanner>
      ) : null}
    </div>
  );
}
