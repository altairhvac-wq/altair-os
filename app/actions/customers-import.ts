"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  createCustomer,
  findCustomerByContact,
  listCustomerImportContacts,
} from "@/lib/database/queries/customers";
import { recordCustomerCreatedActivity } from "@/lib/database/services/customer-activity";
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
  revalidatePath("/jobs");
  revalidatePath("/estimates");
  revalidatePath("/invoices");
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

    const {
      customer: existingMatch,
      conflict,
      error: contactLookupError,
    } = await findCustomerByContact(context.company.id, {
      email: row.formData.email,
      phone: row.formData.phone,
    });

    if (contactLookupError) {
      errorRows.push({
        rowNumber: row.rowNumber,
        customerName: row.name,
        message: contactLookupError,
      });
      continue;
    }

    if (conflict) {
      errorRows.push({
        rowNumber: row.rowNumber,
        customerName: row.name,
        message: conflict,
      });
      continue;
    }

    if (existingMatch) {
      skippedRows.push({
        rowNumber: row.rowNumber,
        customerName: row.name,
        message: "Matches an existing customer.",
      });
      continue;
    }

    const { customer, error } = await createCustomer(
      context.company.id,
      row.formData,
    );

    if (error || !customer) {
      errorRows.push({
        rowNumber: row.rowNumber,
        customerName: row.name,
        message: error ?? "Could not create customer.",
      });
      continue;
    }

    await recordCustomerCreatedActivity({
      companyId: context.company.id,
      customerId: customer.id,
      actorId: context.user.id,
      customerName: customer.name,
      status: customer.status,
    });

    importedRows.push({
      rowNumber: row.rowNumber,
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
