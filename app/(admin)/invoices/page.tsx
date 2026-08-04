import { redirect } from "next/navigation";
import {
  buildSalesHubHrefFromInvoicesParams,
  flattenSearchParamRecord,
} from "@/shared/lib/sales/sales-hub";

type InvoicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /invoices list route — redirects into Sales hub Invoices tab. */
export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;
  redirect(
    buildSalesHubHrefFromInvoicesParams(flattenSearchParamRecord(params)),
  );
}
