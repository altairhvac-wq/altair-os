import { redirect } from "next/navigation";
import {
  buildTeamHubHrefFromTechniciansParams,
  flattenSearchParamRecord,
} from "@/shared/lib/team/team-hub";

type TechniciansPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy /technicians route — redirects into Team hub Technicians tab. */
export default async function TechniciansPage({
  searchParams,
}: TechniciansPageProps) {
  const params = await searchParams;
  redirect(
    buildTeamHubHrefFromTechniciansParams(flattenSearchParamRecord(params)),
  );
}
