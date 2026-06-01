import type { JobEstimateSummary, JobInvoiceSummary } from "@/shared/lib/job-next-business-action";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import type { JobDetail } from "@/shared/types/job";

export type JobSummaryDraftInput = {
  job: JobDetail;
  recentActivities: OperationalActivity[];
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
  includeBillingDetails: boolean;
};
