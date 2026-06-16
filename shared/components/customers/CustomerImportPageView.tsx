"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { importCustomersFromMappedCsvAction } from "@/app/actions/customers-import";
import type { ImportCustomersFromCsvActionResult } from "@/app/actions/customers-import";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  classifyCustomerImportRows,
  CUSTOMER_IMPORT_ALTAIR_FIELDS,
  CUSTOMER_IMPORT_FIELD_LABELS,
  CUSTOMER_IMPORT_PREVIEW_ROW_LIMIT,
  CUSTOMER_IMPORT_PRESET_OPTIONS,
  getCustomerImportFileSizeError,
  mapCustomerImportCsvWithMapping,
  parseCustomerImportCsvRaw,
  suggestCustomerImportFieldMapping,
  summarizeCustomerImportPreview,
  type CustomerImportContact,
  type CustomerImportFieldMapping,
  type CustomerImportPreset,
  type CustomerImportPreviewRow,
} from "@/shared/lib/customer-import";
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

type CustomerImportPageViewProps = {
  existingContacts: CustomerImportContact[];
};

type ImportPhase = "upload" | "mapping" | "preview" | "result";

const IMPORT_STEPS: { id: ImportPhase; label: string }[] = [
  { id: "upload", label: "Upload CSV" },
  { id: "mapping", label: "Match Columns" },
  { id: "preview", label: "Review Preview" },
  { id: "result", label: "Import Results" },
];

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

function formatAddressPreview(row: CustomerImportPreviewRow): string {
  const parts = [row.address, row.city, row.state, row.zip].filter(Boolean);
  return parts.join(", ") || "—";
}

