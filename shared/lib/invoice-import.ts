/**
 * Unpaid invoice import: brings the balances a switching shop is still owed
 * into Altair as draft invoices, one per old invoice, on the matching customer.
 *
 * ============ WHY ============
 * Open invoices are money the owner is still collecting. Until 2026-11-26 a
 * shop switching from Jobber, Housecall Pro, ServiceTitan, Service Fusion or
 * QuickBooks had to keep the old app open until every old invoice was paid,
 * or retype each one. Each of those apps exports an invoice list (vendor help
 * pages, checked 2026-11-26). This reads that list and creates, for every
 * invoice that still has money owed:
 *
 *   - a DRAFT invoice (nothing is sent; the owner reviews and sends it),
 *   - on the customer matched by email, then phone, then exact name,
 *   - with one line, "Balance from previous invoice #1234", for the amount
 *     still owed, not taxed again (the old invoice already charged the tax),
 *   - notes that start "Previous invoice #1234." The import reads that prefix
 *     back to skip an invoice already brought over, so importing the same file
 *     twice creates nothing new.
 *
 * Paid, void and zero-balance rows are skipped and listed. A row whose
 * customer can't be matched is listed as an error: import customers first.
 *
 * Pure: shared by the import screen (preview) and the server action (which
 * repeats every check).
 */

import { getValueForHeader, normalizeCsvHeader, parseCsvRecords } from "@/shared/lib/customer-import-parser";
import { parseImportMoney } from "@/shared/lib/price-book-import";

export const INVOICE_IMPORT_FIELDS = [
  "invoice_number",
  "customer_name",
  "customer_email",
  "customer_phone",
  "issue_date",
  "due_date",
  "total",
  "amount_paid",
  "balance_due",
  "status",
] as const;

export type InvoiceImportField = (typeof INVOICE_IMPORT_FIELDS)[number];
export type InvoiceImportMapping = Record<InvoiceImportField, string | null>;

export const INVOICE_IMPORT_FIELD_LABELS: Record<InvoiceImportField, string> = {
  invoice_number: "Invoice number",
  customer_name: "Customer name",
  customer_email: "Customer email",
  customer_phone: "Customer phone",
  issue_date: "Invoice date",
  due_date: "Due date",
  total: "Invoice total",
  amount_paid: "Amount paid",
  balance_due: "Balance still owed",
  status: "Status",
};

export const INVOICE_IMPORT_BATCH_ROWS = 100;
export const INVOICE_IMPORT_FILE_MAX_ROWS = 10_000;
export const INVOICE_IMPORT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const INVOICE_IMPORT_PREVIEW_ROW_LIMIT = 25;
const AMOUNT_MAX = 10_000_000;

export type InvoiceImportPreset = "jobber" | "housecall_pro" | "servicetitan" | "service_fusion" | "quickbooks" | "other";

export const INVOICE_IMPORT_PRESET_OPTIONS: { value: InvoiceImportPreset; label: string }[] = [
  { value: "jobber", label: "Jobber invoices report" },
  { value: "housecall_pro", label: "Housecall Pro jobs export" },
  { value: "servicetitan", label: "ServiceTitan invoices report" },
  { value: "service_fusion", label: "Service Fusion invoice report" },
  { value: "quickbooks", label: "QuickBooks open invoices" },
  { value: "other", label: "Other file or spreadsheet" },
];

const COMMON_ALIASES: Record<InvoiceImportField, string[]> = {
  invoice_number: ["invoice #", "invoice number", "invoice no", "invoice no.", "invoice", "invoice id", "num", "number", "inv #", "doc number"],
  customer_name: ["client name", "customer name", "customer", "client", "name", "bill to", "customer full name", "display name"],
  customer_email: ["client email", "customer email", "email", "email address", "e mail", "bill to email"],
  customer_phone: ["client phone", "customer phone", "phone", "phone number", "mobile number", "mobile phone", "primary phone", "main phone #"],
  issue_date: ["issued date", "issue date", "invoice date", "date", "created date", "created at", "created"],
  due_date: ["due date", "due", "due on", "payment due"],
  total: ["total", "invoice total", "amount", "total amount", "total ($)", "grand total"],
  amount_paid: ["paid amount", "amount paid", "paid", "payments", "total paid"],
  balance_due: ["balance", "balance due", "open balance", "amount due", "outstanding", "balance ($)", "remaining balance"],
  status: ["status", "invoice status", "payment status", "job status"],
};

