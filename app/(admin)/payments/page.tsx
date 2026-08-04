import { redirect } from "next/navigation";
import {
  buildSalesHubHrefFromPaymentsParams,
  flattenSearchParamRecord,
} from "@/shared/lib/sales/sales-hub";

type PaymentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /payments list route — redirects into Sales hub Payments tab. */
export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  const params = await searchParams;
  redirect(
    buildSalesHubHrefFromPaymentsParams(flattenSearchParamRecord(params)),
  );
}
