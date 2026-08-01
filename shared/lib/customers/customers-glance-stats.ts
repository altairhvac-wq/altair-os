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

/**
 * Builds compact glance stats for the Customers list header.
 * Queue filter counts use the same predicates as the former work-queue tabs.
 * New This Month uses company-timezone calendar month vs date-only createdAt.
 */
export function buildCustomersGlanceStats(input: {
  customers: ReadonlyArray<Customer>;
  timeZone: string;
  reference?: Date;
}): CustomersGlanceStat[] {
  const { customers, timeZone } = input;
  const reference = input.reference ?? new Date();
  const currentMonth = getDateOnlyInTimeZone(reference, timeZone).slice(0, 7);

  const totalCustomers = customers.length;
  let newThisMonth = 0;

  for (const customer of customers) {
    if (customer.createdAt.slice(0, 7) === currentMonth) {
      newThisMonth += 1;
    }
  }

  const queueDetails: Record<CustomerWorkQueue, string> = {
    active: "Complete profiles marked active",
    "needs-info": "Missing contact or service address",
    inactive: "Marked inactive",
    past: "Archived or recently deleted",
  };

  const queueStats: CustomersGlanceStat[] = CUSTOMER_WORK_QUEUE_ORDER.map(
    (queue) => {
      const count = countCustomersForWorkQueue([...customers], queue);
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
    },
  );

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