const PRESET_ALIASES: Partial<Record<InvoiceImportPreset, Partial<Record<InvoiceImportField, string[]>>>> = {
  jobber: { invoice_number: ["invoice #"], customer_name: ["client name"], customer_email: ["client email"], issue_date: ["issued date"], balance_due: ["balance"] },
  housecall_pro: { invoice_number: ["invoice number"], customer_name: ["customer"], total: ["amount"], amount_paid: ["paid amount"], balance_due: ["due"], issue_date: ["date"], status: ["job status"] },
  servicetitan: { invoice_number: ["invoice #", "invoice number"], customer_name: ["customer name", "customer"], issue_date: ["invoice date"], balance_due: ["balance"] },
  service_fusion: { invoice_number: ["invoice #", "invoice number"], customer_name: ["customer", "customer name"], issue_date: ["invoice date", "date"] },
  quickbooks: { invoice_number: ["num", "no."], customer_name: ["name", "customer"], issue_date: ["date"], due_date: ["due date"], total: ["amount"], balance_due: ["open balance"] },
};

const FIELD_ORDER: InvoiceImportField[] = [
  "invoice_number",
  "customer_email",
  "customer_phone",
  "balance_due",
  "amount_paid",
  "total",
  "due_date",
  "issue_date",
  "status",
  "customer_name",
];

export function createEmptyInvoiceImportMapping(): InvoiceImportMapping {
  return Object.fromEntries(INVOICE_IMPORT_FIELDS.map((field) => [field, null])) as InvoiceImportMapping;
}

export function suggestInvoiceImportMapping(headers: string[], preset: InvoiceImportPreset = "other"): InvoiceImportMapping {
  const mapping = createEmptyInvoiceImportMapping();
  const used = new Set<string>();
  for (const field of FIELD_ORDER) {
    const aliases = [...new Set([...(PRESET_ALIASES[preset]?.[field] ?? []), ...COMMON_ALIASES[field]])].map(normalizeCsvHeader);
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

export function sanitizeInvoiceImportMapping(mapping: unknown, headers: string[]): InvoiceImportMapping {
  const source = typeof mapping === "object" && mapping !== null ? (mapping as Record<string, unknown>) : {};
  const result = createEmptyInvoiceImportMapping();
  const used = new Set<string>();
  for (const field of INVOICE_IMPORT_FIELDS) {
    const value = source[field];
    if (typeof value === "string" && headers.includes(value) && !used.has(value)) {
      result[field] = value;
      used.add(value);
    }
  }
  return result;
}

export function describeInvoiceMappingGaps(mapping: InvoiceImportMapping): string[] {
  const warnings: string[] = [];
  if (!mapping.invoice_number) warnings.push("No column is matched to Invoice number. It is how each invoice is recognized and kept from coming in twice.");
  if (!mapping.customer_email && !mapping.customer_phone && !mapping.customer_name) {
    warnings.push("No customer column is matched. Pick the customer's email, phone or name.");
  }
  if (!mapping.balance_due && !mapping.total) warnings.push("No amount column is matched. Pick the balance still owed, or the invoice total.");
  if (!mapping.balance_due && mapping.total && !mapping.amount_paid && !mapping.status) {
    warnings.push(
      "Only the invoice total is matched, with no balance, amount paid or status column. Every row will be treated as fully unpaid. Match a balance or status column if the file has one.",
    );
  }
  return warnings;
}

/* ---------------------------------------------------------------- values */

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function isoDate(year: number, month: number, day: number): string | null {
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** "2026-10-02", "10/2/2026", "Oct 2, 2026", "2 Oct 2026" (with or without a time) -> "2026-10-02"; else null. */
export function parseImportDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (match) return isoDate(Number(match[3]), Number(match[1]), Number(match[2])); // US month/day/year
  match = value.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (match && MONTHS[match[1]!.toLowerCase()]) return isoDate(Number(match[3]), MONTHS[match[1]!.toLowerCase()]!, Number(match[2]));
  match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})/);
  if (match && MONTHS[match[2]!.toLowerCase()]) return isoDate(Number(match[3]), MONTHS[match[2]!.toLowerCase()]!, Number(match[1]));
  return null;
}

