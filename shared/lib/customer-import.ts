import { normalizePhoneDigits, phonesMatch } from "@/shared/lib/phone";
import {
  parseCustomerImportCsvRaw,
  parseCsvRecords,
  normalizeCsvHeader,
} from "@/shared/lib/customer-import-parser";
import {
  mapCsvRecordsToImportRowsWithCompany,
  sanitizeCustomerImportFieldMapping,
  type CustomerImportFieldMapping,
  type CustomerImportRowInput,
} from "@/shared/lib/customer-import-mapping";
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

export const CUSTOMER_IMPORT_PREVIEW_ROW_LIMIT = 25;

export const CUSTOMER_IMPORT_TEMPLATE_CSV = `name,phone,email,address,city,state,zip
John Smith,8015551234,john@example.com,123 Main St,Draper,UT,84020`;

export const CUSTOMER_IMPORT_ADVANCED_TEMPLATE_CSV = `name,first_name,last_name,company_name,phone,email,address,city,state,zip,notes
John Smith,John,Smith,,8015551234,john@example.com,123 Main St,Draper,UT,84020,VIP customer
Acme Plumbing,,,Acme Plumbing,8015555678,office@acme.example.com,456 Oak Ave,Salt Lake City,UT,84101,Commercial account`;

export type { CustomerImportRowInput } from "@/shared/lib/customer-import-mapping";
export type {
  CustomerImportAltairField,
  CustomerImportFieldMapping,
  CustomerImportPreset,
} from "@/shared/lib/customer-import-mapping";
export {
  CUSTOMER_IMPORT_ALTAIR_FIELDS,
  CUSTOMER_IMPORT_FIELD_LABELS,
  CUSTOMER_IMPORT_PRESET_OPTIONS,
  createEmptyCustomerImportFieldMapping,
  suggestCustomerImportFieldMapping,
  sanitizeCustomerImportFieldMapping,
} from "@/shared/lib/customer-import-mapping";
export { parseCustomerImportCsvRaw } from "@/shared/lib/customer-import-parser";

export type CustomerImportRowStatus = "ready" | "duplicate" | "error";

export type CustomerImportPreviewRow = {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
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
    notes: String(row?.notes ?? "").trim(),
    company: String(row?.company ?? "").trim(),
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
    company: row.company,
    status: "active",
    notes: row.notes,
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

function getExistingDuplicateReason(
  formData: CustomerFormData,
  existingContacts: CustomerImportContact[],
): string | null {
  const normalizedEmail = normalizeImportEmail(formData.email);

  for (const contact of existingContacts) {
    if (
      normalizedEmail &&
      normalizeImportEmail(contact.email) === normalizedEmail
    ) {
      return "Matches an existing customer (matching email).";
    }

    if (formData.phone && phonesMatch(formData.phone, contact.phone)) {
      return "Matches an existing customer (matching phone).";
    }
  }

  return null;
}

function getBatchDuplicateReason(
  formData: CustomerFormData,
  seenEmails: Set<string>,
  seenPhones: Set<string>,
): string | null {
  const normalizedEmail = normalizeImportEmail(formData.email);
  if (normalizedEmail && seenEmails.has(normalizedEmail)) {
    return "Duplicate contact in this file (matching email).";
  }

  const phoneKey = formData.phone
    ? normalizeImportPhoneKey(formData.phone)
    : null;
  if (phoneKey && seenPhones.has(phoneKey)) {
    return "Duplicate contact in this file (matching phone).";
  }

  return null;
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

  const phoneKey = formData.phone
    ? normalizeImportPhoneKey(formData.phone)
    : null;
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

    const basePreview = {
      rowNumber: row.rowNumber,
      name: displayName,
      phone: row.phone.trim(),
      email: row.email.trim(),
      address: row.address.trim(),
      city: row.city.trim(),
      state: row.state.trim(),
      zip: row.zip.trim(),
      notes: row.notes.trim(),
    };

    if (validationError) {
      return {
        ...basePreview,
        status: "error" as const,
        message: validationError,
      };
    }

    const formData = normalizeCustomerImportFormData(
      buildCustomerFormDataFromImportRow(row),
    );

    const batchDuplicateReason = getBatchDuplicateReason(
      formData,
      seenEmails,
      seenPhones,
    );
    if (batchDuplicateReason) {
      return {
        ...basePreview,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        status: "duplicate" as const,
        message: batchDuplicateReason,
      };
    }

    const existingDuplicateReason = getExistingDuplicateReason(
      formData,
      existingContacts,
    );
    if (existingDuplicateReason) {
      return {
        ...basePreview,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        status: "duplicate" as const,
        message: existingDuplicateReason,
      };
    }

    trackBatchContact(formData, seenEmails, seenPhones);

    return {
      ...basePreview,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      status: "ready" as const,
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

export function mapCustomerImportCsvWithMapping(
  csvText: string,
  mapping: CustomerImportFieldMapping,
): {
  error?: string;
  rows?: CustomerImportRowInput[];
} {
  const parsedResult = parseCustomerImportCsvRaw(csvText);
  if (parsedResult.error || !parsedResult.parsed) {
    return { error: parsedResult.error ?? "Could not read this CSV file." };
  }

  const sanitizedMapping = sanitizeCustomerImportFieldMapping(
    mapping,
    parsedResult.parsed.headers,
  );

  const mapped = mapCsvRecordsToImportRowsWithCompany(
    parsedResult.parsed,
    sanitizedMapping,
  );

  if (mapped.error || !mapped.rows) {
    return { error: mapped.error ?? "Could not map customer rows." };
  }

  return { rows: mapped.rows };
}

/** V1 exact-column parser — kept for backward compatibility with the simple template. */
export function parseCustomerImportCsv(text: string): {
  error?: string;
  rows?: CustomerImportRowInput[];
} {
  const trimmed = text.trim();

  if (!trimmed) {
    return { error: "The file is empty. Add customer rows and try again." };
  }

  const parsedRecords = parseCsvRecords(trimmed.startsWith("\ufeff") ? trimmed.slice(1) : trimmed);
  if (parsedRecords.error) {
    return { error: parsedRecords.error };
  }

  const records = parsedRecords.records.filter((record) =>
    record.some((value) => value.trim().length > 0),
  );

  if (records.length === 0) {
    return { error: "The file is empty. Add customer rows and try again." };
  }

  const header = records[0]!.map(normalizeCsvHeader);
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
      notes: "",
      company: "",
    };
  });

  return { rows };
}
