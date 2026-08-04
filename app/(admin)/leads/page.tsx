import { redirect } from "next/navigation";
import { buildCustomersHubHrefFromLeadsParams } from "@/shared/lib/customers/customers-hub";

type LeadsPageProps = {
  searchParams: Promise<{
    selected?: string;
    create?: string;
    status?: string;
    filter?: string;
    queue?: string;
  }>;
};

/** Legacy /leads route — redirects into Customers hub Lead Pipeline tab. */
export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;
  redirect(buildCustomersHubHrefFromLeadsParams(params));
}
