/**
 * Price book import: reads a services/products export from another app (or a
 * spreadsheet) into price book items.
 *
 * ============ WHY ============
 * Before 2026-11-26 the price book could only be typed in item by item, so a
 * shop switching from Housecall Pro, Jobber, ServiceTitan, Service Fusion or
 * QuickBooks had to re-key every service and part. Each of those apps exports
 * its price book (vendor help pages, checked 2026-11-26); this maps those
 * columns onto service_items: name, description, price, cost, taxable,
 * category and active.
 *
 * Rules:
 *  - A row needs a name and a price of zero or more.
 *  - An item whose name already exists in the price book (case and spacing
 *    ignored, archived items included) is skipped, never overwritten. The
 *    same name twice in one file keeps the first.
 *  - Taxable defaults to yes when the file has no taxable column or the cell
 *    is blank, the same default as the "New item" form.
 *
 * Pure: shared by the import screen (preview) and the server action (which
 * repeats every check).
 */

import { getValueForHeader, normalizeCsvHeader, parseCsvRecords } from "@/shared/lib/customer-import-parser";
import type { ServiceItemFormData } from "@/shared/types/service-item";

export const PRICE_BOOK_IMPORT_FIELDS = [
  "name",
  "description",
  "unit_price",
  "unit_cost",
  "taxable",
  "category",
  "active",
] as const;

export type PriceBookImportField = (typeof PRICE_BOOK_IMPORT_FIELDS)[number];
export type PriceBookImportMapping = Record<PriceBookImportField, string | null>;

export const PRICE_BOOK_IMPORT_FIELD_LABELS: Record<PriceBookImportField, string> = {
  name: "Item name",
  description: "Description",
  unit_price: "Price",
  unit_cost: "Cost",
  taxable: "Taxable",
  category: "Category",
  active: "Active",
};

/** Rows one server call takes. */
export const PRICE_BOOK_IMPORT_BATCH_ROWS = 500;
/** Rows one uploaded sheet may hold. */
export const PRICE_BOOK_IMPORT_FILE_MAX_ROWS = 10_000;
export const PRICE_BOOK_IMPORT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const PRICE_BOOK_IMPORT_PREVIEW_ROW_LIMIT = 25;

const NAME_MAX = 200;
const DESCRIPTION_MAX = 2000;
const CATEGORY_MAX = 100;
const PRICE_MAX = 10_000_000;

export type PriceBookImportPreset =
  | "housecall_pro"
  | "jobber"
  | "servicetitan"
  | "service_fusion"
  | "quickbooks"
  | "other";

export const PRICE_BOOK_IMPORT_PRESET_OPTIONS: { value: PriceBookImportPreset; label: string }[] = [
  { value: "housecall_pro", label: "Housecall Pro price book export" },
  { value: "jobber", label: "Jobber products & services export" },
  { value: "servicetitan", label: "ServiceTitan pricebook export" },
  { value: "service_fusion", label: "Service Fusion product catalog" },
  { value: "quickbooks", label: "QuickBooks products & services" },
  { value: "other", label: "Other file or spreadsheet" },
];

const COMMON_ALIASES: Record<PriceBookImportField, string[]> = {
  name: [
    "name",
    "item name",
    "item",
    "product/service",
    "product / service",
    "product or service",
    "product",
    "service",
    "service name",
    "product name",
    "material name",
    "part name",
    "code",
  ],
  description: [
    "description",
    "sales description",
    "item description",
    "service description",
    "product description",
    "details",
  ],
  unit_price: [
    "price",
    "unit price",
    "sales price",
    "sales price/rate",
    "sales price / rate",
    "rate",
    "retail price",
    "member price",
    "selling price",
    "default price",
    "list price",
    "unit price ($)",
    "price ($)",
  ],
  unit_cost: [
    "cost",
    "unit cost",
    "purchase cost",
    "material cost",
    "cost ($)",
    "unit cost ($)",
  ],
  taxable: ["taxable", "is taxable", "tax", "sales tax", "taxable?"],
  category: ["category", "categories", "type", "item type", "group", "subcategory 1", "subcategory_1"],
  active: ["active", "is active", "status", "active?"],
};

