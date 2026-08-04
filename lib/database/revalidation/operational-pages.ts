import { revalidatePath } from "next/cache";

export function revalidateOperationalDashboard(): void {
  revalidatePath("/");
}

export function revalidateJobOperationalPages(jobId?: string): void {
  revalidatePath("/work");
  revalidatePath("/dispatch");
  revalidatePath("/time");
  revalidateOperationalDashboard();
  if (jobId) {
    revalidatePath(`/work/${jobId}`);
  }
}

export function revalidateEstimateOperationalPages(estimateId?: string): void {
  revalidatePath("/sales");
  revalidatePath("/estimates");
  revalidatePath("/invoices");
  revalidateOperationalDashboard();
  if (estimateId) {
    revalidatePath(`/estimates/${estimateId}`);
  }
}

export function revalidateInvoiceOperationalPages(invoiceId?: string): void {
  revalidatePath("/sales");
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidateOperationalDashboard();
  if (invoiceId) {
    revalidatePath(`/invoices/${invoiceId}`);
  }
}

export function revalidateExpenseOperationalPages(): void {
  revalidatePath("/expenses");
  revalidateOperationalDashboard();
}

export function revalidateServiceItemOperationalPages(): void {
  revalidatePath("/price-book");
  revalidatePath("/sales");
  revalidatePath("/estimates");
  revalidateOperationalDashboard();
}
