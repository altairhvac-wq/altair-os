import {
  getValueForHeader,
  normalizeCsvHeader,
  type ParsedCustomerImportCsv,
} from "@/shared/lib/customer-import-parser";

export const CUSTOMER_IMPORT_MAX_ROWS = 500;

export const CUSTOMER_IMPORT_ALTAIR_FIELDS = [
  "name",
  "first_name",
  "last_name",
  "company_name",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "zip",
  "notes",
] as const;

export type CustomerImportAltairField =
  (typeof CUSTOMER_IMPORT_ALTAIR_FIELDS)[number];

export type CustomerImportFieldMapping = Record<
  CustomerImportAltairField,
  string | null
>;

export type CustomerImportPreset =
  | "altair"
  | "google_sheets"
  | "servicetitan"
  | "housecall_pro"
  | "jobber"
  | "quickbooks"
  | "other";

export const CUSTOMER_IMPORT_PRESET_OPTIONS: {
  value: CustomerImportPreset;
  label: string;
}[] = [
  { value: "altair", label: "Altair template" },
  { value: "google_sheets", label: "Google Sheets / Excel" },
  { value: "servicetitan", label: "ServiceTitan CSV export" },
  { value: "housecall_pro", label: "Housecall Pro CSV export" },
  { value: "jobber", label: "Jobber CSV export" },
  { value: "quickbooks", label: "QuickBooks customer CSV" },
  { value: "other", label: "Other CSV" },
];

export const CUSTOMER_IMPORT_FIELD_LABELS: Record<
  CustomerImportAltairField,
  string
> = {
  name: "Customer name (full)",
  first_name: "First name",
  last_name: "Last name",
  company_name: "Company name",
  phone: "Phone",
  email: "Email",
  address: "Street address",
  city: "City",
  state: "State",
  zip: "ZIP / postal code",
  notes: "Notes",
};

const FIELD_MAPPING_PRIORITY: CustomerImportAltairField[] = [
  "name",
  "first_name",
  "last_name",
  "company_name",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "zip",
  "notes",
];

const COMMON_FIELD_ALIASES: Record<CustomerImportAltairField, string[]> = {
  name: [
    "name",
    "customer name",
    "full name",
    "customer",
    "contact name",
    "display name",
    "client name",
  ],
  first_name: ["first name", "first", "fname", "given name"],
  last_name: ["last name", "last", "lname", "surname", "family name"],
  company_name: [
    "company",
    "company name",
    "business name",
    "organization",
    "business",
  ],
  phone: [
    "phone",
    "mobile",
    "cell",
    "phone number",
    "primary phone",
    "home phone",
    "work phone",
    "telephone",
  ],
  email: ["email", "email address", "e mail", "e-mail"],
  address: [
    "address",
    "street",
    "street address",
    "address 1",
    "address line 1",
    "service address",
    "billing address",
  ],
  city: ["city", "town"],
  state: ["state", "province", "st"],
  zip: ["zip", "zip code", "postal code", "postcode"],
  notes: ["notes", "note", "comments", "memo", "description"],
};

const PRESET_FIELD_ALIASES: Partial<
  Record<CustomerImportPreset, Partial<Record<CustomerImportAltairField, string[]>>>
> = {
  altair: {
    name: ["name", "customer name"],
    phone: ["phone"],
    email: ["email"],
    address: ["address"],
    city: ["city"],
    state: ["state"],
    zip: ["zip", "zip code"],
    first_name: ["first name", "first_name"],
    last_name: ["last name", "last_name"],
    company_name: ["company_name", "company name"],
    notes: ["notes"],
  },
  servicetitan: {
    name: ["customer", "customer name", "name on account"],
    phone: ["phone number", "primary phone", "mobile phone"],
    email: ["email address", "primary email"],
    address: ["street", "address", "service location address"],
  },
  housecall_pro: {
    name: ["customer", "display name", "full name"],
    phone: ["mobile number", "phone", "mobile phone"],
    email: ["email", "email address"],
    address: ["address", "street", "service address"],
  },
  jobber: {
    name: ["client name", "name", "display name"],
    phone: ["phone", "mobile", "primary phone"],
    email: ["email", "email address"],
    address: ["property address", "street 1", "street address"],
  },
  quickbooks: {
    name: ["customer", "customer name", "display name"],
    phone: ["phone", "phone number", "mobile"],
    email: ["email", "email address"],
    address: ["billing address line 1", "ship address line 1", "address"],
    city: ["billing address city", "ship address city", "city"],
    state: ["billing address state", "ship address state", "state"],
    zip: ["billing address postal code", "ship address postal code", "zip"],
  },
};

export type CustomerImportRowInput = {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  company: string;
};

