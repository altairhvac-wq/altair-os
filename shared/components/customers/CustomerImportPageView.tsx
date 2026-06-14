"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  Users,
} from "lucide-react";
import { importCustomersFromCsvAction } from "@/app/actions/customers-import";
import type { ImportCustomersFromCsvActionResult } from "@/app/actions/customers-import";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  classifyCustomerImportRows,
  getCustomerImportFileSizeError,
  parseCustomerImportCsv,
  summarizeCustomerImportPreview,
  type CustomerImportContact,
  type CustomerImportPreviewRow,
  type CustomerImportRowInput,
} from "@/shared/lib/customer-import";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";

type CustomerImportPageViewProps = {
  existingContacts: CustomerImportContact[];
};

type ImportPhase = "upload" | "preview" | "result";

const STATUS_STYLES: Record<
  CustomerImportPreviewRow["status"],
  { label: string; className: string }
> = {
  ready: {
    label: "Ready",
    className: "bg-emerald-50 text-emerald-700",
  },
  duplicate: {
    label: "Duplicate",
    className: "bg-amber-50 text-amber-800",
  },
  error: {
    label: "Error",
    className: "bg-rose-50 text-rose-700",
  },
};

function formatContactPreview(row: CustomerImportPreviewRow): string {
  const parts = [row.phone, row.email].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function CustomerImportPageView({
  existingContacts,
}: CustomerImportPageViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ImportPhase>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<CustomerImportPreviewRow[]>([]);
  const [sourceRows, setSourceRows] = useState<CustomerImportRowInput[]>([]);
  const [importResult, setImportResult] =
    useState<ImportCustomersFromCsvActionResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, startImportTransition] = useTransition();

  const previewSummary = useMemo(
    () => summarizeCustomerImportPreview(previewRows),
    [previewRows],
  );

  function resetImportState() {
    setPhase("upload");
    setFileName(null);
    setParseError(null);
    setPreviewRows([]);
    setSourceRows([]);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setParseError(null);
    setImportError(null);
    setImportResult(null);
    setFileName(file.name);

    const sizeError = getCustomerImportFileSizeError(file.size);
    if (sizeError) {
      setParseError(sizeError);
      setPreviewRows([]);
      setSourceRows([]);
      setPhase("upload");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseCustomerImportCsv(text);

      if (parsed.error || !parsed.rows) {
        setParseError(parsed.error ?? "Could not read this CSV file.");
        setPreviewRows([]);
        setSourceRows([]);
        setPhase("upload");
        return;
      }

      const classified = classifyCustomerImportRows(
        parsed.rows,
        existingContacts,
      );
      setSourceRows(parsed.rows);
      setPreviewRows(classified);
      setPhase("preview");
    };

    reader.onerror = () => {
      setParseError("Could not read this file. Try again with a CSV export.");
      setPhase("upload");
    };

    reader.readAsText(file);
  }

  function handleConfirmImport() {
    if (isImporting || previewSummary.readyCount === 0) {
      return;
    }

    setImportError(null);

    startImportTransition(async () => {
      const result = await importCustomersFromCsvAction(sourceRows);

      if (result.error && result.importedRows.length === 0) {
        setImportError(
          formatActionError(
            result.error,
            "We couldn't import these customers. Try again.",
          ),
        );
        return;
      }

      setImportResult(result);
      setPhase("result");
    });
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 lg:gap-4 lg:h-[calc(100dvh-7rem)]">
      <header className="admin-page-header flex shrink-0 items-center justify-between gap-2 px-3 py-2 sm:px-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
              <Users className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Import Customers
              </h1>
              <p className="truncate text-xs text-slate-500">
                Upload a CSV to add customers to your company
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/customers"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-secondary px-3 py-1.5 text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to Customers</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </header>

      {parseError ? (
        <SettingsAlertBanner tone="error">{parseError}</SettingsAlertBanner>
      ) : null}

      {importError ? (
        <SettingsAlertBanner tone="error">{importError}</SettingsAlertBanner>
      ) : null}

      {phase === "upload" ? (
        <section className="admin-card flex flex-col gap-4 p-4 sm:p-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Step 1: Download the template
            </h2>
            <p className="text-sm text-slate-600">
              Use the required columns: name, phone, email, address, city, state,
              zip. Name is required, and each row needs a phone or email.
            </p>
            <a
              href="/templates/customer-import-template.csv"
              download="customer-import-template.csv"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl admin-btn-secondary px-3 py-1.5 text-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV template
            </a>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Step 2: Upload your CSV
            </h2>
            <p className="text-sm text-slate-600">
              Import up to 500 customers at a time. Duplicates and invalid rows are
              skipped automatically.
            </p>
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center transition-colors hover:border-cyan-300 hover:bg-cyan-50/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cyan-600 shadow-sm">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Tap to choose a CSV file
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  or drag and drop it here
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) =>
                  handleFileSelected(event.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>
        </section>
      ) : null}

      {phase === "preview" ? (
        <>
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total rows"
              value={previewSummary.totalRows}
              icon={FileSpreadsheet}
            />
            <SummaryCard
              label="Ready to import"
              value={previewSummary.readyCount}
              icon={CheckCircle2}
              tone="success"
            />
            <SummaryCard
              label="Duplicates"
              value={previewSummary.duplicateCount}
              icon={AlertCircle}
              tone="warning"
            />
            <SummaryCard
              label="Errors"
              value={previewSummary.errorCount}
              icon={AlertCircle}
              tone="danger"
            />
          </section>

          <section className="admin-card min-h-0 flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
                <p className="text-xs text-slate-500">
                  {fileName ? `File: ${fileName}` : "Uploaded CSV"}
                </p>
              </div>
              <button
                type="button"
                onClick={resetImportState}
                className="admin-btn-secondary text-xs"
              >
                Choose another file
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold sm:px-6">Row</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Customer</th>
                    <th className="hidden px-4 py-3 font-semibold md:table-cell sm:px-6">
                      Phone / Email
                    </th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row) => {
                    const statusMeta = STATUS_STYLES[row.status];
                    return (
                      <tr key={row.rowNumber} className="align-top">
                        <td className="px-4 py-3 text-slate-500 sm:px-6">
                          {row.rowNumber}
                        </td>
                        <td className="px-4 py-3 sm:px-6">
                          <div className="font-medium text-slate-900">
                            {row.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 md:hidden">
                            {formatContactPreview(row)}
                          </div>
                          {row.message ? (
                            <div className="mt-1 text-xs text-slate-500">
                              {row.message}
                            </div>
                          ) : null}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 md:table-cell sm:px-6">
                          {formatContactPreview(row)}
                        </td>
                        <td className="px-4 py-3 sm:px-6">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">
                Only valid, non-duplicate rows are imported. Existing customers
                are never updated.
              </p>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={previewSummary.readyCount === 0 || isImporting}
                className="admin-btn-primary inline-flex h-9 items-center justify-center px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting
                  ? "Importing..."
                  : `Import ${previewSummary.readyCount} customer${
                      previewSummary.readyCount === 1 ? "" : "s"
                    }`}
              </button>
            </div>
          </section>
        </>
      ) : null}

      {phase === "result" && importResult ? (
        <section className="admin-card space-y-4 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Import complete
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Imported {importResult.importedRows.length} customer
                {importResult.importedRows.length === 1 ? "" : "s"}, skipped{" "}
                {importResult.skippedRows.length} duplicate
                {importResult.skippedRows.length === 1 ? "" : "s"}, and flagged{" "}
                {importResult.errorRows.length} error
                {importResult.errorRows.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <ResultStat
              label="Imported"
              value={importResult.importedRows.length}
              tone="success"
            />
            <ResultStat
              label="Skipped duplicates"
              value={importResult.skippedRows.length}
              tone="warning"
            />
            <ResultStat
              label="Errors"
              value={importResult.errorRows.length}
              tone="danger"
            />
          </div>

          {importResult.skippedRows.length > 0 ||
          importResult.errorRows.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Skipped or invalid rows
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {[...importResult.skippedRows, ...importResult.errorRows].map(
                  (row) => (
                    <li key={`${row.rowNumber}-${row.customerName}`}>
                      Row {row.rowNumber}: {row.customerName}
                      {row.message ? ` — ${row.message}` : ""}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/customers"
              className="admin-btn-primary inline-flex h-9 items-center justify-center px-4 text-sm"
            >
              Back to Customers
            </Link>
            <button
              type="button"
              onClick={resetImportState}
              className="admin-btn-secondary inline-flex h-9 items-center justify-center px-4 text-sm"
            >
              Import another file
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    default: "text-slate-900",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
  }[tone];

  return (
    <div className="admin-card px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${toneClasses}`}>{value}</p>
    </div>
  );
}

function ResultStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger";
}) {
  const toneClasses = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
