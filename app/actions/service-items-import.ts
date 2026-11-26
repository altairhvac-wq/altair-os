"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  createServiceItemsBulk,
  listServiceItemNamesForImport,
} from "@/lib/database/queries/service-items";
import {
  normalizePriceBookName,
  PRICE_BOOK_IMPORT_BATCH_ROWS,
  priceBookRowToFormData,
  validatePriceBookImportRow,
  type PriceBookImportRow,
} from "@/shared/lib/price-book-import";

export type ImportPriceBookResultRow = {
  rowNumber: number;
  name: string;
  message: string;
};

export type ImportPriceBookActionResult = {
  error?: string;
  importedCount: number;
  skippedRows: ImportPriceBookResultRow[];
  errorRows: ImportPriceBookResultRow[];
};

const EMPTY = { importedCount: 0, skippedRows: [], errorRows: [] };

/**
 * Imports one batch of price book rows. The screen maps and previews the
 * file, then sends ready rows in batches of PRICE_BOOK_IMPORT_BATCH_ROWS; this
 * action repeats every check (permission, each value, duplicate names against
 * the price book as it is now) because the browser is not trusted.
 */
export async function importPriceBookRowsAction(
  rows: unknown,
): Promise<ImportPriceBookActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE, ...EMPTY };

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage the price book.", ...EMPTY };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No price book rows were provided.", ...EMPTY };
  }
  if (rows.length > PRICE_BOOK_IMPORT_BATCH_ROWS) {
    return {
      error: `Send up to ${PRICE_BOOK_IMPORT_BATCH_ROWS} items at a time.`,
      ...EMPTY,
    };
  }

  const { names, error: namesError } = await listServiceItemNamesForImport(
    context.company.id,
  );
  if (namesError) {
    return {
      error: "We couldn't check your existing price book right now. Try again in a moment.",
      ...EMPTY,
    };
  }

  const seen = new Set(names.map(normalizePriceBookName));
  const ready: PriceBookImportRow[] = [];
  const skippedRows: ImportPriceBookResultRow[] = [];
  const errorRows: ImportPriceBookResultRow[] = [];

  for (const raw of rows) {
    const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const rowNumber = Number.isInteger(input.rowNumber) ? (input.rowNumber as number) : 0;
    const text = (value: unknown) => (typeof value === "string" ? value : "");
    const money = (value: unknown) =>
      value === null || value === undefined ? null : typeof value === "number" ? value : Number.NaN;

    const checked = validatePriceBookImportRow({
      rowNumber,
      name: text(input.name),
      description: text(input.description),
      unitPrice: money(input.unitPrice),
      unitCost: money(input.unitCost),
      taxable: input.taxable !== false,
      category: text(input.category),
      isActive: input.isActive !== false,
    });

    if (!checked.row) {
      errorRows.push({ rowNumber, name: text(input.name), message: checked.error ?? "Invalid row." });
      continue;
    }

    const key = normalizePriceBookName(checked.row.name);
    if (seen.has(key)) {
      skippedRows.push({ rowNumber, name: checked.row.name, message: "Already in your price book." });
      continue;
    }
    seen.add(key);
    ready.push(checked.row);
  }

  const { count, error } = await createServiceItemsBulk(
    context.company.id,
    ready.map(priceBookRowToFormData),
  );

  if (error) {
    return {
      error: "We couldn't save these items. Nothing from this batch was added. Try again.",
      importedCount: 0,
      skippedRows,
      errorRows,
    };
  }

  if (count > 0) {
    revalidatePath("/price-book");
    revalidatePath("/estimates");
    revalidatePath("/sales");
  }

  return { importedCount: count, skippedRows, errorRows };
}
