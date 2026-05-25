import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listExpenses } from "@/lib/database/queries/expenses";
import { ExpensesPageView } from "@/shared/components/expenses/ExpensesPageView";

export default async function ExpensesPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const expenses = await listExpenses(companyContext.company.id);

  return <ExpensesPageView expenses={expenses} />;
}
