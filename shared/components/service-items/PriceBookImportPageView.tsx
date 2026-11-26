"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import {
  importPriceBookRowsAction,
  type ImportPriceBookResultRow,
} from "@/app/actions/service-items-import";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  buildPriceBookImportPreview,
  describePriceBookMappingGaps,
  parsePriceBookCsv,
  PRICE_BOOK_IMPORT_BATCH_ROWS,
  PRICE_BOOK_IMPORT_FIELDS,
  PRICE_BOOK_IMPORT_FIELD_LABELS,
  PRICE_BOOK_IMPORT_FILE_MAX_ROWS,
  PRICE_BOOK_IMPORT_PRESET_OPTIONS,
  PRICE_BOOK_IMPORT_PREVIEW_ROW_LIMIT,
  PRICE_BOOK_IMPORT_UPLOAD_MAX_BYTES,
  suggestPriceBookImportMapping,
  type PriceBookImportField,
  type PriceBookImportMapping,
  type PriceBookImportPreset,
  type PriceBookImportPreviewRow,
  type PriceBookImportRow,
} from "@/shared/lib/price-book-import";
import {
  readSpreadsheetFileSheets,
  SPREADSHEET_FILE_ACCEPT,
  type SpreadsheetSheet,
} from "@/shared/lib/spreadsheet-file";
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

const STATUS: Record<PriceBookImportPreviewRow["status"], { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-emerald-50 text-emerald-700" },
  duplicate: { label: "Already there", className: "bg-amber-50 text-amber-800" },
  error: { label: "Error", className: "bg-rose-50 text-rose-700" },
};

/** Rows listed by name on the result screen; the rest are counted. */
const RESULT_LIST_LIMIT = 200;

type ImportResult = {
  importedCount: number;
  skippedRows: ImportPriceBookResultRow[];
  errorRows: ImportPriceBookResultRow[];
  error?: string;
};

