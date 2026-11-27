"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Upload } from "lucide-react";
import { importUnpaidInvoicesAction, type ImportInvoicesResultRow } from "@/app/actions/invoices-import";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  buildInvoiceImportCustomerIndex,
  buildInvoiceImportPreview,
  describeInvoiceMappingGaps,
  INVOICE_IMPORT_BATCH_ROWS,
  INVOICE_IMPORT_FIELDS,
  INVOICE_IMPORT_FIELD_LABELS,
  INVOICE_IMPORT_PRESET_OPTIONS,
  INVOICE_IMPORT_PREVIEW_ROW_LIMIT,
  INVOICE_IMPORT_UPLOAD_MAX_BYTES,
  parseInvoiceCsv,
  suggestInvoiceImportMapping,
  type InvoiceImportCustomer,
  type InvoiceImportField,
  type InvoiceImportMapping,
  type InvoiceImportPreset,
  type InvoiceImportPreviewRow,
  type InvoiceImportRow,
} from "@/shared/lib/invoice-import";
import { readSpreadsheetFileAsCsv, SPREADSHEET_FILE_ACCEPT } from "@/shared/lib/spreadsheet-file";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  masterPanelHeaderClass,
  masterSecondaryActionClass,
} from "@/shared/design-system/shell";
import { AdminPendingLabel } from "@/shared/design-system/components";
import { adminFormInputClass } from "@/shared/lib/admin-density";

type Phase = "upload" | "mapping" | "preview" | "result";

const STEPS: { id: Exclude<Phase, "result">; label: string }[] = [
  { id: "upload", label: "Upload File" },
  { id: "mapping", label: "Match Columns" },
  { id: "preview", label: "Review Preview" },
];

const STATUS: Record<InvoiceImportPreviewRow["status"], { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-emerald-50 text-emerald-700" },
  skipped: { label: "Skipped", className: "bg-slate-100 text-slate-700" },
  error: { label: "Needs attention", className: "bg-rose-50 text-rose-700" },
};

const RESULT_LIST_LIMIT = 200;

type ImportResult = {
  importedCount: number;
  importedTotal: number;
  skippedRows: ImportInvoicesResultRow[];
  errorRows: ImportInvoicesResultRow[];
  error?: string;
};

