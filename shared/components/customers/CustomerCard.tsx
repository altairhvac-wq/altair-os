"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import { CustomerStatusBadge } from "@/shared/components/customers/CustomerStatusBadge";
import {
  formatCurrency,
  formatDate,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";
import type { CustomerFinancialSummary } from "@/shared/types/customer-financial";

type CustomerCardProps = {
  customer: Customer;
  compact?: boolean;
  showRevenueStats?: boolean;
  financialSummary?: CustomerFinancialSummary;
};

export function CustomerCard({
  customer,
  compact = false,
  showRevenueStats = true,
  financialSummary,
}: CustomerCardProps) {
  const formatDisplayName = useFormatDemoDisplayName();
  const displayName = formatDisplayName(customer.name);
  const location = `${customer.city}, ${customer.state}`;
  const showFinancialSummary = showRevenueStats && financialSummary != null;

  return (
    <div className={compact ? "space-y-4" : "rounded-xl border border-slate-100 bg-white p-4"}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
          {getCustomerInitials(displayName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">
              {displayName}
            </h3>
            <CustomerStatusBadge status={customer.status} />
          </div>

          {customer.company ? (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {customer.company}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{customer.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{customer.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{location}</span>
        </div>
      </div>

      {!compact ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div
            className={`grid gap-3 ${showFinancialSummary ? "grid-cols-2" : showRevenueStats ? "grid-cols-3" : "grid-cols-2"}`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500">Jobs</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {customer.totalJobs}
              </p>
            </div>
            {showFinancialSummary ? null : showRevenueStats ? (
              <div>
                <p className="text-xs font-medium text-slate-500">Revenue</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {formatCurrency(customer.totalRevenue)}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-medium text-slate-500">Last service</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {customer.lastServiceDate
                  ? formatDate(customer.lastServiceDate)
                  : "—"}
              </p>
            </div>
          </div>

          {showFinancialSummary ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Total invoiced</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {formatCurrency(financialSummary.totalInvoiced)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total collected</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {formatCurrency(financialSummary.totalCollected)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Balance due</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">
                  {formatCurrency(financialSummary.outstandingBalance)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
