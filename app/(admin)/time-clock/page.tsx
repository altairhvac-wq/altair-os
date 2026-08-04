import { redirect } from "next/navigation";
import {
  buildTeamHubHrefFromTimeClockParams,
  flattenSearchParamRecord,
} from "@/shared/lib/team/team-hub";

type TimeClockPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /time-clock route — redirects into Team hub Time Clock tab. */
export default async function TimeClockPage({
  searchParams,
}: TimeClockPageProps) {
  const params = await searchParams;
  redirect(
    buildTeamHubHrefFromTimeClockParams(flattenSearchParamRecord(params)),
  );
}
