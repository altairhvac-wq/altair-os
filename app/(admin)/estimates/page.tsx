import { redirect } from "next/navigation";
import {
  buildSalesHubHrefFromEstimatesParams,
  flattenSearchParamRecord,
} from "@/shared/lib/sales/sales-hub";

type EstimatesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /estimates list route — redirects into Sales hub Estimates tab. */
export default async function EstimatesPage({
  searchParams,
}: EstimatesPageProps) {
  const params = await searchParams;
  redirect(
    buildSalesHubHrefFromEstimatesParams(flattenSearchParamRecord(params)),
  );
}