function formatContactPreview(row: CustomerImportPreviewRow): string {
  const parts = [row.phone, row.email].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function CustomerImportPageView({
  existingContacts,
}: CustomerImportPageViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ImportPhase>("upload");
  const [preset, setPreset] = useState<CustomerImportPreset>("other");
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<CustomerImportFieldMapping>(
    suggestCustomerImportFieldMapping([]),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<CustomerImportPreviewRow[]>([]);
  const [importResult, setImportResult] =
    useState<ImportCustomersFromCsvActionResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, startImportTransition] = useTransition();

  const previewSummary = useMemo(
    () => summarizeCustomerImportPreview(previewRows),
    [previewRows],
  );

  const previewRowsForDisplay = useMemo(
    () => previewRows.slice(0, CUSTOMER_IMPORT_PREVIEW_ROW_LIMIT),
    [previewRows],
  );

  const hasHiddenPreviewRows =
    previewRows.length > CUSTOMER_IMPORT_PREVIEW_ROW_LIMIT;

  function resetImportState() {
    setPhase("upload");
    setFileName(null);
    setCsvText("");
    setCsvHeaders([]);
    setFieldMapping(suggestCustomerImportFieldMapping([]));
    setParseError(null);
    setPreviewRows([]);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function applyMappingAndPreview(
    text: string,
    headers: string[],
    mapping: CustomerImportFieldMapping,
  ) {
    const mapped = mapCustomerImportCsvWithMapping(text, mapping);

    if (mapped.error || !mapped.rows) {
      setParseError(mapped.error ?? "Could not map customer rows.");
      setPreviewRows([]);
      return false;
    }

    const classified = classifyCustomerImportRows(mapped.rows, existingContacts);
    setPreviewRows(classified);
    setParseError(null);
    return true;
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    handleFileSelected(event.dataTransfer.files?.[0] ?? null);
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
      setCsvText("");
      setCsvHeaders([]);
      setPreviewRows([]);
      setPhase("upload");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseCustomerImportCsvRaw(text);

      if (parsed.error || !parsed.parsed) {
        setParseError(parsed.error ?? "Could not read this CSV file.");
        setCsvText("");
        setCsvHeaders([]);
        setPreviewRows([]);
        setPhase("upload");
        return;
      }

      const suggestedMapping = suggestCustomerImportFieldMapping(
        parsed.parsed.headers,
        preset,
      );

      setCsvText(text);
      setCsvHeaders(parsed.parsed.headers);
      setFieldMapping(suggestedMapping);
      setPhase("mapping");
    };

    reader.onerror = () => {
      setParseError("Could not read this file. Try again with a CSV export.");
      setPhase("upload");
    };

    reader.readAsText(file);
  }

  function handlePresetChange(nextPreset: CustomerImportPreset) {
    setPreset(nextPreset);
    if (csvHeaders.length > 0) {
      setFieldMapping(suggestCustomerImportFieldMapping(csvHeaders, nextPreset));
    }
  }

  function handleMappingFieldChange(
    field: (typeof CUSTOMER_IMPORT_ALTAIR_FIELDS)[number],
    header: string | null,
  ) {
    setFieldMapping((current) => ({
      ...current,
      [field]: header,
    }));
  }

  function handleContinueToPreview() {
    const success = applyMappingAndPreview(csvText, csvHeaders, fieldMapping);
    if (success) {
      setPhase("preview");
    }
  }

  function handleConfirmImport() {
    if (isImporting || previewSummary.readyCount === 0) {
      return;
    }

    setImportError(null);

    startImportTransition(async () => {
      const result = await importCustomersFromMappedCsvAction(
        csvText,
        fieldMapping,
      );

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

  const currentStepIndex = IMPORT_STEPS.findIndex((step) => step.id === phase);

  return (
    <MasterShellPage fillViewport density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact" scrollable>
          <MasterPageHeader
            title="Import Customers"
            subtitle="Smart CSV import for spreadsheets and field-service exports"
            density="compact"
            secondaryAction={
              <Link
                href="/customers"
                className={masterSecondaryActionClass}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to Customers</span>
                <span className="sm:hidden">Back</span>
              </Link>
            }
          />

          {phase !== "result" ? (
            <MasterPageSurface
              variant="card"
              className="grid gap-2 p-3 sm:grid-cols-4 sm:p-4"
            >
              <nav aria-label="Import steps" className="contents">
                {IMPORT_STEPS.filter((step) => step.id !== "result").map(
                  (step, index) => {
                    const isActive = step.id === phase;
                    const isComplete = index < currentStepIndex;

                    return (
                      <div
                        key={step.id}
                        className={`rounded-xl border px-3 py-2 ${
                          isActive
                            ? "border-cyan-200 bg-cyan-50/70"
                            : isComplete
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-slate-200 bg-white"
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Step {index + 1}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {step.label}
                        </p>
                      </div>
                    );
                  },
                )}
              </nav>
            </MasterPageSurface>
          ) : null}

          {parseError ? (
            <SettingsAlertBanner tone="error">{parseError}</SettingsAlertBanner>
          ) : null}

          {importError ? (
            <SettingsAlertBanner tone="error">{importError}</SettingsAlertBanner>
          ) : null}

          {phase === "upload" ? (
            <MasterPageSurface
              variant="card"
              className="flex flex-col gap-5 p-4 sm:p-6"
            >
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Duplicates are skipped, not merged
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Rows matching an existing customer phone or email are skipped.
              Altair never updates existing customers during import.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Where is your customer list?
            </h2>
            <p className="text-sm text-slate-600">
              Choose a source to improve column matching. This is optional — you
              can map columns manually on the next step.
            </p>
            <select
              value={preset}
              onChange={(event) =>
                handlePresetChange(event.target.value as CustomerImportPreset)
              }
              className={`${adminFormInputClass} h-11 w-full max-w-md text-base sm:h-10 sm:text-sm`}
            >
              {CUSTOMER_IMPORT_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Export guidance
            </h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <span className="font-medium text-slate-800">Google Sheets:</span>{" "}
                File &gt; Download &gt; Comma Separated Values (.csv)
              </li>
              <li>
                <span className="font-medium text-slate-800">Excel:</span> Save
                As &gt; CSV
              </li>
              <li>
                <span className="font-medium text-slate-800">
                  ServiceTitan, Housecall Pro, Jobber, QuickBooks:
                </span>{" "}
                Export customers as CSV, then upload here. If columns differ,
                Altair will help match them.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Templates</h2>
            <p className="text-sm text-slate-600">
              Need a starting point? Download a simple template or the advanced
              template with separate name and company columns.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href="/templates/customer-import-template.csv"
                download="customer-import-template.csv"
                className={masterSecondaryActionClass}
              >
                <Download className="h-3.5 w-3.5" />
                Download template
              </a>
              <a
                href="/templates/customer-import-advanced-template.csv"
                download="customer-import-advanced-template.csv"
                className={masterSecondaryActionClass}
              >
                <Download className="h-3.5 w-3.5" />
                Download advanced template
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Upload your CSV
            </h2>
            <p className="text-sm text-slate-600">
              Import up to 500 customers at a time. You&apos;ll match columns,
              review a preview, then confirm the import.
            </p>
            <label
              className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center transition-colors hover:border-cyan-300 hover:bg-cyan-50/40"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
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
            </MasterPageSurface>
          ) : null}

          {phase === "mapping" ? (
            <MasterPageSurface
              variant="card"
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6"
            >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Match your columns
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {fileName ? `File: ${fileName}` : "Uploaded CSV"} ·{" "}
                {csvHeaders.length} column{csvHeaders.length === 1 ? "" : "s"}{" "}
                detected
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

          <p className="text-sm text-slate-600">
            We auto-matched obvious columns. Adjust any dropdown before
            previewing your import.
          </p>

          <div className="hidden min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Altair field</th>
                  <th className="px-4 py-3 font-semibold">Your CSV column</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CUSTOMER_IMPORT_ALTAIR_FIELDS.map((field) => (
                  <tr key={field}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {CUSTOMER_IMPORT_FIELD_LABELS[field]}
                    </td>
                    <td className="px-4 py-3">
                      <MappingSelect
                        field={field}
                        headers={csvHeaders}
                        value={fieldMapping[field]}
                        onChange={handleMappingFieldChange}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {CUSTOMER_IMPORT_ALTAIR_FIELDS.map((field) => (
              <div
                key={field}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <label className="block text-sm font-semibold text-slate-900">
                  {CUSTOMER_IMPORT_FIELD_LABELS[field]}
                </label>
                <div className="mt-2">
                  <MappingSelect
                    field={field}
                    headers={csvHeaders}
                    value={fieldMapping[field]}
                    onChange={handleMappingFieldChange}
                  />
                </div>
              </div>
            ))}
          </div>

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
              onClick={handleContinueToPreview}
              className="admin-btn-primary inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm"
            >
              Continue to preview
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
            </MasterPageSurface>
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

          <MasterPageSurface
            variant="panel"
            className="min-h-0 flex flex-1 flex-col overflow-hidden"
          >
            <div
              className={`${masterPanelHeaderClass} flex flex-wrap items-center justify-between gap-2`}
            >
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Review preview
                </h2>
                <p className="text-xs text-slate-500">
                  {fileName ? `File: ${fileName}` : "Uploaded CSV"}
                  {hasHiddenPreviewRows
                    ? ` · Showing first ${CUSTOMER_IMPORT_PREVIEW_ROW_LIMIT} of ${previewRows.length} rows`
                    : ` · ${previewRows.length} row${previewRows.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhase("mapping")}
                className="admin-btn-secondary text-xs"
              >
                Edit column mapping
              </button>
            </div>

            {previewRows.length === 0 ? (
              <div className="admin-empty-wrap flex-1">
                <div className="admin-empty-state w-full max-w-md text-center">
                  <div className="admin-empty-icon mx-auto">
                    <FileSpreadsheet
                      className="h-7 w-7 text-slate-400"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    No rows to preview
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Check your column mapping or upload a different file.
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold sm:px-6">Row</th>
                      <th className="px-4 py-3 font-semibold sm:px-6">
                        Customer
                      </th>
                      <th className="hidden px-4 py-3 font-semibold lg:table-cell sm:px-6">
                        Contact
                      </th>
                      <th className="hidden px-4 py-3 font-semibold xl:table-cell sm:px-6">
                        Address
                      </th>
                      <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRowsForDisplay.map((row) => {
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
                            <div className="mt-1 text-xs text-slate-500 lg:hidden">
                              {formatContactPreview(row)}
                            </div>
                            {row.notes ? (
                              <div className="mt-1 text-xs text-slate-500">
                                Notes: {row.notes}
                              </div>
                            ) : null}
                            {row.message ? (
                              <div className="mt-1 text-xs text-slate-500">
                                {row.message}
                              </div>
                            ) : null}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 lg:table-cell sm:px-6">
                            {formatContactPreview(row)}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 xl:table-cell sm:px-6">
                            {formatAddressPreview(row)}
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
            )}

            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">
                Only valid, non-duplicate rows are imported. Duplicates are
                skipped — existing customers are never updated or merged.
              </p>
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
                  onClick={handleConfirmImport}
                  disabled={previewSummary.readyCount === 0 || isImporting}
                  className="admin-btn-primary inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm disabled:cursor-not-allowed"
                >
                  <AdminPendingLabel
                    pending={isImporting}
                    pendingLabel="Importing…"
                    idleLabel={`Import ${previewSummary.readyCount} customer${
                      previewSummary.readyCount === 1 ? "" : "s"
                    }`}
                  />
                </button>
              </div>
            </div>
          </MasterPageSurface>
            </>
          ) : null}

          {phase === "result" && importResult ? (
            <MasterPageSurface variant="card" className="space-y-4 p-4 sm:p-6">
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
            </MasterPageSurface>
          ) : null}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

function MappingSelect({
  field,
  headers,
  value,
  onChange,
}: {
  field: (typeof CUSTOMER_IMPORT_ALTAIR_FIELDS)[number];
  headers: string[];
  value: string | null;
  onChange: (
    field: (typeof CUSTOMER_IMPORT_ALTAIR_FIELDS)[number],
    header: string | null,
  ) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(event) =>
        onChange(field, event.target.value.length > 0 ? event.target.value : null)
      }
      className={`${adminFormInputClass} h-11 w-full max-w-md text-base sm:h-10 sm:text-sm`}
    >
      <option value="">Don&apos;t import</option>
      {headers.map((header) => (
        <option key={`${field}-${header}`} value={header}>
          {header}
        </option>
      ))}
    </select>
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
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    default: "text-slate-900",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
  }[tone];

  return (
    <MasterPageSurface variant="card" className="px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${toneClasses}`}>{value}</p>
    </MasterPageSurface>
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