const CLOSED_STATUS = /\b(paid|void|voided|cancel+ed|bad debt|written off|refunded|draft)\b/i;
const PARTIAL_STATUS = /\bpartial/i;

export function normalizeImportEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeImportPhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits.length >= 7 ? digits : "";
}

export function normalizeImportNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/* ---------------------------------------------------------------- customers */

export type InvoiceImportCustomer = { id: string; name: string; email: string; phone: string };

export type InvoiceImportCustomerIndex = {
  byEmail: Map<string, InvoiceImportCustomer[]>;
  byPhone: Map<string, InvoiceImportCustomer[]>;
  byName: Map<string, InvoiceImportCustomer[]>;
};

export function buildInvoiceImportCustomerIndex(customers: InvoiceImportCustomer[]): InvoiceImportCustomerIndex {
  const index: InvoiceImportCustomerIndex = { byEmail: new Map(), byPhone: new Map(), byName: new Map() };
  const add = (map: Map<string, InvoiceImportCustomer[]>, key: string, customer: InvoiceImportCustomer) => {
    if (!key) return;
    map.set(key, [...(map.get(key) ?? []), customer]);
  };
  for (const customer of customers) {
    add(index.byEmail, normalizeImportEmailKey(customer.email), customer);
    add(index.byPhone, normalizeImportPhoneKey(customer.phone), customer);
    add(index.byName, normalizeImportNameKey(customer.name), customer);
  }
  return index;
}

/** Email first, then phone, then exact name; a key shared by two customers is not used. */
export function matchInvoiceImportCustomer(
  index: InvoiceImportCustomerIndex,
  contact: { name: string; email: string; phone: string },
): { customer?: InvoiceImportCustomer; error?: string } {
  const tries: [Map<string, InvoiceImportCustomer[]>, string][] = [
    [index.byEmail, normalizeImportEmailKey(contact.email)],
    [index.byPhone, normalizeImportPhoneKey(contact.phone)],
    [index.byName, normalizeImportNameKey(contact.name)],
  ];
  let ambiguous = false;
  for (const [map, key] of tries) {
    if (!key) continue;
    const found = map.get(key) ?? [];
    if (found.length === 1) return { customer: found[0] };
    if (found.length > 1) ambiguous = true;
  }
  if (ambiguous) return { error: "More than one customer matches. Create this invoice by hand." };
  return { error: "No matching customer. Import your customers first, then this file again." };
}

/* ---------------------------------------------------------------- rows */

export type InvoiceImportRow = {
  rowNumber: number;
  oldNumber: string;
  customerId: string;
  customerName: string;
  amountOwed: number;
  originalTotal: number | null;
  issueDate: string | null;
  dueDate: string | null;
};

export type InvoiceImportPreviewRow = {
  rowNumber: number;
  oldNumber: string;
  customerLabel: string;
  owedText: string;
  dueText: string;
  status: "ready" | "skipped" | "error";
  message?: string;
  row?: InvoiceImportRow;
};

/** The notes prefix every imported invoice starts with; read back for the duplicate check. */
export function previousInvoiceNotePrefix(oldNumber: string): string {
  return `Previous invoice #${oldNumber}.`;
}

