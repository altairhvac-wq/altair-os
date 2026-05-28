import type { Json } from "@/lib/database/types/enums";
import {
  addDaysToDateOnly,
  getCompanyTimeZone,
  getDateOnlyInTimeZone,
} from "@/shared/lib/datetime";
import {
  ESTIMATE_VALIDITY_DAYS,
  type EstimateFormData,
} from "@/shared/types/estimate";
import {
  INVOICE_DUE_DAYS,
  type InvoiceFormData,
} from "@/shared/types/invoice";

export type CompanyBillingDefaults = {
  defaultTaxRate: number;
  defaultPaymentTermsDays: number;
  defaultEstimateNotes: string;
  defaultInvoiceNotes: string;
  defaultEstimateExpirationDays: number;
  defaultInvoiceDueDays: number;
};

export type CompanyBillingDefaultsInput = {
  defaultTaxRate: string | number;
  defaultPaymentTermsDays: string | number;
  defaultEstimateExpirationDays: string | number;
  defaultEstimateNotes: string;
  defaultInvoiceNotes: string;
};

const BILLING_DEFAULTS_KEYS = [
  "defaultTaxRate",
  "defaultPaymentTermsDays",
  "defaultEstimateNotes",
  "defaultInvoiceNotes",
  "defaultEstimateExpirationDays",
  "defaultInvoiceDueDays",
] as const;

export const COMPANY_BILLING_DEFAULTS_FALLBACK: CompanyBillingDefaults = {
  defaultTaxRate: 0,
  defaultPaymentTermsDays: INVOICE_DUE_DAYS,
  defaultEstimateNotes: "",
  defaultInvoiceNotes: "",
  defaultEstimateExpirationDays: ESTIMATE_VALIDITY_DAYS,
  defaultInvoiceDueDays: INVOICE_DUE_DAYS,
};

const MAX_NOTES_LENGTH = 5000;
const MIN_DAY_COUNT = 1;
const MAX_DAY_COUNT = 365;
const MIN_TAX_RATE = 0;
const MAX_TAX_RATE = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptionalNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.round(parsed * 100) / 100;
  return Math.min(max, Math.max(min, rounded));
}

function parseOptionalNotes(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_NOTES_LENGTH);
}

function parseOptionalDayCount(value: unknown, fallback: number): number {
  const parsed = parseOptionalNumber(value, fallback, MIN_DAY_COUNT, MAX_DAY_COUNT);
  return Math.round(parsed);
}

export function parseCompanyBillingDefaults(
  settings: Json | null | undefined,
): CompanyBillingDefaults {
  const fallback = COMPANY_BILLING_DEFAULTS_FALLBACK;

  if (!isRecord(settings)) {
    return { ...fallback };
  }

  const paymentTermsDays = parseOptionalDayCount(
    settings.defaultPaymentTermsDays,
    fallback.defaultPaymentTermsDays,
  );

  return {
    defaultTaxRate: parseOptionalNumber(
      settings.defaultTaxRate,
      fallback.defaultTaxRate,
      MIN_TAX_RATE,
      MAX_TAX_RATE,
    ),
    defaultPaymentTermsDays: paymentTermsDays,
    defaultEstimateNotes: parseOptionalNotes(settings.defaultEstimateNotes),
    defaultInvoiceNotes: parseOptionalNotes(settings.defaultInvoiceNotes),
    defaultEstimateExpirationDays: parseOptionalDayCount(
      settings.defaultEstimateExpirationDays,
      fallback.defaultEstimateExpirationDays,
    ),
    defaultInvoiceDueDays: parseOptionalDayCount(
      settings.defaultInvoiceDueDays ?? settings.defaultPaymentTermsDays,
      paymentTermsDays,
    ),
  };
}

function parseInputNumber(
  value: string | number,
  label: string,
  min: number,
  max: number,
  allowDecimals = false,
): { value?: number; error?: string } {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return { error: `${label} is required.` };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { error: `${label} must be a valid number.` };
  }

  if (!allowDecimals && !Number.isInteger(parsed)) {
    return { error: `${label} must be a whole number.` };
  }

  if (parsed < min || parsed > max) {
    return { error: `${label} must be between ${min} and ${max}.` };
  }

  const normalized = allowDecimals
    ? Math.round(parsed * 100) / 100
    : Math.round(parsed);

  return { value: normalized };
}

export function validateCompanyBillingDefaultsInput(
  input: CompanyBillingDefaultsInput,
): { data?: CompanyBillingDefaults; error?: string } {
  const taxRateResult = parseInputNumber(
    input.defaultTaxRate,
    "Default tax rate",
    MIN_TAX_RATE,
    MAX_TAX_RATE,
    true,
  );
  if (taxRateResult.error) {
    return { error: taxRateResult.error };
  }

  const paymentTermsResult = parseInputNumber(
    input.defaultPaymentTermsDays,
    "Invoice payment terms",
    MIN_DAY_COUNT,
    MAX_DAY_COUNT,
  );
  if (paymentTermsResult.error) {
    return { error: paymentTermsResult.error };
  }

  const estimateExpirationResult = parseInputNumber(
    input.defaultEstimateExpirationDays,
    "Estimate validity",
    MIN_DAY_COUNT,
    MAX_DAY_COUNT,
  );
  if (estimateExpirationResult.error) {
    return { error: estimateExpirationResult.error };
  }

  const estimateNotes = parseOptionalNotes(input.defaultEstimateNotes);
  const invoiceNotes = parseOptionalNotes(input.defaultInvoiceNotes);

  return {
    data: {
      defaultTaxRate: taxRateResult.value ?? 0,
      defaultPaymentTermsDays: paymentTermsResult.value ?? INVOICE_DUE_DAYS,
      defaultEstimateNotes: estimateNotes,
      defaultInvoiceNotes: invoiceNotes,
      defaultEstimateExpirationDays:
        estimateExpirationResult.value ?? ESTIMATE_VALIDITY_DAYS,
      defaultInvoiceDueDays: paymentTermsResult.value ?? INVOICE_DUE_DAYS,
    },
  };
}

