import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listExpenses } from "@/lib/database/queries/expenses";
import { ExpensesPageView } from "@/shared/components/expenses/ExpensesPageView";

type ExpensesPageProps = {
  searchParams: Promise<{
    jobId?: string;
    customerId?: string;
    selected?: string;
    create?: string;
  }>;
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const params = await searchParams;
  const expenses = await listExpenses(companyContext.company.id);

  return (
    <ExpensesPageView
      expenses={expenses}
      currentUserId={companyContext.user.id}
      canManageBilling={companyContext.permissions.manageBilling}
      canDispatchJobs={companyContext.permissions.dispatchJobs}
      initialJobId={params.jobId}
      initialCustomerId={params.customerId}
      initialSelectedId={params.selected}
      initialCreate={params.create === "1"}
    />
  );
}