const PRESET_ALIASES: Partial<Record<PriceBookImportPreset, Partial<Record<PriceBookImportField, string[]>>>> = {
  housecall_pro: {
    name: ["name"],
    unit_price: ["price"],
    unit_cost: ["cost"],
    category: ["category"],
  },
  jobber: {
    name: ["name"],
    unit_price: ["unit price", "price"],
    unit_cost: ["unit cost", "cost"],
  },
  servicetitan: {
    name: ["name", "display name", "code"],
    description: ["description"],
    unit_price: ["price", "member price"],
    unit_cost: ["cost"],
    category: ["category", "categories"],
  },
  service_fusion: {
    name: ["product", "name", "product name"],
    unit_price: ["price", "unit price"],
    unit_cost: ["cost", "unit cost"],
  },
  quickbooks: {
    name: ["product/service", "product/service name", "name"],
    description: ["sales description", "description"],
    unit_price: ["sales price/rate", "price", "rate"],
    unit_cost: ["purchase cost", "cost"],
    taxable: ["taxable"],
    category: ["category", "type"],
  },
};

/** "Code" is a last resort for the name: only used when no better column exists. */
const FIELD_ORDER: PriceBookImportField[] = ["name", "unit_price", "unit_cost", "description", "taxable", "category", "active"];

export function createEmptyPriceBookImportMapping(): PriceBookImportMapping {
  return { name: null, description: null, unit_price: null, unit_cost: null, taxable: null, category: null, active: null };
}

export function suggestPriceBookImportMapping(
  headers: string[],
  preset: PriceBookImportPreset = "other",
): PriceBookImportMapping {
  const mapping = createEmptyPriceBookImportMapping();
  const used = new Set<string>();
  for (const field of FIELD_ORDER) {
    const aliases = [...new Set([...(PRESET_ALIASES[preset]?.[field] ?? []), ...COMMON_ALIASES[field]])].map(normalizeCsvHeader);
    // Alias order is preference order: the first alias that matches a header wins.
    for (const alias of aliases) {
      const header = headers.find((candidate) => !used.has(candidate) && normalizeCsvHeader(candidate) === alias);
      if (header) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  }
  return mapping;
}

export function sanitizePriceBookImportMapping(mapping: unknown, headers: string[]): PriceBookImportMapping {
  const source = typeof mapping === "object" && mapping !== null ? (mapping as Record<string, unknown>) : {};
  const result = createEmptyPriceBookImportMapping();
  const used = new Set<string>();
  for (const field of PRICE_BOOK_IMPORT_FIELDS) {
    const value = source[field];
    if (typeof value === "string" && headers.includes(value) && !used.has(value)) {
      result[field] = value;
      used.add(value);
    }
  }
  return result;
}

/* ---------------------------------------------------------------- values */

/** "$1,234.50", "1234.5", "(12.00)" -> number; blank -> null; junk -> NaN. */
export function parseImportMoney(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const negative = /^\(.*\)$/.test(value) || value.startsWith("-");
  const cleaned = value.replace(/[()$,\s]/g, "").replace(/^-/, "").replace(/^USD/i, "");
  if (!/^\d*\.?\d+$/.test(cleaned)) return Number.NaN;
  const number = Number(cleaned);
  return negative ? -number : Math.round(number * 100) / 100;
}

function parseYesNo(raw: string, fallback: boolean): boolean {
  const value = raw.trim().toLowerCase();
  if (!value) return fallback;
  if (["yes", "y", "true", "1", "taxable", "active", "x", "on"].includes(value)) return true;
  if (["no", "n", "false", "0", "non-taxable", "nontaxable", "not taxable", "exempt", "inactive", "off"].includes(value)) return false;
  return fallback;
}

export function normalizePriceBookName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/* ---------------------------------------------------------------- rows */

export type PriceBookImportRow = {
  rowNumber: number;
  name: string;
  description: string;
  unitPrice: number;
  unitCost: number | null;
  taxable: boolean;
  category: string;
  isActive: boolean;
};

export type PriceBookImportPreviewRow = {
  rowNumber: number;
  name: string;
  priceText: string;
  costText: string;
  category: string;
  taxable: boolean;
  status: "ready" | "duplicate" | "error";
  message?: string;
  row?: PriceBookImportRow;
};

export function parsePriceBookCsv(text: string): { headers?: string[]; records?: string[][]; error?: string } {
  const trimmed = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).trim();
  if (!trimmed) return { error: "The file is empty." };
  const parsed = parseCsvRecords(trimmed);
  if (parsed.error) return { error: parsed.error };
  const records = parsed.records.filter((record) => record.some((value) => value.trim()));
  if (records.length < 2) return { error: "No item rows were found below the header row." };
  const headers = records[0]!.map((header) => header.trim());
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicates.length > 0) {
    return { error: `The file has duplicate column names (${[...new Set(duplicates)].join(", ")}). Rename them and try again.` };
  }
  const data = records.slice(1);
  if (data.length > PRICE_BOOK_IMPORT_FILE_MAX_ROWS) {
    return {
      error: `This sheet has ${data.length.toLocaleString("en-US")} rows. Import up to ${PRICE_BOOK_IMPORT_FILE_MAX_ROWS.toLocaleString("en-US")} items at a time.`,
    };
  }
  return { headers, records: data };
}