export function readPreviousInvoiceNumber(notes: string | null | undefined): string | null {
  const match = (notes ?? "").match(/^Previous invoice #(\S+?)\./);
  return match ? match[1]! : null;
}

export function normalizeOldInvoiceNumber(raw: string): string {
  return raw.trim().replace(/^#/, "").replace(/\s+/g, "");
}

function money(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function parseInvoiceCsv(text: string): { headers?: string[]; records?: string[][]; error?: string } {
  const trimmed = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).trim();
  if (!trimmed) return { error: "The file is empty." };
  const parsed = parseCsvRecords(trimmed);
  if (parsed.error) return { error: parsed.error };
  const records = parsed.records.filter((record) => record.some((value) => value.trim()));
  if (records.length < 2) return { error: "No invoice rows were found below the header row." };
  const headers = records[0]!.map((header) => header.trim());
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicates.length > 0) {
    return { error: `The file has duplicate column names (${[...new Set(duplicates)].join(", ")}). Rename them and try again.` };
  }
  const data = records.slice(1);
  if (data.length > INVOICE_IMPORT_FILE_MAX_ROWS) {
    return { error: `This file has ${data.length.toLocaleString("en-US")} rows. Import up to ${INVOICE_IMPORT_FILE_MAX_ROWS.toLocaleString("en-US")} at a time.` };
  }
  return { headers, records: data };
}

/** Maps every row, works out what is still owed and on whom, and marks it ready, skipped or error. */
export function buildInvoiceImportPreview(
  headers: string[],
  records: string[][],
  mapping: InvoiceImportMapping,
  customers: InvoiceImportCustomerIndex,
  alreadyImported: Iterable<string>,
): InvoiceImportPreviewRow[] {
  const seen = new Set([...alreadyImported].map((number) => number.toLowerCase()));
  return records.map((record, index) => {
    const get = (field: InvoiceImportField) => getValueForHeader(record, headers, mapping[field]);
    const rowNumber = index + 2;
    const oldNumber = normalizeOldInvoiceNumber(get("invoice_number"));
    const contact = { name: get("customer_name"), email: get("customer_email"), phone: get("customer_phone") };
    const total = parseImportMoney(get("total"));
    const paid = parseImportMoney(get("amount_paid"));
    const balance = parseImportMoney(get("balance_due"));
    const statusText = get("status");
    const dueDate = parseImportDate(get("due_date"));
    const issueDate = parseImportDate(get("issue_date"));

    let owed: number | null = null;
    if (balance !== null && !Number.isNaN(balance)) owed = balance;
    else if (total !== null && !Number.isNaN(total)) {
      owed = paid !== null && !Number.isNaN(paid) ? total - paid : total;
    }

    const base = {
      rowNumber,
      oldNumber: oldNumber || "—",
      customerLabel: contact.name || contact.email || contact.phone || "—",
      owedText: owed === null || Number.isNaN(owed) ? get("balance_due") || get("total") : money(Math.max(owed, 0)),
      dueText: dueDate ?? get("due_date"),
    };

    if (!oldNumber) return { ...base, status: "error" as const, message: "No invoice number." };
    if (oldNumber.length > 40) return { ...base, status: "error" as const, message: "Invoice number is too long." };
    if (owed === null) return { ...base, status: "error" as const, message: "No amount." };
    if (Number.isNaN(owed) || owed > AMOUNT_MAX) return { ...base, status: "error" as const, message: "The amount is not a number." };
    if (statusText && CLOSED_STATUS.test(statusText) && !PARTIAL_STATUS.test(statusText) && balance === null) {
      return { ...base, status: "skipped" as const, message: `Marked "${statusText}".` };
    }
    const owedRounded = Math.round(owed * 100) / 100;
    if (owedRounded <= 0) return { ...base, status: "skipped" as const, message: "Nothing owed." };

    const key = oldNumber.toLowerCase();
    if (seen.has(key)) return { ...base, status: "skipped" as const, message: "Already brought over, or listed twice in this file." };

    const matched = matchInvoiceImportCustomer(customers, contact);
    if (!matched.customer) return { ...base, status: "error" as const, message: matched.error };

    seen.add(key);
    return {
      ...base,
      customerLabel: matched.customer.name,
      status: "ready" as const,
      row: {
        rowNumber,
        oldNumber,
        customerId: matched.customer.id,
        customerName: matched.customer.name,
        amountOwed: owedRounded,
        originalTotal: total !== null && !Number.isNaN(total) ? Math.round(total * 100) / 100 : null,
        issueDate,
        dueDate,
      },
    };
  });
}

function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The one line on the new invoice and the notes it starts with. */
export function describeCarriedOverInvoice(row: InvoiceImportRow): { lineName: string; lineDescription: string; notes: string } {
  const details: string[] = [];
  if (row.issueDate) details.push(`Issued ${formatLongDate(row.issueDate)}.`);
  if (row.originalTotal !== null && row.originalTotal !== row.amountOwed) {
    details.push(`Original total ${money(row.originalTotal)}; ${money(row.amountOwed)} still owed.`);
  }
  return {
    lineName: `Balance from previous invoice #${row.oldNumber}`,
    lineDescription: details.join(" "),
    notes: `${previousInvoiceNotePrefix(row.oldNumber)} This balance carries over from our previous billing system.`,
  };
}
