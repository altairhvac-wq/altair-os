"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  createCustomer,
  createCustomersBulk,
  listCustomerImportContacts,
} from "@/lib/database/queries/customers";
import { recordCustomerActivities } from "@/lib/database/queries/customer-activities";
import type { Customer } from "@/shared/types/customer";
import {
  classifyCustomerImportRows,
  getCustomerImportFileSizeError,
  getCustomerImportRowLimitError,
  mapCustomerImportCsvWithMapping,
  parseCustomerImportCsv,
  sanitizeCustomerImportRows,
  type CustomerImportFieldMapping,
  type CustomerImportRowInput,
} from "@/shared/lib/customer-import";

export type CustomerImportResultRow = {
  rowNumber: number;
  customerName: string;
  message?: string;
  customerId?: string;
};

export type ImportCustomersFromCsvActionResult = {
  error?: string;
  importedRows: CustomerImportResultRow[];
  skippedRows: CustomerImportResultRow[];
  errorRows: CustomerImportResultRow[];
};

function revalidateCustomerPaths() {
  revalidatePath("/customers");
  revalidatePath("/work");
  revalidatePath("/estimates");
  revalidatePath("/invoices");
  revalidatePath("/sales");
}

async function importCustomersFromCsvRows(
  rows: CustomerImportRowInput[],
): Promise<ImportCustomersFromCsvActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      error: NO_ACTIVE_COMPANY_MESSAGE,
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  if (!context.permissions.manageCustomers) {
    return {
      error: "You do not have permission to import customers.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  if (rows.length === 0) {
    return {
      error: "No customer rows were provided.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const sanitizedRows = sanitizeCustomerImportRows(rows);
  const rowLimitError = getCustomerImportRowLimitError(sanitizedRows.length);
  if (rowLimitError) {
    return {
      error: rowLimitError,
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const { contacts: existingContacts, error: contactsError } =
    await listCustomerImportContacts(context.company.id);

  if (contactsError) {
    return {
      error:
        "We couldn't verify existing customers right now. Try again in a moment.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const classifiedRows = classifyCustomerImportRows(
    sanitizedRows,
    existingContacts,
  );

  const importedRows: CustomerImportResultRow[] = [];
  const skippedRows: CustomerImportResultRow[] = [];
  const errorRows: CustomerImportResultRow[] = [];

  // ============================== ONE INSERT PER BATCH ==============================
  // Every row was already checked against the company's full contact list
  // (listCustomerImportContacts) and against the rows above it in this file,
  // so ready rows go in with one INSERT and their activity rows with a second.
  // Row by row this took about four database round trips per customer: 5.4
  // minutes for 1,200 customers from a local machine (2026-11-26).
  const readyRows: { rowNumber: number; name: string; formData: NonNullable<(typeof classifiedRows)[number]["formData"]> }[] = [];

  for (const row of classifiedRows) {
    if (row.status === "error") {
      errorRows.push({
        rowNumber: row.rowNumber,
        customerName: row.name,
        message: row.message ?? "Invalid row.",
      });
      continue;
    }

    if (row.status === "duplicate") {
      skippedRows.push({
        rowNumber: row.rowNumber,
        customerName: row.name,
        message: row.message ?? "Skipped duplicate.",
      });
      continue;
    }

    if (!row.formData) {
      errorRows.push({
        rowNumber: row.rowNumber,
        customerName: row.name,
        message: "Could not prepare this customer row.",
      });
      continue;
    }

    readyRows.push({ rowNumber: row.rowNumber, name: row.name, formData: row.formData });
  }

  const created: { rowNumber: number; customer: Customer }[] = [];
  const bulk = await createCustomersBulk(
    context.company.id,
    readyRows.map((row) => row.formData),
  );

  if (!bulk.error && bulk.customers.length === readyRows.length) {
    bulk.customers.forEach((customer, index) => {
      created.push({ rowNumber: readyRows[index]!.rowNumber, customer });
    });
  } else {
    // One bad row fails the whole statement. Fall back to one insert per row
    // so the good rows still come in and the bad one is named.
    for (const row of readyRows) {
      const { customer, error } = await createCustomer(context.company.id, row.formData);
      if (error || !customer) {
        errorRows.push({
          rowNumber: row.rowNumber,
          customerName: row.name,
          message: error ?? "Could not create customer.",
        });
        continue;
      }
      created.push({ rowNumber: row.rowNumber, customer });
    }
  }

  const { error: activityError } = await recordCustomerActivities(
    created.map(({ customer }) => ({
      company_id: context.company.id,
      customer_id: customer.id,
      actor_id: context.user.id,
      event_type: "customer_created" as const,
      metadata: { customer_name: customer.name, status: customer.status },
    })),
  );
  if (activityError) {
    // The customers are saved; only their "created" timeline entries are missing.
    console.error("[importCustomersFromCsvRows] activity rows not recorded", {
      companyId: context.company.id,
      count: created.length,
    });
  }

  for (const { rowNumber, customer } of created) {
    importedRows.push({
      rowNumber,
      customerName: customer.name,
      customerId: customer.id,
    });
  }

  if (importedRows.length > 0) {
    revalidateCustomerPaths();
  }

  return {
    importedRows,
    skippedRows,
    errorRows,
  };
}

export async function importCustomersFromMappedCsvAction(
  csvText: string,
  mapping: CustomerImportFieldMapping,
): Promise<ImportCustomersFromCsvActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      error: NO_ACTIVE_COMPANY_MESSAGE,
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  if (!context.permissions.manageCustomers) {
    return {
      error: "You do not have permission to import customers.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const trimmedCsv = csvText.trim();
  if (!trimmedCsv) {
    return {
      error: "No customer rows were provided.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const fileSizeError = getCustomerImportFileSizeError(
    new TextEncoder().encode(trimmedCsv).length,
  );
  if (fileSizeError) {
    return {
      error: fileSizeError,
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const mapped = mapCustomerImportCsvWithMapping(trimmedCsv, mapping);
  if (mapped.error || !mapped.rows) {
    return {
      error: mapped.error ?? "Could not read this CSV file.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  return importCustomersFromCsvRows(mapped.rows);
}

/** V1 exact-template import — kept for backward compatibility. */
export async function importCustomersFromCsvTextAction(
  csvText: string,
): Promise<ImportCustomersFromCsvActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      error: NO_ACTIVE_COMPANY_MESSAGE,
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  if (!context.permissions.manageCustomers) {
    return {
      error: "You do not have permission to import customers.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const trimmedCsv = csvText.trim();
  if (!trimmedCsv) {
    return {
      error: "No customer rows were provided.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const fileSizeError = getCustomerImportFileSizeError(
    new TextEncoder().encode(trimmedCsv).length,
  );
  if (fileSizeError) {
    return {
      error: fileSizeError,
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  const parsed = parseCustomerImportCsv(trimmedCsv);

  if (parsed.error || !parsed.rows) {
    return {
      error: parsed.error ?? "Could not read this CSV file.",
      importedRows: [],
      skippedRows: [],
      errorRows: [],
    };
  }

  return importCustomersFromCsvRows(parsed.rows);
}
