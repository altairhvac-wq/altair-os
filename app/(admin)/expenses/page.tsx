import { redirect } from "next/navigation";
import { canViewCompanyExpenses } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listDeletedExpenses, listExpenses } from "@/lib/database/queries/expenses";
import { getJobById } from "@/lib/database/queries/jobs";
import { ExpensesPageView } from "@/shared/components/expenses/ExpensesPageView";
import type { ExpenseStatus } from "@/shared/types/expense";

type ExpensesPageProps = {
  searchParams: Promise<{
    jobId?: string;
    customerId?: string;
    selected?: string;
    create?: string;
    status?: string;
  }>;
};

const EXPENSE_STATUS_FILTERS = new Set<ExpenseStatus>([
  "draft",
  "submitted",
  "approved",
  "rejected",
  "reimbursed",
]);

function parseExpenseStatusFilter(
  value: string | undefined,
): ExpenseStatus | "all" {
  if (!value || !EXPENSE_STATUS_FILTERS.has(value as ExpenseStatus)) {
    return "all";
  }

  return value as ExpenseStatus;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const params = await searchParams;
  const job = params.jobId
    ? await getJobById(companyContext.company.id, params.jobId)
    : null;

  const initialCustomerId =
    params.customerId && (!job || job.customerId === params.customerId)
      ? params.customerId
      : undefined;

  const [expenses, deletedExpenses] = await Promise.all([
    listExpenses(companyContext.company.id, { includeArchived: true }),
    listDeletedExpenses(companyContext.company.id),
  ]);
  const allExpenses = [...expenses, ...deletedExpenses];
  const visibleExpenses = canViewCompanyExpenses(companyContext)
    ? allExpenses
    : allExpenses.filter(
        (expense) => expense.technicianId === companyContext.user.id,
      );

  return (
    <ExpensesPageView
      expenses={visibleExpenses}
      currentUserId={companyContext.user.id}
      canManageBilling={companyContext.permissions.manageBilling}
      canDispatchJobs={companyContext.permissions.dispatchJobs}
      initialJobId={job?.id}
      initialJobLabel={job?.jobNumber}
      initialCustomerId={initialCustomerId}
      initialSelectedId={params.selected}
      initialCreate={params.create === "1"}
      initialStatusFilter={parseExpenseStatusFilter(params.status)}
    />
  );
}
