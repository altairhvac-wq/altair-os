import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  History,
  MapPin,
  Sparkles,
  Tag,
} from "lucide-react";
import type {
  Customer360Data,
  Customer360Opportunity,
} from "@/shared/lib/customers/customer-360";
import { filterOperationalActivitiesForBillingAccess } from "@/shared/lib/billing-activity-visibility";
import { CUSTOMER_DETAIL_360_ANCHOR } from "@/shared/lib/customers/customer-detail-anchors";
import { OperationalActivityEntryContent } from "@/shared/components/operational/OperationalActivityEntryContent";
import {
  adminCardSectionClass,
  adminEmptyWrapClass,
  adminMetaRowClass,
} from "@/shared/lib/admin-density";
import {
  formatEquipmentDate,
  formatWarrantyStatus,
  getWarrantyStatusStyles,
} from "@/shared/types/customer-equipment";
import { formatCurrency, formatDate } from "@/shared/types/customer";

type Customer360CardProps = {
  data: Customer360Data;
  canViewBilling: boolean;
};

const severityStyles: Record<
  Customer360Opportunity["severity"],
  string
> = {
  info: "border-slate-200 bg-slate-50/70",
  warning: "border-amber-200 bg-amber-50/70",
  critical: "border-rose-200 bg-rose-50/70",
};

export function Customer360Card({ data, canViewBilling }: Customer360CardProps) {
  const { identity, financial, equipment } = data;

  return (
    <section
      className={`${adminCardSectionClass} scroll-mt-6`}
      id={CUSTOMER_DETAIL_360_ANCHOR}
    >
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-slate-900">Customer 360</h2>
        <p className="text-[11px] text-slate-500">
          {canViewBilling
            ? "Identity, financials, equipment, opportunities, and recent activity"
            : "Identity, equipment, opportunities, and recent activity"}
        </p>
      </div>

      <div className="space-y-2.5">
        <IdentitySection identity={identity} />
        {financial ? <FinancialSection financial={financial} /> : null}
        <EquipmentSection equipment={equipment} />
        <OpportunitiesSection opportunities={data.opportunities} />
        <RecentActivitySection
          activities={data.recentActivity}
          canViewBilling={canViewBilling}
        />
      </div>

      {data.limitations.length > 0 ? (
        <p className="mt-2 rounded-md border border-amber-100 bg-amber-50/60 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
          {data.limitations.join(" ")}
        </p>
      ) : null}
    </section>
  );
}

