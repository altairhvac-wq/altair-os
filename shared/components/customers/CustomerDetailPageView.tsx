import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
} from "lucide-react";
import { CustomerBillingHistorySection } from "./CustomerBillingHistorySection";
import { CustomerRecentPhotosSection } from "./CustomerRecentPhotosSection";
import { CustomerRecentReceiptsSection } from "./CustomerRecentReceiptsSection";
import { CustomerCard } from "./CustomerCard";
import { CustomerEditControl } from "./CustomerEditControl";
import { CustomerEquipmentSection } from "./CustomerEquipmentSection";
import { CustomerJobsSection } from "./CustomerJobsSection";
import { OperationalActivityTimeline } from "@/shared/components/operational/OperationalActivityTimeline";
import {
  formatDate,
  type Customer,
} from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { Expense } from "@/shared/types/expense";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import {
  adminCardSectionClass,
  adminPageStackClass,
} from "@/shared/lib/admin-density";

type CustomerDetailPageViewProps = {
  customer: Customer;
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  activities: OperationalActivity[];
  equipment: CustomerEquipment[];
  recentPhotos: JobAttachment[];
  recentReceipts: Expense[];
  canCreateJob: boolean;
  canManageCustomers: boolean;
  canManageEquipment: boolean;
  canViewBilling: boolean;
  canViewCompanyExpenses: boolean;
};

export function CustomerDetailPageView({
  customer,
  jobs,
  estimates,
  invoices,
  activities,
  equipment,
  recentPhotos,
  recentReceipts,
  canCreateJob,
  canManageCustomers,
  canManageEquipment,
  canViewBilling,
  canViewCompanyExpenses,
}: CustomerDetailPageViewProps) {
  return (
    <div className={`mx-auto max-w-5xl ${adminPageStackClass}`}>
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>

      <div className={adminCardSectionClass}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer profile
          </h2>
          <CustomerEditControl
            customer={customer}
            canManage={canManageCustomers}
          />
        </div>
        <CustomerCard customer={customer} showRevenueStats={canViewBilling} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={adminCardSectionClass}>
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

        <section className={adminCardSectionClass}>
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
        <section className={adminCardSectionClass}>
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

      <section className={adminCardSectionClass}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Notes
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {customer.notes?.trim() ? customer.notes : "No notes on file."}
        </p>
      </section>

      <CustomerJobsSection
        customerId={customer.id}
        jobs={jobs}
        canCreateJob={canCreateJob}
      />

      <CustomerEquipmentSection
        customerId={customer.id}
        equipment={equipment.filter((item) => item.isActive)}
        canManage={canManageEquipment}
      />

      {canViewBilling ? (
        <CustomerBillingHistorySection
          estimates={estimates}
          invoices={invoices}
        />
      ) : null}

      <CustomerRecentPhotosSection
        customerId={customer.id}
        attachments={recentPhotos}
      />

      {canViewCompanyExpenses ? (
        <CustomerRecentReceiptsSection
          customerId={customer.id}
          expenses={recentReceipts}
        />
      ) : null}

      <OperationalActivityTimeline
        activities={activities}
        canViewBilling={canViewBilling}
        description={
          canViewBilling
            ? "Jobs, estimates, invoices, and account events"
            : "Jobs, equipment, and account events"
        }
        emptyDescription={
          canViewBilling
            ? "Customer creation, jobs, billing, and payments will appear here."
            : "Customer creation, jobs, and equipment changes will appear here."
        }
      />
    </div>
  );
}
