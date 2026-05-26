import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getDashboardData } from "@/lib/database/services/dashboard";
import { OperationalDashboardView } from "@/shared/components/dashboard/OperationalDashboardView";

export default async function DashboardPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const data = await getDashboardData(companyContext);

  return <OperationalDashboardView data={data} />;
}