/**
 * Checks one row and returns either a clean row or the reason it can't be
 * imported. Used by the preview and again by the server action.
 */
export function validatePriceBookImportRow(
  input: Omit<PriceBookImportRow, "unitPrice" | "unitCost"> & { unitPrice: number | null; unitCost: number | null },
): { row?: PriceBookImportRow; error?: string } {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return { error: "No item name." };
  if (name.length > NAME_MAX) return { error: `Name is longer than ${NAME_MAX} characters.` };
  if (input.unitPrice === null) return { error: "No price." };
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0 || input.unitPrice > PRICE_MAX) {
    return { error: "Price is not a number of zero or more." };
  }
  if (input.unitCost !== null && (!Number.isFinite(input.unitCost) || input.unitCost < 0 || input.unitCost > PRICE_MAX)) {
    return { error: "Cost is not a number of zero or more." };
  }
  return {
    row: {
      rowNumber: input.rowNumber,
      name,
      description: input.description.trim().slice(0, DESCRIPTION_MAX),
      unitPrice: Math.round(input.unitPrice * 100) / 100,
      unitCost: input.unitCost === null ? null : Math.round(input.unitCost * 100) / 100,
      taxable: Boolean(input.taxable),
      category: input.category.trim().slice(0, CATEGORY_MAX),
      isActive: Boolean(input.isActive),
    },
  };
}

function formatMoney(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Maps the sheet with the chosen columns and marks every row ready, duplicate or error. */
export function buildPriceBookImportPreview(
  headers: string[],
  records: string[][],
  mapping: PriceBookImportMapping,
  existingNames: Iterable<string>,
): PriceBookImportPreviewRow[] {
  const seen = new Set<string>([...existingNames].map(normalizePriceBookName));
  return records.map((record, index) => {
    const get = (field: PriceBookImportField) => getValueForHeader(record, headers, mapping[field]);
    const rowNumber = index + 2;
    const price = parseImportMoney(get("unit_price"));
    const cost = parseImportMoney(get("unit_cost"));
    const checked = validatePriceBookImportRow({
      rowNumber,
      name: get("name"),
      description: get("description"),
      unitPrice: price,
      unitCost: cost,
      taxable: parseYesNo(get("taxable"), true),
      category: get("category"),
      isActive: parseYesNo(get("active"), true),
    });
    const base = {
      rowNumber,
      name: checked.row?.name ?? (get("name") || `Row ${rowNumber}`),
      priceText: price === null || Number.isNaN(price) ? get("unit_price") : formatMoney(price),
      costText: cost === null || Number.isNaN(cost) ? get("unit_cost") : formatMoney(cost),
      category: get("category"),
      taxable: parseYesNo(get("taxable"), true),
    };
    if (!checked.row) return { ...base, status: "error" as const, message: checked.error };
    const key = normalizePriceBookName(checked.row.name);
    if (seen.has(key)) {
      return { ...base, status: "duplicate" as const, message: "Already in your price book or earlier in this file." };
    }
    seen.add(key);
    return { ...base, status: "ready" as const, row: checked.row };
  });
}

export function priceBookRowToFormData(row: PriceBookImportRow): ServiceItemFormData {
  return {
    name: row.name,
    description: row.description,
    unitCost: row.unitCost,
    unitPrice: row.unitPrice,
    taxable: row.taxable,
    category: row.category,
    isActive: row.isActive,
  };
}

export function describePriceBookMappingGaps(mapping: PriceBookImportMapping): string[] {
  const warnings: string[] = [];
  if (!mapping.name) warnings.push("No column is matched to Item name. Pick the column with each service or part name.");
  if (!mapping.unit_price) warnings.push("No column is matched to Price. Every item needs a price, even if it is 0.");
  if (!mapping.taxable) warnings.push("No Taxable column is matched, so every item will import as taxable. You can change single items afterwards.");
  return warnings;
}