export function serializeCompanyBillingDefaultsPatch(
  defaults: CompanyBillingDefaults,
): Record<string, Json> {
  return {
    defaultTaxRate: defaults.defaultTaxRate,
    defaultPaymentTermsDays: defaults.defaultPaymentTermsDays,
    defaultEstimateNotes: defaults.defaultEstimateNotes,
    defaultInvoiceNotes: defaults.defaultInvoiceNotes,
    defaultEstimateExpirationDays: defaults.defaultEstimateExpirationDays,
    defaultInvoiceDueDays: defaults.defaultInvoiceDueDays,
  };
}

export function companyBillingDefaultsToFormValues(
  defaults: CompanyBillingDefaults,
): CompanyBillingDefaultsInput {
  return {
    defaultTaxRate: String(defaults.defaultTaxRate),
    defaultPaymentTermsDays: String(defaults.defaultPaymentTermsDays),
    defaultEstimateExpirationDays: String(defaults.defaultEstimateExpirationDays),
    defaultEstimateNotes: defaults.defaultEstimateNotes,
    defaultInvoiceNotes: defaults.defaultInvoiceNotes,
  };
}

export function getDefaultValidUntilDateForCompany(
  expirationDays: number,
  fromDate: Date = new Date(),
  timeZone: string = getCompanyTimeZone(),
): string {
  const startDateOnly = getDateOnlyInTimeZone(fromDate, timeZone);
  return addDaysToDateOnly(startDateOnly, expirationDays, timeZone);
}

export function getDefaultDueDateForCompany(
  dueDays: number,
  fromDate: Date = new Date(),
  timeZone: string = getCompanyTimeZone(),
): string {
  const issueDateOnly = getDateOnlyInTimeZone(fromDate, timeZone);
  return addDaysToDateOnly(issueDateOnly, dueDays, timeZone);
}

export function applyEstimateCreationDefaults(
  data: EstimateFormData,
  defaults: CompanyBillingDefaults,
  timeZone?: string,
): EstimateFormData {
  const resolvedTimeZone = timeZone ?? getCompanyTimeZone();
  const notes = data.notes.trim() || defaults.defaultEstimateNotes;
  const validUntil =
    data.validUntil.trim() ||
    getDefaultValidUntilDateForCompany(
      defaults.defaultEstimateExpirationDays,
      new Date(),
      resolvedTimeZone,
    );

  return {
    ...data,
    notes,
    validUntil,
    taxRate: data.taxRate,
  };
}

export function applyInvoiceCreationDefaults(
  data: InvoiceFormData,
  defaults: CompanyBillingDefaults,
  timeZone?: string,
): InvoiceFormData {
  const resolvedTimeZone = timeZone ?? getCompanyTimeZone();
  const notes = data.notes.trim() || defaults.defaultInvoiceNotes;
  const issueDate =
    data.issueDate.trim() ||
    getDateOnlyInTimeZone(new Date(), resolvedTimeZone);
  const dueDate =
    data.dueDate.trim() ||
    getDefaultDueDateForCompany(
      defaults.defaultInvoiceDueDays,
      new Date(),
      resolvedTimeZone,
    );

  return {
    ...data,
    notes,
    issueDate,
    dueDate,
    taxRate: data.taxRate,
  };
}

export function getEstimateCreateInitialData(
  defaults: CompanyBillingDefaults,
  timeZone: string,
  prefill?: Partial<EstimateFormData>,
): Partial<EstimateFormData> {
  return {
    ...prefill,
    taxRate: prefill?.taxRate ?? defaults.defaultTaxRate,
    notes: prefill?.notes ?? defaults.defaultEstimateNotes,
    validUntil:
      prefill?.validUntil ??
      getDefaultValidUntilDateForCompany(
        defaults.defaultEstimateExpirationDays,
        new Date(),
        timeZone,
      ),
  };
}

export function getInvoiceCreateInitialData(
  defaults: CompanyBillingDefaults,
  timeZone: string,
  prefill?: Partial<InvoiceFormData>,
): Partial<InvoiceFormData> {
  const issueDate =
    prefill?.issueDate ?? getDateOnlyInTimeZone(new Date(), timeZone);

  return {
    ...prefill,
    taxRate: prefill?.taxRate ?? defaults.defaultTaxRate,
    notes: prefill?.notes ?? defaults.defaultInvoiceNotes,
    issueDate,
    dueDate:
      prefill?.dueDate ??
      getDefaultDueDateForCompany(defaults.defaultInvoiceDueDays, new Date(), timeZone),
  };
}

export function billingDefaultsSettingsKeys(): readonly string[] {
  return BILLING_DEFAULTS_KEYS;
}

export function hasSavedCompanyBillingDefaults(
  settings: Json | null | undefined,
): boolean {
  if (!isRecord(settings)) {
    return false;
  }

  return BILLING_DEFAULTS_KEYS.some((key) => key in settings);
}
