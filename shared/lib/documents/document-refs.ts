/** Lightweight invoice identity for relationship-aware search/display. */
export type InvoiceDocumentRef = {
  id: string;
  invoiceNumber: string;
  estimateId?: string;
  jobId?: string;
};
