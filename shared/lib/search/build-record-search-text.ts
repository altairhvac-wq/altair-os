import type { Customer } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { SearchField } from "@/shared/lib/search/rank-search-match";

export type JobSearchRelatedDocuments = {
  estimateNumbers?: string[];
  invoiceNumbers?: string[];
};

export type EstimateSearchRelatedDocuments = {
  invoiceNumbers?: string[];
  serviceAddress?: string | null;
};

function customerFields(
  customer: Customer | undefined,
  options?: { includeAddress?: boolean },
): SearchField[] {
  if (!customer) return [];

  const fields: SearchField[] = [
    { key: "customerName", label: "Customer name", value: customer.name, kind: "name" },
    {
      key: "companyName",
      label: "Company name",
      value: customer.company,
      kind: "name",
    },
    { key: "email", label: "Email", value: customer.email, kind: "email" },
    { key: "phone", label: "Phone", value: customer.phone, kind: "phone" },
  ];

  if (options?.includeAddress !== false) {
    fields.push(
      {
        key: "customerAddress",
        label: "Service address",
        value: customer.address,
        kind: "address",
      },
      { key: "customerCity", label: "City", value: customer.city, kind: "address" },
      { key: "customerState", label: "State", value: customer.state, kind: "address" },
      {
        key: "customerPostal",
        label: "Postal code",
        value: customer.zip,
        kind: "address",
      },
    );
  }

  return fields;
}

export function buildJobSearchFields(
  job: Job,
  customer?: Customer,
  related?: JobSearchRelatedDocuments,
): SearchField[] {
  const fields: SearchField[] = [
    {
      key: "jobNumber",
      label: "Job number",
      value: job.jobNumber,
      kind: "identifier",
    },
    {
      key: "customerName",
      label: "Customer name",
      value: job.customerName,
      kind: "name",
    },
    {
      key: "serviceAddress",
      label: "Service address",
      value: job.serviceAddress,
      kind: "address",
    },
    { key: "city", label: "City", value: job.city, kind: "address" },
    { key: "state", label: "State", value: job.state, kind: "address" },
    { key: "postal", label: "Postal code", value: job.zip, kind: "address" },
    { key: "jobType", label: "Job type", value: job.jobType, kind: "text" },
    {
      key: "technician",
      label: "Technician",
      value: job.assignedTechnician,
      kind: "name",
    },
    { key: "status", label: "Status", value: job.status, kind: "status" },
    {
      key: "description",
      label: "Description",
      value: job.description,
      kind: "text",
    },
  ];

  for (const estimateNumber of related?.estimateNumbers ?? []) {
    fields.push({
      key: `estimate:${estimateNumber}`,
      label: "Estimate number",
      value: estimateNumber,
      kind: "related_identifier",
    });
  }

  for (const invoiceNumber of related?.invoiceNumbers ?? []) {
    fields.push({
      key: `invoice:${invoiceNumber}`,
      label: "Invoice number",
      value: invoiceNumber,
      kind: "related_identifier",
    });
  }

  fields.push(...customerFields(customer, { includeAddress: false }));
  return fields;
}

export function buildEstimateSearchFields(
  estimate: Estimate,
  customer?: Customer,
  related?: EstimateSearchRelatedDocuments,
): SearchField[] {
  const fields: SearchField[] = [
    {
      key: "estimateNumber",
      label: "Estimate number",
      value: estimate.estimateNumber,
      kind: "identifier",
    },
    {
      key: "jobNumber",
      label: "Job number",
      value: estimate.jobNumber,
      kind: "related_identifier",
    },
    {
      key: "customerName",
      label: "Customer name",
      value: estimate.customerName,
      kind: "name",
    },
    {
      key: "email",
      label: "Email",
      value: estimate.customerEmail,
      kind: "email",
    },
    { key: "status", label: "Status", value: estimate.status, kind: "status" },
    { key: "notes", label: "Notes", value: estimate.notes, kind: "text" },
  ];

  if (related?.serviceAddress) {
    fields.push({
      key: "serviceAddress",
      label: "Service address",
      value: related.serviceAddress,
      kind: "address",
    });
  }

  for (const invoiceNumber of related?.invoiceNumbers ?? []) {
    fields.push({
      key: `invoice:${invoiceNumber}`,
      label: "Invoice number",
      value: invoiceNumber,
      kind: "related_identifier",
    });
  }

  for (const item of estimate.lineItems ?? []) {
    if (item.name) {
      fields.push({
        key: `line:${item.id}:name`,
        label: "Line item",
        value: item.name,
        kind: "text",
      });
    }
    if (item.description) {
      fields.push({
        key: `line:${item.id}:description`,
        label: "Line item",
        value: item.description,
        kind: "text",
      });
    }
  }

  fields.push(...customerFields(customer));
  return fields;
}

export function buildInvoiceSearchFields(
  invoice: Invoice,
  customer?: Customer,
  serviceAddress?: string | null,
): SearchField[] {
  const fields: SearchField[] = [
    {
      key: "invoiceNumber",
      label: "Invoice number",
      value: invoice.invoiceNumber,
      kind: "identifier",
    },
    {
      key: "jobNumber",
      label: "Job number",
      value: invoice.jobNumber,
      kind: "related_identifier",
    },
    {
      key: "estimateNumber",
      label: "Estimate number",
      value: invoice.estimateNumber,
      kind: "related_identifier",
    },
    {
      key: "customerName",
      label: "Customer name",
      value: invoice.customerName,
      kind: "name",
    },
    {
      key: "email",
      label: "Email",
      value: invoice.customerEmail,
      kind: "email",
    },
    { key: "status", label: "Status", value: invoice.status, kind: "status" },
    { key: "notes", label: "Notes", value: invoice.notes, kind: "text" },
  ];

  if (serviceAddress) {
    fields.push({
      key: "serviceAddress",
      label: "Service address",
      value: serviceAddress,
      kind: "address",
    });
  }

  for (const item of invoice.lineItems ?? []) {
    if (item.name) {
      fields.push({
        key: `line:${item.id}:name`,
        label: "Line item",
        value: item.name,
        kind: "text",
      });
    }
    if (item.description) {
      fields.push({
        key: `line:${item.id}:description`,
        label: "Line item",
        value: item.description,
        kind: "text",
      });
    }
  }

  fields.push(...customerFields(customer));
  return fields;
}
