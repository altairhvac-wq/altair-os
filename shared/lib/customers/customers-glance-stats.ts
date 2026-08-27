import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import {
  countCustomersForWorkQueue,
  CUSTOMER_WORK_QUEUE_LABELS,
  CUSTOMER_WORK_QUEUE_ORDER,
  type CustomerWorkQueue,
} from "@/shared/components/customers/customer-work-queues";
import type { Customer } from "@/shared/types/customer";

export type CustomersGlanceStat = {
  id: string;
  label: string;
  value: string;
  detail: string;
  /** When set, clicking the stat activates this work-queue filter. */
  filterQueue?: CustomerWorkQueue;
};

/** Lifecycle-active book queues — excludes Past (Archived hub tab). */
export const CUSTOMER_BOOK_QUEUE_ORDER: readonly CustomerWorkQueue[] = [
  "active",
  "needs-info",
  "inactive",
];

/**
 * Builds compact glance stats for the Customers list header.
 * Queue filter counts use the same predicates as the former work-queue tabs.
 * New This Month uses company-timezone calendar month vs date-only createdAt.
 *
 * Pass `queues` to limit which work-queue pills appear (e.g. book tab omits
 * Past — Archived lives on its own hub tab). Inactive remains a book queue.
 */
export function buildCustomersGlanceStats(input: {
  customers: ReadonlyArray<Customer>;
  timeZone: string;
  reference?: Date;
  queues?: readonly CustomerWorkQueue[];
  /** When false, omit Total / New This Month (Archived tab). Default true. */
  includeSummaryStats?: boolean;
  /**
   * Counts taken over the WHOLE tenant by the database.
   *
   * Without these the numbers are derived from `customers`, which is now one
   * page of results rather than the entire book — so the stat strip would report
   * "50 customers" to a company with 5,000. Before pagination it derived them
   * from an array that PostgREST had silently capped at 1,000, which was the
   * same lie with a larger number. Supplying these is what makes the strip true.
   */
  serverCounts?: {
    byQueue: Record<CustomerWorkQueue, number>;
    total: number;
    newThisMonth: number;
  };
}): CustomersGlanceStat[] {
  const { customers, timeZone } = input;
  const reference = input.reference ?? new Date();
  const currentMonth = getDateOnlyInTimeZone(reference, timeZone).slice(0, 7);
  const queues = input.queues ?? CUSTOMER_WORK_QUEUE_ORDER;
  const includeSummaryStats = input.includeSummaryStats !== false;

  const serverCounts = input.serverCounts;
  let totalCustomers = serverCounts?.total ?? customers.length;
  let newThisMonth = serverCounts?.newThisMonth ?? 0;

  if (!serverCounts) {
    totalCustomers = customers.length;
    newThisMonth = 0;
    for (const customer of customers) {
      if (customer.createdAt.slice(0, 7) === currentMonth) {
        newThisMonth += 1;
      }
    }
  }

  const queueDetails: Record<CustomerWorkQueue, string> = {
    active: "Complete profiles marked active",
    "needs-info": "Missing contact or service address",
    inactive: "Marked inactive — still in the customer book",
    past: "Archived or recently deleted",
  };

  const queueStats: CustomersGlanceStat[] = queues.map((queue) => {
    const count = serverCounts
      ? serverCounts.byQueue[queue]
      : countCustomersForWorkQueue([...customers], queue);
    return {
      id: queue,
      label: CUSTOMER_WORK_QUEUE_LABELS[queue],
      value: String(count),
      detail:
        count === 0
          ? `No ${CUSTOMER_WORK_QUEUE_LABELS[queue].toLowerCase()} customers`
          : queueDetails[queue],
      filterQueue: queue,
    };
  });

  if (!includeSummaryStats) {
    return queueStats;
  }

  return [
    {
      id: "total",
      label: "Total Customers",
      value: String(totalCustomers),
      detail:
        totalCustomers === 0
          ? "No customers loaded"
          : "In your customer book",
    },
    ...queueStats,
    {
      id: "new-this-month",
      label: "New This Month",
      value: String(newThisMonth),
      detail:
        newThisMonth === 0
          ? "No new customers this month"
          : "Created this calendar month",
    },
  ];
}