function IdentitySection({
  identity,
}: {
  identity: Customer360Data["identity"];
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Identity
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{identity.name}</p>
          {identity.company ? (
            <p className="text-xs text-slate-600">{identity.company}</p>
          ) : null}
          <div className="mt-0.5 text-xs text-slate-600">
            {identity.email ? (
              <p className="break-all sm:hidden">{identity.email}</p>
            ) : null}
            {identity.phone ? (
              <p className="sm:hidden">{identity.phone}</p>
            ) : null}
            <p className="hidden break-words sm:block">
              {[identity.email, identity.phone].filter(Boolean).join(" · ") ||
                "No contact info on file"}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
          {identity.statusLabel}
        </span>
      </div>
      <div className={`mt-1.5 ${adminMetaRowClass}`}>
        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-xs text-slate-600">{identity.addressLine}</span>
      </div>
      <div className={`mt-1 ${adminMetaRowClass}`}>
        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-xs text-slate-600">
          Customer since {formatDate(identity.customerSince)}
        </span>
      </div>
      {identity.tags.length > 0 ? (
        <div className={`mt-1.5 flex flex-wrap gap-1.5 ${adminMetaRowClass}`}>
          {identity.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
            >
              <Tag className="h-2.5 w-2.5 text-slate-400" />
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FinancialSection({
  financial,
}: {
  financial: NonNullable<Customer360Data["financial"]>;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Financial snapshot
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SummaryMetric
          label="Total invoiced"
          value={formatCurrency(financial.totalInvoiced)}
          icon={ClipboardList}
        />
        <SummaryMetric
          label="Total collected"
          value={formatCurrency(financial.totalCollected)}
          icon={CircleDollarSign}
        />
        <SummaryMetric
          label="Balance due"
          value={formatCurrency(financial.outstandingBalance)}
          icon={AlertTriangle}
          highlighted={financial.outstandingBalance > 0}
        />
        <SummaryMetric
          label="Paid invoices"
          value={`${financial.paidInvoiceCount} / ${financial.invoiceCount}`}
          icon={Sparkles}
        />
      </div>
    </div>
  );
}

function EquipmentSection({
  equipment,
}: {
  equipment: Customer360Data["equipment"];
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Equipment
        </p>
        <p className="text-xs text-slate-600">
          {equipment.activeCount} active
          {equipment.agingCount > 0
            ? ` · ${equipment.agingCount} aging`
            : ""}
        </p>
      </div>

      {equipment.items.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {equipment.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-2 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {item.equipmentType || "Equipment"}
                  {item.installDate
                    ? ` · Installed ${formatEquipmentDate(item.installDate)}`
                    : ""}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getWarrantyStatusStyles(item.warrantyStatus)}`}
              >
                {formatWarrantyStatus(item.warrantyStatus)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`mt-1.5 ${adminEmptyWrapClass}`}>
          <p className="text-sm text-slate-500">No active equipment on file.</p>
        </div>
      )}
    </div>
  );
}

function OpportunitiesSection({
  opportunities,
}: {
  opportunities: Customer360Opportunity[];
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Opportunities
      </p>

      {opportunities.length > 0 ? (
        <ul className="mt-1.5 space-y-1.5">
          {opportunities.map((opportunity) => (
            <OpportunityRow key={opportunity.type} opportunity={opportunity} />
          ))}
        </ul>
      ) : (
        <div className={`mt-1.5 ${adminEmptyWrapClass}`}>
          <p className="text-sm text-slate-500">
            No follow-up opportunities right now.
          </p>
        </div>
      )}
    </div>
  );
}

function RecentActivitySection({
  activities,
  canViewBilling,
}: {
  activities: Customer360Data["recentActivity"];
  canViewBilling: boolean;
}) {
  const visibleActivities = filterOperationalActivitiesForBillingAccess(
    activities,
    canViewBilling,
  );

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Recent activity
      </p>

      {visibleActivities.length > 0 ? (
        <ol className="mt-1.5 space-y-1.5">
          {visibleActivities.map((activity) => (
            <li
              key={activity.id}
              className="rounded-md border border-slate-100 bg-white px-2 py-1.5"
            >
              <div className="flex items-start gap-2">
                <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <OperationalActivityEntryContent
                    activity={activity}
                    canViewBilling={canViewBilling}
                    labelClassName="text-sm font-medium text-slate-900"
                    timestampClassName="shrink-0 text-[11px] text-slate-400"
                    detailsClassName="mt-0.5 text-xs text-slate-600"
                    attributionClassName="mt-0.5 text-[11px] text-slate-400"
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className={`mt-1.5 ${adminEmptyWrapClass}`}>
          <p className="text-sm text-slate-500">
            Activity will appear here as work progresses.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  highlighted = false,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        highlighted
          ? "border-amber-200 bg-amber-50/80"
          : "border-slate-100 bg-white"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}

function OpportunityRow({
  opportunity,
}: {
  opportunity: Customer360Opportunity;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{opportunity.title}</p>
        {opportunity.href && opportunity.actionLabel ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-cyan-700">
            {opportunity.actionLabel}
            <ArrowRight className="h-3 w-3" />
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-xs leading-snug text-slate-600">
        {opportunity.description}
      </p>
    </>
  );

  const className = `block rounded-lg border px-2.5 py-2 ${severityStyles[opportunity.severity]}`;

  if (opportunity.href) {
    return (
      <li>
        <Link
          href={opportunity.href}
          className={`${className} transition-colors hover:bg-white`}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className={className}>{content}</div>
    </li>
  );
}
