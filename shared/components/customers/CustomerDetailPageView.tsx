import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
} from "lucide-react";
import { CustomerBillingHistorySection } from "./CustomerBillingHistorySection";
import { CustomerCard } from "./CustomerCard";
import { CustomerJobsSection } from "./CustomerJobsSection";
import { OperationalActivityTimeline } from "@/shared/components/operational/OperationalActivityTimeline";
import {
  formatDate,
  type Customer,
} from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { OperationalActivity } from "@/shared/types/operational-activity";

type CustomerDetailPageViewProps = {
  customer: Customer;
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  activities: OperationalActivity[];
  canCreateJob: boolean;
};

export function CustomerDetailPageView({
  customer,
  jobs,
  estimates,
  invoices,
  activities,
  canCreateJob,
}: CustomerDetailPageViewProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <CustomerCard customer={customer} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service address
          </h2>
          <div className="mt-3 flex gap-2 text-sm text-slate-700">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <p>{customer.address}</p>
              <p>
                {customer.city}, {customer.state} {customer.zip}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Account info
          </h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            Customer since {formatDate(customer.createdAt)}
          </div>
        </section>
      </div>

      {customer.tags.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tags
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                <Tag className="h-3 w-3 text-slate-400" />
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Notes
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {customer.notes?.trim() ? customer.notes : "No notes on file."}
        </p>
      </section>

      <CustomerJobsSection
        customerId={customer.id}
        jobs={jobs}
        canCreateJob={canCreateJob}
      />

      <CustomerBillingHistorySection
        estimates={estimates}
        invoices={invoices}
      />

      <OperationalActivityTimeline
        activities={activities}
        description="Jobs, estimates, invoices, and account events"
        emptyDescription="Customer creation, jobs, billing, and payments will appear here."
      />
    </div>
  );
}
