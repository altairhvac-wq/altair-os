import { redirect } from "next/navigation";
import {
  buildWorkHubHrefFromJobsParams,
  flattenSearchParamRecord,
} from "@/shared/lib/work/work-hub";

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /jobs route — redirects into the Work hub, preserving query params. */
export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  redirect(buildWorkHubHrefFromJobsParams(flattenSearchParamRecord(params)));
}