function getCustomerImportRowLimitError(rowCount: number): string | null {
  if (rowCount > CUSTOMER_IMPORT_MAX_ROWS) {
    return `This file has ${rowCount} rows. Import up to ${CUSTOMER_IMPORT_MAX_ROWS} customers at a time.`;
  }

  return null;
}

export function createEmptyCustomerImportFieldMapping(): CustomerImportFieldMapping {
  return {
    name: null,
    first_name: null,
    last_name: null,
    company_name: null,
    phone: null,
    email: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    notes: null,
  };
}

function getAliasesForField(
  field: CustomerImportAltairField,
  preset: CustomerImportPreset,
): string[] {
  const presetAliases = PRESET_FIELD_ALIASES[preset]?.[field] ?? [];
  const commonAliases = COMMON_FIELD_ALIASES[field];

  return [...new Set([...presetAliases, ...commonAliases])].map(normalizeCsvHeader);
}

export function suggestCustomerImportFieldMapping(
  headers: string[],
  preset: CustomerImportPreset = "other",
): CustomerImportFieldMapping {
  const mapping = createEmptyCustomerImportFieldMapping();
  const usedHeaders = new Set<string>();

  for (const field of FIELD_MAPPING_PRIORITY) {
    const aliases = getAliasesForField(field, preset);

    for (const header of headers) {
      if (usedHeaders.has(header)) {
        continue;
      }

      const normalizedHeader = normalizeCsvHeader(header);
      if (aliases.includes(normalizedHeader)) {
        mapping[field] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  return mapping;
}

export type MappedImportRowValues = {
  name: string;
  first_name: string;
  last_name: string;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
};

export function extractMappedRowValues(
  record: string[],
  headers: string[],
  mapping: CustomerImportFieldMapping,
): MappedImportRowValues {
  return {
    name: getValueForHeader(record, headers, mapping.name),
    first_name: getValueForHeader(record, headers, mapping.first_name),
    last_name: getValueForHeader(record, headers, mapping.last_name),
    company_name: getValueForHeader(record, headers, mapping.company_name),
    phone: getValueForHeader(record, headers, mapping.phone),
    email: getValueForHeader(record, headers, mapping.email),
    address: getValueForHeader(record, headers, mapping.address),
    city: getValueForHeader(record, headers, mapping.city),
    state: getValueForHeader(record, headers, mapping.state),
    zip: getValueForHeader(record, headers, mapping.zip),
    notes: getValueForHeader(record, headers, mapping.notes),
  };
}

export function buildCustomerNameFromMappedValues(values: MappedImportRowValues): {
  name: string;
  company: string;
  notes: string;
} {
  const fullName = values.name.trim();
  const firstName = values.first_name.trim();
  const lastName = values.last_name.trim();
  const companyName = values.company_name.trim();
  const notes = values.notes.trim();

  let personName = fullName;
  if (!personName && (firstName || lastName)) {
    personName = [firstName, lastName].filter(Boolean).join(" ");
  }

  if (!personName && companyName) {
    return {
      name: companyName,
      company: "",
      notes,
    };
  }

  if (personName && companyName) {
    return {
      name: personName,
      company: companyName,
      notes,
    };
  }

  return {
    name: personName,
    company: "",
    notes,
  };
}

export function mapCsvRecordsToImportRowsWithCompany(
  parsed: ParsedCustomerImportCsv,
  mapping: CustomerImportFieldMapping,
): {
  error?: string;
  rows?: CustomerImportRowInput[];
} {
  const rowLimitError = getCustomerImportRowLimitError(parsed.dataRecords.length);
  if (rowLimitError) {
    return { error: rowLimitError };
  }

  const rows: CustomerImportRowInput[] = parsed.dataRecords.map((record, index) => {
    const values = extractMappedRowValues(record, parsed.headers, mapping);
    const built = buildCustomerNameFromMappedValues(values);

    return {
      rowNumber: index + 2,
      name: built.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
      city: values.city,
      state: values.state,
      zip: values.zip,
      notes: built.notes,
      company: built.company,
    };
  });

  return { rows };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeCustomerImportFieldMapping(
  mapping: CustomerImportFieldMapping,
  headers: string[],
): CustomerImportFieldMapping {
  const headerSet = new Set(headers);
  const sanitized = createEmptyCustomerImportFieldMapping();
  const usedHeaders = new Set<string>();
  const source: Record<string, unknown> = isPlainObject(mapping) ? mapping : {};

  for (const field of CUSTOMER_IMPORT_ALTAIR_FIELDS) {
    const value = source[field];
    if (
      typeof value === "string" &&
      headerSet.has(value) &&
      !usedHeaders.has(value)
    ) {
      sanitized[field] = value;
      usedHeaders.add(value);
      continue;
    }

    sanitized[field] = null;
  }

  return sanitized;
}