export function PriceBookImportPageView({
  existingNames,
  initialPreset,
}: {
  existingNames: string[];
  initialPreset?: PriceBookImportPreset;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [preset, setPreset] = useState<PriceBookImportPreset>(initialPreset ?? "other");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SpreadsheetSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<PriceBookImportMapping>(suggestPriceBookImportMapping([]));
  const [previewRows, setPreviewRows] = useState<PriceBookImportPreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [isImporting, startImport] = useTransition();
  const [importedNames, setImportedNames] = useState<string[]>([]);

  const summary = useMemo(
    () => ({
      total: previewRows.length,
      ready: previewRows.filter((row) => row.status === "ready").length,
      duplicate: previewRows.filter((row) => row.status === "duplicate").length,
      error: previewRows.filter((row) => row.status === "error").length,
    }),
    [previewRows],
  );
  const warnings = useMemo(() => describePriceBookMappingGaps(mapping), [mapping]);
  const unmapped = useMemo(() => {
    const used = new Set(Object.values(mapping).filter(Boolean));
    return headers.filter((header) => header && !used.has(header));
  }, [headers, mapping]);

  function reset() {
    setPhase("upload");
    setFileName(null);
    setSheets([]);
    setSheetIndex(0);
    setHeaders([]);
    setRecords([]);
    setPreviewRows([]);
    setError(null);
    setResult(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function loadSheet(sheet: SpreadsheetSheet, nextPreset: PriceBookImportPreset): boolean {
    const parsed = parsePriceBookCsv(sheet.text);
    if (parsed.error || !parsed.headers || !parsed.records) {
      setError(parsed.error ?? "Could not read this sheet.");
      return false;
    }
    setHeaders(parsed.headers);
    setRecords(parsed.records);
    setMapping(suggestPriceBookImportMapping(parsed.headers, nextPreset));
    setError(null);
    return true;
  }

  function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);
    if (file.size > PRICE_BOOK_IMPORT_UPLOAD_MAX_BYTES) {
      setError("This file is larger than 20 MB. Export only the price book columns and try again.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    void readSpreadsheetFileSheets(file).then((read) => {
      if (read.error !== undefined) {
        setError(read.error);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSheets(read.sheets);
      setSheetIndex(0);
      if (loadSheet(read.sheets[0]!, preset)) setPhase("mapping");
    });
  }

  function handleSheetChange(index: number) {
    setSheetIndex(index);
    const sheet = sheets[index];
    if (sheet) loadSheet(sheet, preset);
  }

  function handlePresetChange(next: PriceBookImportPreset) {
    setPreset(next);
    if (headers.length > 0) setMapping(suggestPriceBookImportMapping(headers, next));
  }

  function handleContinue() {
    setPreviewRows(
      buildPriceBookImportPreview(headers, records, mapping, [...existingNames, ...importedNames]),
    );
    setPhase("preview");
  }

  function handleImport() {
    const ready = previewRows
      .map((row) => row.row)
      .filter((row): row is PriceBookImportRow => Boolean(row));
    if (isImporting || ready.length === 0) return;
    setError(null);

    startImport(async () => {
      const combined: ImportResult = { importedCount: 0, skippedRows: [], errorRows: [] };
      const duplicatesFromPreview = previewRows
        .filter((row) => row.status !== "ready")
        .map((row) => ({
          rowNumber: row.rowNumber,
          name: row.name,
          message: row.message ?? "",
          status: row.status,
        }));
      setProgress({ done: 0, total: ready.length });

      let done = 0;
      let stoppedWith: string | null = null;
      for (let start = 0; start < ready.length; start += PRICE_BOOK_IMPORT_BATCH_ROWS) {
        const batch = ready.slice(start, start + PRICE_BOOK_IMPORT_BATCH_ROWS);
        try {
          const response = await importPriceBookRowsAction(batch);
          combined.importedCount += response.importedCount;
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
        setError(formatActionError(stoppedWith, "We couldn't import these items. Try again."));
        return;
      }

      for (const row of duplicatesFromPreview) {
        (row.status === "error" ? combined.errorRows : combined.skippedRows).push({
          rowNumber: row.rowNumber,
          name: row.name,
          message: row.message,
        });
      }
      combined.skippedRows.sort((a, b) => a.rowNumber - b.rowNumber);
      combined.errorRows.sort((a, b) => a.rowNumber - b.rowNumber);
      if (stoppedWith) {
        combined.error = `${formatActionError(stoppedWith, "The import stopped.")} ${done.toLocaleString("en-US")} of ${ready.length.toLocaleString("en-US")} items were sent. Import the same file again to bring in the rest; items already added are skipped.`;
      }
      setImportedNames((current) => [...current, ...ready.slice(0, done).map((row) => row.name)]);
      setResult(combined);
      setPhase("result");
    });
  }

  const stepIndex = STEPS.findIndex((step) => step.id === phase);
  const otherSheetsLeft = sheets.length > 1;

  return (
    <MasterShellPage fillViewport density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact" scrollable>
          <MasterPageHeader
            title="Import Price Book"
            subtitle="Services, parts and materials from a CSV or Excel file"
            density="compact"
            secondaryAction={
              <Link href="/price-book" className={masterSecondaryActionClass}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to Price Book</span>
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
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-sm font-semibold text-amber-900">Existing items are never changed</p>
                <p className="mt-1 text-sm text-amber-800">
                  An item whose name is already in your price book is skipped, so importing the same file twice
                  doesn&apos;t create doubles.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">Where is your price book from?</h2>
                <p className="text-sm text-slate-600">
                  This improves the column matching. You can change any match on the next step.
                </p>
                <select
                  value={preset}
                  onChange={(event) => handlePresetChange(event.target.value as PriceBookImportPreset)}
                  className={`${adminFormInputClass} h-11 w-full max-w-md text-base sm:h-10 sm:text-sm`}
                >
                  {PRICE_BOOK_IMPORT_PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-900">Upload your file</h2>
                <p className="text-sm text-slate-600">
                  A CSV or Excel file with up to {PRICE_BOOK_IMPORT_FILE_MAX_ROWS.toLocaleString("en-US")} items. If
                  your Excel file has a sheet for services and another for materials, you can import each one. The
                  export menus for each app are at{" "}
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

              {sheets.length > 1 ? (
                <div className="space-y-1">
                  <label htmlFor="price-book-sheet" className="block text-sm font-semibold text-slate-900">
                    Sheet
                  </label>
                  <select
                    id="price-book-sheet"
                    value={sheetIndex}
                    onChange={(event) => handleSheetChange(Number(event.target.value))}
                    className={`${adminFormInputClass} h-11 w-full max-w-md text-base sm:h-10 sm:text-sm`}
                  >
                    {sheets.map((sheet, index) => (
                      <option key={`${sheet.name}-${index}`} value={index}>
                        {sheet.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {PRICE_BOOK_IMPORT_FIELDS.map((field) => (
                  <div key={field} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <label htmlFor={`pb-map-${field}`} className="block text-sm font-semibold text-slate-900">
                      {PRICE_BOOK_IMPORT_FIELD_LABELS[field]}
                      {field === "name" || field === "unit_price" ? (
                        <span className="ml-1 text-xs font-medium text-slate-500">(needed)</span>
                      ) : null}
                    </label>
                    <select
                      id={`pb-map-${field}`}
                      value={mapping[field] ?? ""}
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [field as PriceBookImportField]: event.target.value || null,
                        }))
                      }
                      className={`${adminFormInputClass} mt-2 h-11 w-full text-base sm:h-10 sm:text-sm`}
                    >
                      <option value="">Don&apos;t import</option>
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
                      Not imported: <span className="font-medium">{unmapped.join(", ")}</span>.
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
                  disabled={!mapping.name || !mapping.unit_price}
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
                <Stat label="Rows" value={summary.total} />
                <Stat label="Ready to import" value={summary.ready} tone="text-emerald-700" />
                <Stat label="Already there" value={summary.duplicate} tone="text-amber-700" />
                <Stat label="Errors" value={summary.error} tone="text-rose-700" />
              </section>

              <MasterPageSurface variant="panel" className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className={`${masterPanelHeaderClass} flex flex-wrap items-center justify-between gap-2`}>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Review preview</h2>
                    <p className="text-xs text-slate-500">
                      {previewRows.length > PRICE_BOOK_IMPORT_PREVIEW_ROW_LIMIT
                        ? `Showing the first ${PRICE_BOOK_IMPORT_PREVIEW_ROW_LIMIT} of ${previewRows.length.toLocaleString("en-US")} rows`
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
                        <th className="px-4 py-3 font-semibold sm:px-6">Row</th>
                        <th className="px-4 py-3 font-semibold sm:px-6">Item</th>
                        <th className="px-4 py-3 text-right font-semibold sm:px-6">Price</th>
                        <th className="hidden px-4 py-3 text-right font-semibold md:table-cell sm:px-6">Cost</th>
                        <th className="hidden px-4 py-3 font-semibold lg:table-cell sm:px-6">Category</th>
                        <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.slice(0, PRICE_BOOK_IMPORT_PREVIEW_ROW_LIMIT).map((row) => (
                        <tr key={row.rowNumber} className="align-top">
                          <td className="px-4 py-3 text-slate-500 sm:px-6">{row.rowNumber}</td>
                          <td className="px-4 py-3 sm:px-6">
                            <div className="font-medium text-slate-900">{row.name}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {row.taxable ? "Taxable" : "Not taxable"}
                              {row.message ? ` · ${row.message}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">{row.priceText || "—"}</td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 md:table-cell sm:px-6">
                            {row.costText || "—"}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 lg:table-cell sm:px-6">{row.category || "—"}</td>
                          <td className="px-4 py-3 sm:px-6">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[row.status].className}`}>
                              {STATUS[row.status].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-xs text-slate-500">Only rows marked Ready are imported.</p>
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
                        idleLabel={`Import ${summary.ready.toLocaleString("en-US")} item${summary.ready === 1 ? "" : "s"}`}
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
                    {result.importedCount.toLocaleString("en-US")} item{result.importedCount === 1 ? "" : "s"} added to
                    your price book
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {result.skippedRows.length.toLocaleString("en-US")} already there,{" "}
                    {result.errorRows.length.toLocaleString("en-US")} with errors.
                  </p>
                </div>
              </div>

              {result.skippedRows.length + result.errorRows.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Not imported</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    {[...result.errorRows, ...result.skippedRows].slice(0, RESULT_LIST_LIMIT).map((row) => (
                      <li key={`${row.rowNumber}-${row.name}`}>
                        Row {row.rowNumber}: {row.name || "(no name)"}
                        {row.message ? ` · ${row.message}` : ""}
                      </li>
                    ))}
                  </ul>
                  {result.skippedRows.length + result.errorRows.length > RESULT_LIST_LIMIT ? (
                    <p className="mt-2 text-xs text-slate-500">
                      and {(result.skippedRows.length + result.errorRows.length - RESULT_LIST_LIMIT).toLocaleString("en-US")}{" "}
                      more.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/price-book"
                  className="admin-btn-primary inline-flex h-9 items-center justify-center px-4 text-sm"
                >
                  Open the price book
                </Link>
                {otherSheetsLeft ? (
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setPhase("mapping");
                    }}
                    className="admin-btn-secondary inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Import another sheet from this file
                  </button>
                ) : null}
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

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <MasterPageSurface variant="card" className="px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value.toLocaleString("en-US")}</p>
    </MasterPageSurface>
  );
}
