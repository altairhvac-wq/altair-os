import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listExpensesForTechnician } from "@/lib/database/queries/expenses";
import { TechnicianReceiptsView } from "@/shared/components/technician/TechnicianReceiptsView";

export default async function TechnicianReceiptsPage() {
  const context = await getActiveCompanyContext();

  if (!context) {
    redirect("/setup");
  }

  const expenses = await listExpensesForTechnician(
    context.company.id,
    context.user.id,
  );

  return (
    <TechnicianReceiptsView
      expenses={expenses}
      currentUserId={context.user.id}
      canManageBilling={context.permissions.manageBilling}
      canDispatchJobs={context.permissions.dispatchJobs}
    />
  );
}
