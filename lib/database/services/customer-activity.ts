import { recordCustomerActivity } from "@/lib/database/queries/customer-activities";
import type { CustomerStatus } from "@/shared/types/customer";

export async function recordCustomerCreatedActivity(input: {
  companyId: string;
  customerId: string;
  actorId: string;
  customerName: string;
  status: CustomerStatus;
}): Promise<void> {
  const { error } = await recordCustomerActivity({
    company_id: input.companyId,
    customer_id: input.customerId,
    actor_id: input.actorId,
    event_type: "customer_created",
    metadata: {
      customer_name: input.customerName,
      status: input.status,
    },
  });

  if (error) {
    console.error("[recordCustomerCreatedActivity] failed:", {
      customerId: input.customerId,
      error,
    });
  }
}
