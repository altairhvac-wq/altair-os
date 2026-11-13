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
  "address_line2",
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
  address_line2: "Apt / suite (address line 2)",
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
  "address_line2",
  "city",
  "state",
  "zip",
  "notes",
];

/**
 * Header names matched on any source. Matching is exact after normalising case,
 * spaces, dashes and underscores, so each common spelling has to be listed.
 *
 * The retention audit (2026-11-12) imported a Housecall Pro style file on the
 * default "Other CSV" source: "Mobile Number" was not recognised, every
 * customer came in without a phone, and "Customer Notes" and "Street Line 2"
 * were dropped. The extra names below are the ones field-service and
 * accounting exports actually use.
 */
const COMMON_FIELD_ALIASES: Record<CustomerImportAltairField, string[]> = {
  name: [
    "name",
    "customer name",
    "full name",
    "customer",
    "contact name",
    "display name",
    "client name",
    "customer full name",
    "client",
  ],
  first_name: ["first name", "first", "fname", "given name", "contact first name"],
  last_name: ["last name", "last", "lname", "surname", "family name", "contact last name"],
  company_name: [
    "company",
    "company name",
    "business name",
    "organization",
    "business",
    "organization name",
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
    "mobile number",
    "mobile phone",
    "mobile phone number",
    "cell phone",
    "cell number",
    "cell phone number",
    "home number",
    "home phone number",
    "work number",
    "work phone number",
    "main phone",
    "main phone number",
    "primary phone number",
    "phone 1",
    "phone1",
    "phone number 1",
    "telephone number",
    "contact phone",
    "phone #",
    "mobile #",
  ],
  email: [
    "email",
    "email address",
    "e mail",
    "e-mail",
    "email 1",
    "email address 1",
    "primary email",
    "primary email address",
    "main email",
    "contact email",
    "e mail address",
  ],
  address: [
    "address",
    "street",
    "street address",
    "address 1",
    "address line 1",
    "service address",
    "billing address",
    "address1",
    "street 1",
    "street line 1",
    "street address 1",
    "service address line 1",
    "property address",
    "service street",
    "billing street",
  ],
  address_line2: [
    "address 2",
    "address2",
    "address line 2",
    "street 2",
    "street line 2",
    "street address 2",
    "service address line 2",
    "billing address line 2",
    "apt",
    "apt / suite",
    "apartment",
    "suite",
  ],
  city: ["city", "town", "service city", "billing city", "property city"],
  state: [
    "state",
    "province",
    "st",
    "state / province",
    "state/province",
    "service state",
    "billing state",
    "property state",
  ],
  zip: [
    "zip",
    "zip code",
    "postal code",
    "postcode",
    "zipcode",
    "zip / postal code",
    "zip/postal code",
    "postal",
    "service zip",
    "billing zip",
    "property zip",
  ],
  notes: [
    "notes",
    "note",
    "comments",
    "memo",
    "description",
    "customer notes",
    "customer note",
    "client notes",
    "internal notes",
    "private notes",
    "notes 1",
  ],
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
    address_line2: null,
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
  address_line2: string;
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
    address_line2: getValueForHeader(record, headers, mapping.address_line2),
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
      // Customers keep one street line, so an apartment or suite number from
      // a second address column is appended rather than dropped.
      address: [values.address.trim(), values.address_line2.trim()]
        .filter(Boolean)
        .join(", "),
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

export type CustomerImportMappingGaps = {
  /** Plain-language warnings, most serious first. */
  warnings: string[];
  /** CSV columns that will not be imported anywhere. */
  unmappedHeaders: string[];
};

/**
 * What the column matching will silently leave behind, said before the import
 * runs rather than discovered afterwards. A file whose phone column was not
 * matched imported every customer without a phone number, and the matching
 * step showed nothing but a row of dropdowns (retention audit 2026-11-12).
 */
export function describeCustomerImportMappingGaps(
  mapping: CustomerImportFieldMapping,
  headers: string[],
): CustomerImportMappingGaps {
  const warnings: string[] = [];

  if (!mapping.phone && !mapping.email) {
    warnings.push(
      "No column is matched to Phone or Email. Every customer needs one of them, so nothing will import until you pick a phone or email column.",
    );
  } else if (!mapping.phone) {
    warnings.push(
      "No column is matched to Phone. Customers will import without phone numbers, so technicians cannot call them from the job. Pick your phone column above if the file has one.",
    );
  } else if (!mapping.email) {
    warnings.push(
      "No column is matched to Email. Estimates and invoices cannot be emailed to these customers until an email is added.",
    );
  }

  if (!mapping.name && !mapping.first_name && !mapping.last_name && !mapping.company_name) {
    warnings.push(
      "No column is matched to a customer name, first and last name, or company. Rows without a name are skipped.",
    );
  }

  if (!mapping.address) {
    warnings.push(
      "No column is matched to Street address. Customers will import without a service address, and each one will need it before the first visit.",
    );
  }

  const used = new Set(
    Object.values(mapping).filter((value): value is string => Boolean(value)),
  );
  const unmappedHeaders = headers.filter(
    (header) => header.trim() && !used.has(header),
  );

  return { warnings, unmappedHeaders };
}
