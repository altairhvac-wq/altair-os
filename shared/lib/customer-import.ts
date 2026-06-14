import { normalizePhoneDigits, phonesMatch } from "@/shared/lib/phone";
import {
  normalizeCustomerFormData,
  validateCustomerFormData,
  type CustomerFormData,
} from "@/shared/types/customer";

export const CUSTOMER_IMPORT_COLUMNS = [
  "name",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "zip",
] as const;

export type CustomerImportColumn = (typeof CUSTOMER_IMPORT_COLUMNS)[number];

export const CUSTOMER_IMPORT_MAX_ROWS = 500;

/** Guard against oversized uploads before parsing (500 rows × ~200 chars ≪ 256 KB). */
export const CUSTOMER_IMPORT_MAX_FILE_BYTES = 256 * 1024;

export const CUSTOMER_IMPORT_TEMPLATE_CSV = `name,phone,email,address,city,state,zip
John Smith,8015551234,john@example.com,123 Main St,Draper,UT,84020`;

export type CustomerImportRowInput = {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type CustomerImportRowStatus = "ready" | "duplicate" | "error";

export type CustomerImportPreviewRow = {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  status: CustomerImportRowStatus;
  message?: string;
  formData?: CustomerFormData;
};

export type CustomerImportContact = {
  email: string;
  phone: string;
};

export type CustomerImportPreviewSummary = {
  totalRows: number;
  readyCount: number;
  duplicateCount: number;
  errorCount: number;
};

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function parseCsvRecords(text: string): {
  records: string[][];
  error?: string;
} {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    return {
      records: [],
      error:
        "The CSV file has an unclosed quote. Fix the formatting and try again.",
    };
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return { records };
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeImportEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeImportPhoneKey(phone: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (!digits) {
    return null;
  }

  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function getCustomerImportRowLimitError(rowCount: number): string | null {
  if (rowCount > CUSTOMER_IMPORT_MAX_ROWS) {
    return `This file has ${rowCount} rows. Import up to ${CUSTOMER_IMPORT_MAX_ROWS} customers at a time.`;
  }

  return null;
}

export function getCustomerImportFileSizeError(byteLength: number): string | null {
  if (byteLength > CUSTOMER_IMPORT_MAX_FILE_BYTES) {
    const maxKb = Math.round(CUSTOMER_IMPORT_MAX_FILE_BYTES / 1024);
    return `This file is too large. Keep imports under ${maxKb} KB.`;
  }

  return null;
}

export function sanitizeCustomerImportRows(
  rows: CustomerImportRowInput[],
): CustomerImportRowInput[] {
  return rows.map((row, index) => ({
    rowNumber:
      typeof row?.rowNumber === "number" &&
      Number.isFinite(row.rowNumber) &&
      row.rowNumber > 0
        ? Math.trunc(row.rowNumber)
        : index + 2,
    name: String(row?.name ?? "").trim(),
    phone: String(row?.phone ?? "").trim(),
    email: String(row?.email ?? "").trim(),
    address: String(row?.address ?? "").trim(),
    city: String(row?.city ?? "").trim(),
    state: String(row?.state ?? "").trim(),
    zip: String(row?.zip ?? "").trim(),
  }));
}

function normalizeCustomerImportFormData(
  data: CustomerFormData,
): CustomerFormData {
  const normalized = normalizeCustomerFormData(data);

  return {
    ...normalized,
    email: normalized.email
      ? normalizeImportEmail(normalized.email)
      : normalized.email,
  };
}

export function buildCustomerFormDataFromImportRow(
  row: CustomerImportRowInput,
): CustomerFormData {
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    company: "",
    status: "active",
    notes: "",
  };
}

export function validateCustomerImportRow(
  row: CustomerImportRowInput,
): string | null {
  const formData = normalizeCustomerImportFormData(
    buildCustomerFormDataFromImportRow(row),
  );

  const validationError = validateCustomerFormData(formData, {
    requireContact: false,
    requireAddress: false,
  });
  if (validationError) {
    return validationError;
  }

  if (!formData.phone && !formData.email) {
    return "Phone or email is required.";
  }

  return null;
}

function contactMatchesExisting(
  formData: CustomerFormData,
  existingContacts: CustomerImportContact[],
): boolean {
  const normalizedEmail = normalizeImportEmail(formData.email);

  for (const contact of existingContacts) {
    if (
      normalizedEmail &&
      normalizeImportEmail(contact.email) === normalizedEmail
    ) {
      return true;
    }

    if (formData.phone && phonesMatch(formData.phone, contact.phone)) {
      return true;
    }
  }

  return false;
}

function contactMatchesBatch(
  formData: CustomerFormData,
  seenEmails: Set<string>,
  seenPhones: Set<string>,
): boolean {
  const normalizedEmail = normalizeImportEmail(formData.email);
  if (normalizedEmail && seenEmails.has(normalizedEmail)) {
    return true;
  }

  const phoneKey = formData.phone ? normalizeImportPhoneKey(formData.phone) : null;
  if (phoneKey && seenPhones.has(phoneKey)) {
    return true;
  }

  return false;
}

function trackBatchContact(
  formData: CustomerFormData,
  seenEmails: Set<string>,
  seenPhones: Set<string>,
): void {
  const normalizedEmail = normalizeImportEmail(formData.email);
  if (normalizedEmail) {
    seenEmails.add(normalizedEmail);
  }

  const phoneKey = formData.phone ? normalizeImportPhoneKey(formData.phone) : null;
  if (phoneKey) {
    seenPhones.add(phoneKey);
  }
}

export function classifyCustomerImportRows(
  rows: CustomerImportRowInput[],
  existingContacts: CustomerImportContact[],
): CustomerImportPreviewRow[] {
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  return rows.map((row) => {
    const displayName = row.name.trim() || `Row ${row.rowNumber}`;
    const validationError = validateCustomerImportRow(row);

    if (validationError) {
      return {
        rowNumber: row.rowNumber,
        name: displayName,
        phone: row.phone.trim(),
        email: row.email.trim(),
        status: "error",
        message: validationError,
      };
    }

    const formData = normalizeCustomerImportFormData(
      buildCustomerFormDataFromImportRow(row),
    );

    if (contactMatchesBatch(formData, seenEmails, seenPhones)) {
      return {
        rowNumber: row.rowNumber,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        status: "duplicate",
        message: "Duplicate contact in this file.",
      };
    }

    if (contactMatchesExisting(formData, existingContacts)) {
      return {
        rowNumber: row.rowNumber,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        status: "duplicate",
        message: "Matches an existing customer.",
      };
    }

    trackBatchContact(formData, seenEmails, seenPhones);

    return {
      rowNumber: row.rowNumber,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      status: "ready",
      formData,
    };
  });
}

export function summarizeCustomerImportPreview(
  rows: CustomerImportPreviewRow[],
): CustomerImportPreviewSummary {
  return {
    totalRows: rows.length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    duplicateCount: rows.filter((row) => row.status === "duplicate").length,
    errorCount: rows.filter((row) => row.status === "error").length,
  };
}

export function parseCustomerImportCsv(text: string): {
  error?: string;
  rows?: CustomerImportRowInput[];
} {
  const trimmed = stripBom(text).trim();

  if (!trimmed) {
    return { error: "The file is empty. Add customer rows and try again." };
  }

  const parsedRecords = parseCsvRecords(trimmed);
  if (parsedRecords.error) {
    return { error: parsedRecords.error };
  }

  const records = parsedRecords.records.filter((record) =>
    record.some((value) => value.trim().length > 0),
  );

  if (records.length === 0) {
    return { error: "The file is empty. Add customer rows and try again." };
  }

  const header = records[0]!.map(normalizeHeader);
  const missingColumns = CUSTOMER_IMPORT_COLUMNS.filter(
    (column) => !header.includes(column),
  );

  if (missingColumns.length > 0) {
    return {
      error: `The CSV is missing required columns: ${missingColumns.join(", ")}. Download the template and try again.`,
    };
  }

  const columnIndexes = Object.fromEntries(
    CUSTOMER_IMPORT_COLUMNS.map((column) => [column, header.indexOf(column)]),
  ) as Record<CustomerImportColumn, number>;

  const dataRecords = records.slice(1);

  if (dataRecords.length === 0) {
    return {
      error: "No customer rows were found. Add at least one row below the header.",
    };
  }

  const rowLimitError = getCustomerImportRowLimitError(dataRecords.length);
  if (rowLimitError) {
    return { error: rowLimitError };
  }

  const rows: CustomerImportRowInput[] = dataRecords.map((record, index) => {
    const getValue = (column: CustomerImportColumn) =>
      (record[columnIndexes[column]] ?? "").trim();

    return {
      rowNumber: index + 2,
      name: getValue("name"),
      phone: getValue("phone"),
      email: getValue("email"),
      address: getValue("address"),
      city: getValue("city"),
      state: getValue("state"),
      zip: getValue("zip"),
    };
  });

  return { rows };
}
