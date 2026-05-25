import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  FileText,
  History,
  MapPin,
  Receipt,
  Tag,
} from "lucide-react";
import { CustomerCard } from "./CustomerCard";
import { CustomerJobsSection } from "./CustomerJobsSection";
import {
  formatDate,
  type Customer,
} from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";

type CustomerDetailPageViewProps = {
  customer: Customer;
  jobs: Job[];
  canCreateJob: boolean;
};

type PlaceholderSection = {
  title: string;
  description: string;
  icon: typeof FileText;
};

const placeholderSections: PlaceholderSection[] = [
  {
    title: "Estimates",
    description: "Quotes and proposals for this customer will appear here.",
    icon: FileText,
  },
  {
    title: "Invoices",
    description: "Billing and payment history will appear here.",
    icon: Receipt,
  },
  {
    title: "Activity",
    description: "Timeline of calls, notes, and updates will appear here.",
    icon: History,
  },
];

export function CustomerDetailPageView({
  customer,
  jobs,
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

      <div className="grid gap-4 sm:grid-cols-2">
        {placeholderSections.map((section) => {
          const Icon = section.icon;

          return (
            <section
              key={section.title}
              className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <Icon className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {section.description}
                  </p>
                  <p className="mt-3 text-xs font-medium text-slate-400">
                    Coming soon
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
