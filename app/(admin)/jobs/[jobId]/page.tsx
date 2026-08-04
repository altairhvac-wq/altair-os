import { redirect } from "next/navigation";
import {
  buildWorkJobHrefFromJobsParams,
  flattenSearchParamRecord,
} from "@/shared/lib/work/work-hub";

type LegacyJobDetailPageProps = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /jobs/[jobId] — redirects into the Work hub detail route. */
export default async function LegacyJobDetailPage({
  params,
  searchParams,
}: LegacyJobDetailPageProps) {
  const { jobId } = await params;
  const query = await searchParams;
  redirect(
    buildWorkJobHrefFromJobsParams(jobId, flattenSearchParamRecord(query)),
  );
}