function money(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function InvoiceImportPageView({
  customers,
  alreadyImported,
  initialPreset,
}: {
  customers: InvoiceImportCustomer[];
  alreadyImported: string[];
  initialPreset?: InvoiceImportPreset;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [preset, setPreset] = useState<InvoiceImportPreset>(initialPreset ?? "other");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<InvoiceImportMapping>(suggestInvoiceImportMapping([]));
  const [previewRows, setPreviewRows] = useState<InvoiceImportPreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [isImporting, startImport] = useTransition();
  const [importedHere, setImportedHere] = useState<string[]>([]);

  const customerIndex = useMemo(() => buildInvoiceImportCustomerIndex(customers), [customers]);
  const warnings = useMemo(() => describeInvoiceMappingGaps(mapping), [mapping]);
  const unmapped = useMemo(() => {
    const used = new Set(Object.values(mapping).filter(Boolean));
    return headers.filter((header) => header && !used.has(header));
  }, [headers, mapping]);
  const summary = useMemo(() => {
    const ready = previewRows.filter((row) => row.status === "ready");
    return {
      total: previewRows.length,
      ready: ready.length,
      readyAmount: ready.reduce((sum, row) => sum + (row.row?.amountOwed ?? 0), 0),
      skipped: previewRows.filter((row) => row.status === "skipped").length,
      error: previewRows.filter((row) => row.status === "error").length,
    };
  }, [previewRows]);
  const sortedPreview = useMemo(() => {
    // Rows that need attention first, so they are seen before the import.
    const order = { error: 0, ready: 1, skipped: 2 } as const;
    return [...previewRows].sort((a, b) => order[a.status] - order[b.status] || a.rowNumber - b.rowNumber);
  }, [previewRows]);

  function reset() {
    setPhase("upload");
    setFileName(null);
    setHeaders([]);
    setRecords([]);
    setPreviewRows([]);
    setError(null);
    setResult(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);
    if (file.size > INVOICE_IMPORT_UPLOAD_MAX_BYTES) {
      setError("This file is larger than 20 MB. Export only unpaid invoices, or fewer columns, and try again.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    void readSpreadsheetFileAsCsv(file).then((read) => {
      const parsed = read.error !== undefined ? { error: read.error } : parseInvoiceCsv(read.text);
      if (parsed.error || !("headers" in parsed) || !parsed.headers || !parsed.records) {
        setError(parsed.error ?? "Could not read this file.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setHeaders(parsed.headers);
      setRecords(parsed.records);
      setMapping(suggestInvoiceImportMapping(parsed.headers, preset));
      setPhase("mapping");
    });
  }

  function handlePresetChange(next: InvoiceImportPreset) {
    setPreset(next);
    if (headers.length > 0) setMapping(suggestInvoiceImportMapping(headers, next));
  }

  function handleContinue() {
    setPreviewRows(
      buildInvoiceImportPreview(headers, records, mapping, customerIndex, [...alreadyImported, ...importedHere]),
    );
    setPhase("preview");
  }

  function handleImport() {
    const ready = previewRows.map((row) => row.row).filter((row): row is InvoiceImportRow => Boolean(row));
    if (isImporting || ready.length === 0) return;
    setError(null);

    startImport(async () => {
      const combined: ImportResult = { importedCount: 0, importedTotal: 0, skippedRows: [], errorRows: [] };
      let done = 0;
      let stoppedWith: string | null = null;
      setProgress({ done, total: ready.length });

      for (let start = 0; start < ready.length; start += INVOICE_IMPORT_BATCH_ROWS) {
        const batch = ready.slice(start, start + INVOICE_IMPORT_BATCH_ROWS);
        try {
          const response = await importUnpaidInvoicesAction(batch);
          combined.importedCount += response.importedCount;
          combined.importedTotal += response.importedTotal;
          combined.skippedRows.push(...response.skippedRows);
          combined.errorRows.push(...response.errorRows);
          if (response.error) {
            stoppedWith = response.error;
            break;
          }
        } catch {
          stoppedWith = "The connection dropped during the import.";
          break;
        }
        done += batch.length;
        setProgress({ done, total: ready.length });
      }
      setProgress(null);

      if (stoppedWith && combined.importedCount === 0) {
        setError(formatActionError(stoppedWith, "We couldn't import these invoices. Try again."));
        return;
      }

      for (const row of previewRows) {
        if (row.status === "ready") continue;
        (row.status === "error" ? combined.errorRows : combined.skippedRows).push({
          rowNumber: row.rowNumber,
          label: row.oldNumber === "—" ? "(no number)" : `#${row.oldNumber}`,
          message: row.message ?? "",
        });
      }
      combined.errorRows.sort((a, b) => a.rowNumber - b.rowNumber);
      combined.skippedRows.sort((a, b) => a.rowNumber - b.rowNumber);
      if (stoppedWith) {
        combined.error = `${formatActionError(stoppedWith, "The import stopped.")} ${done} of ${ready.length} invoices were sent. Import the same file again to bring in the rest; invoices already brought over are skipped.`;
      }
      setImportedHere((current) => [...current, ...ready.slice(0, done).map((row) => row.oldNumber)]);
      setResult(combined);
      setPhase("result");
    });
  }

  const stepIndex = STEPS.findIndex((step) => step.id === phase);

  return (
    <MasterShellPage fillViewport density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact" scrollable>
          <MasterPageHeader
            title="Import Unpaid Invoices"
            subtitle="Balances still owed from your previous system, as draft invoices"
            density="compact"
            secondaryAction={
              <Link href="/invoices" className={masterSecondaryActionClass}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to Invoices</span>
                <span className="sm:hidden">Back</span>
              </Link>
            }
          />

          {phase !== "result" ? (
            <MasterPageSurface variant="card" className="grid gap-2 p-3 sm:grid-cols-3 sm:p-4">
              <nav aria-label="Import steps" className="contents">
                {STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`rounded-xl border px-3 py-2 ${
                      step.id === phase
                        ? "border-cyan-200 bg-cyan-50/70"
                        : index < stepIndex
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                    <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                  </div>
                ))}
              </nav>
            </MasterPageSurface>
          ) : null}

          {error ? <SettingsAlertBanner tone="error">{error}</SettingsAlertBanner> : null}

          {phase === "upload" ? (
            <MasterPageSurface variant="card" className="flex flex-col gap-5 p-4 sm:p-6">
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4">
                <p className="text-sm font-semibold text-slate-900">What this does</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>Each invoice with money still owed becomes a <strong>draft</strong> invoice for that amount. Nothing is sent until you send it.</li>
                  <li>Customers are matched by email, then phone, then name. Import your customers first.</li>
                  <li>Paid, void and zero-balance invoices are skipped. An invoice already brought over is never brought over twice.</li>
                </ul>
                {customers.length === 0 ? (
                  <p className="mt-3 text-sm font-medium text-amber-800">
                    You have no customers yet.{" "}
                    <Link href="/customers/import" className="underline underline-offset-2">
                      Import your customers first
                    </Link>
                    .
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">Where is the invoice list from?</h2>
                <select
                  value={preset}
                  onChange={(event) => handlePresetChange(event.target.value as InvoiceImportPreset)}
                  className={`${adminFormInputClass} h-11 w-full max-w-md text-base sm:h-10 sm:text-sm`}
                >
                  {INVOICE_IMPORT_PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-900">Upload your file</h2>
                <p className="text-sm text-slate-600">
                  A CSV or Excel invoice list. The export menus for each app are at{" "}
                  <a
                    href="https://www.altair-op.com/switch"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-cyan-700 underline-offset-2 hover:underline"
                  >
                    altair-op.com/switch
                  </a>
                  .
                </p>
                <label
                  className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center transition-colors hover:border-cyan-300 hover:bg-cyan-50/40"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0] ?? null);
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cyan-600 shadow-sm">
                    <Upload className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Tap to choose a CSV or Excel file</p>
                    <p className="mt-1 text-xs text-slate-500">or drag and drop it here</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={SPREADSHEET_FILE_ACCEPT}
                    className="sr-only"
                    onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </MasterPageSurface>
          ) : null}

          {phase === "mapping" ? (
            <MasterPageSurface variant="card" className="flex flex-col gap-4 p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Match your columns</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {fileName ?? "Uploaded file"} · {records.length.toLocaleString("en-US")} row
                    {records.length === 1 ? "" : "s"} · {headers.length} columns
                  </p>
                </div>
                <button type="button" onClick={reset} className="admin-btn-secondary text-xs">
                  Choose another file
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {INVOICE_IMPORT_FIELDS.map((field) => (
                  <div key={field} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <label htmlFor={`inv-map-${field}`} className="block text-sm font-semibold text-slate-900">
                      {INVOICE_IMPORT_FIELD_LABELS[field]}
                    </label>
                    <select
                      id={`inv-map-${field}`}
                      value={mapping[field] ?? ""}
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [field as InvoiceImportField]: event.target.value || null,
                        }))
                      }
                      className={`${adminFormInputClass} mt-2 h-11 w-full text-base sm:h-10 sm:text-sm`}
                    >
                      <option value="">Don&apos;t use</option>
                      {headers.map((header) => (
                        <option key={`${field}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {warnings.length > 0 || unmapped.length > 0 ? (
                <div
                  role="status"
                  className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900"
                >
                  {warnings.map((warning) => (
                    <p key={warning} className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{warning}</span>
                    </p>
                  ))}
                  {unmapped.length > 0 ? (
                    <p className="text-amber-800">
                      Not used: <span className="font-medium">{unmapped.join(", ")}</span>.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setPhase("upload")}
                  className="admin-btn-secondary inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!mapping.invoice_number || (!mapping.balance_due && !mapping.total)}
                  className="admin-btn-primary inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm disabled:cursor-not-allowed"
                >
                  Continue to preview
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </MasterPageSurface>
          ) : null}

          {phase === "preview" ? (
            <>
              <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <Stat label="Ready" value={summary.ready.toLocaleString("en-US")} tone="text-emerald-700" />
                <Stat label="Still owed" value={money(summary.readyAmount)} tone="text-emerald-700" />
                <Stat label="Skipped" value={summary.skipped.toLocaleString("en-US")} />
                <Stat label="Needs attention" value={summary.error.toLocaleString("en-US")} tone="text-rose-700" />
              </section>

              <MasterPageSurface variant="panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className={`${masterPanelHeaderClass} flex flex-wrap items-center justify-between gap-2`}>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Review preview</h2>
                    <p className="text-xs text-slate-500">
                      {previewRows.length > INVOICE_IMPORT_PREVIEW_ROW_LIMIT
                        ? `Showing ${INVOICE_IMPORT_PREVIEW_ROW_LIMIT} of ${previewRows.length.toLocaleString("en-US")} rows, the ones that need attention first`
                        : `${previewRows.length} row${previewRows.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => setPhase("mapping")} className="admin-btn-secondary text-xs">
                    Edit column matching
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold sm:px-6">Invoice</th>
                        <th className="px-4 py-3 font-semibold sm:px-6">Customer</th>
                        <th className="px-4 py-3 text-right font-semibold sm:px-6">Owed</th>
                        <th className="hidden px-4 py-3 font-semibold md:table-cell sm:px-6">Due</th>
                        <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedPreview.slice(0, INVOICE_IMPORT_PREVIEW_ROW_LIMIT).map((row) => (
                        <tr key={row.rowNumber} className="align-top">
                          <td className="px-4 py-3 sm:px-6">
                            <div className="font-medium text-slate-900">#{row.oldNumber}</div>
                            <div className="text-xs text-slate-500">Row {row.rowNumber}</div>
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            <div className="text-slate-900">{row.customerLabel}</div>
                            {row.message ? <div className="mt-1 text-xs text-slate-500">{row.message}</div> : null}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">{row.owedText || "—"}</td>
                          <td className="hidden px-4 py-3 text-slate-600 md:table-cell sm:px-6">{row.dueText || "—"}</td>
                          <td className="px-4 py-3 sm:px-6">
                            <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[row.status].className}`}>
                              {STATUS[row.status].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-xs text-slate-500">Ready rows become draft invoices. Nothing is emailed.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setPhase("mapping")}
                      className="admin-btn-secondary inline-flex h-9 items-center justify-center px-4 text-sm"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={summary.ready === 0 || isImporting}
                      className="admin-btn-primary inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm disabled:cursor-not-allowed"
                    >
                      <AdminPendingLabel
                        pending={isImporting}
                        pendingLabel={
                          progress && progress.total > 0
                            ? `Importing… ${Math.round((progress.done / progress.total) * 100)}%`
                            : "Importing…"
                        }
                        idleLabel={`Create ${summary.ready.toLocaleString("en-US")} draft invoice${summary.ready === 1 ? "" : "s"}`}
                      />
                    </button>
                  </div>
                </div>
              </MasterPageSurface>
            </>
          ) : null}

          {phase === "result" && result ? (
            <MasterPageSurface variant="card" className="space-y-4 p-4 sm:p-6">
              {result.error ? <SettingsAlertBanner tone="error">{result.error}</SettingsAlertBanner> : null}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {result.importedCount.toLocaleString("en-US")} draft invoice{result.importedCount === 1 ? "" : "s"} created,{" "}
                    {money(result.importedTotal)} to collect
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Open each one, check it, and send it with its payment link. {result.skippedRows.length} skipped,{" "}
                    {result.errorRows.length} need attention.
                  </p>
                </div>
              </div>

              {result.skippedRows.length + result.errorRows.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Not brought over</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    {[...result.errorRows, ...result.skippedRows].slice(0, RESULT_LIST_LIMIT).map((row) => (
                      <li key={`${row.rowNumber}-${row.label}`}>
                        Row {row.rowNumber}, invoice {row.label}
                        {row.message ? ` · ${row.message}` : ""}
                      </li>
                    ))}
                  </ul>
                  {result.skippedRows.length + result.errorRows.length > RESULT_LIST_LIMIT ? (
                    <p className="mt-2 text-xs text-slate-500">
                      and {(result.skippedRows.length + result.errorRows.length - RESULT_LIST_LIMIT).toLocaleString("en-US")} more.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/invoices" className="admin-btn-primary inline-flex h-9 items-center justify-center px-4 text-sm">
                  Open invoices
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="admin-btn-secondary inline-flex h-9 items-center justify-center px-4 text-sm"
                >
                  Import another file
                </button>
              </div>
            </MasterPageSurface>
          ) : null}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return (
    <MasterPageSurface variant="card" className="px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    </MasterPageSurface>
  );
}
