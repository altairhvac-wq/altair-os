import { redirect } from "next/navigation";
import { canViewCompanyExpenses } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listDeletedExpenses, listExpenses } from "@/lib/database/queries/expenses";
import { getJobById } from "@/lib/database/queries/jobs";
import { ExpensesPageView } from "@/shared/components/expenses/ExpensesPageView";
import {
  getExpenseQueueCounts,
  listExpenseFilterOptions,
  listExpensesPage,
} from "@/lib/database/queries/list-pages";
import type { ExpenseStatus } from "@/shared/types/expense";
import {
  isExpenseWorkQueue,
  resolveDefaultExpenseWorkQueueFromCounts,
  type ExpenseWorkQueue,
} from "@/shared/components/expenses/expense-work-queues";

type ExpensesPageProps = {
  searchParams: Promise<{
    jobId?: string;
    customerId?: string;
    selected?: string;
    create?: string;
    status?: string;
    /** Work-queue pill. Applied in SQL, so it has to be in the URL. */
    queue?: string;
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

  // Served one page at a time. The queue, the eight filters and the lifecycle
  // scope are all applied in SQL; nothing here loads the expense history into
  // memory. Field staff are pinned to their own expenses by the query rather
  // than by filtering an array that already contains everyone's.
  const technicianScope = canViewCompanyExpenses(companyContext)
    ? null
    : companyContext.user.id;

  // The counts come first because the landing queue is chosen from them.
  // That used to be decided from the loaded array, which stopped meaning
  // anything the moment the array became one page: "which queue has work in
  // it" answered over 50 rows is not the same question.
  const [queueCounts, filterOptions] = await Promise.all([
    getExpenseQueueCounts(companyContext.company.id, technicianScope),
    listExpenseFilterOptions(companyContext.company.id),
  ]);

  const workQueue: ExpenseWorkQueue =
    params.queue && isExpenseWorkQueue(params.queue)
      ? params.queue
      : params.status === "submitted"
        ? "needs-review"
        : resolveDefaultExpenseWorkQueueFromCounts(queueCounts);

  const expensesPage = await listExpensesPage(companyContext.company.id, {
    queue: workQueue,
    technicianId: technicianScope,
    statusFilter: parseExpenseStatusFilter(params.status),
    jobIdFilter: params.jobId ?? null,
    customerIdFilter: initialCustomerId ?? null,
  });

  const visibleExpenses = expensesPage.rows;

  return (
    <ExpensesPageView
      expenses={visibleExpenses}
      serverPage={expensesPage}
      serverQueueCounts={queueCounts}
      filterOptions={filterOptions}
      currentUserId={companyContext.user.id}
      canManageBilling={companyContext.permissions.manageBilling}
      canDispatchJobs={companyContext.permissions.dispatchJobs}
      initialJobId={job?.id}
      initialJobLabel={job?.jobNumber}
      initialCustomerId={initialCustomerId}
      initialSelectedId={params.selected}
      initialCreate={params.create === "1"}
      initialStatusFilter={parseExpenseStatusFilter(params.status)}
      initialWorkQueue={workQueue}
    />
  );
}
