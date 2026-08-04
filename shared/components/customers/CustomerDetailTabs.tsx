"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcGridGapClass,
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components";
import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import { CustomerDetailActionBar } from "./CustomerDetailActionBar";
import { CustomerEquipmentSection } from "./CustomerEquipmentSection";
import { CustomerJobsSection } from "./CustomerJobsSection";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { InvoiceStatusBadge } from "@/shared/components/invoices/InvoiceStatusBadge";
import { OperationalActivityTimeline } from "@/shared/components/operational/OperationalActivityTimeline";
import {
  createEstimateForCustomerHref,
  createInvoiceForCustomerHref,
  customerExpensesHref,
} from "@/shared/lib/customers/customer-action-links";
import {
  CUSTOMER_DETAIL_TAB_ANCHORS,
  resolveCustomerDetailTabFromHash,
  type CustomerDetailTabId,
} from "@/shared/lib/customers/customer-detail-anchors";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { Customer } from "@/shared/types/customer";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { Estimate } from "@/shared/types/estimate";
import {
  formatExpenseAmount,
  type Expense,
} from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import {
  formatPaymentMethod,
  type InvoicePayment,
} from "@/shared/types/invoice-payment";
import {
  formatJobAttachmentType,
  type JobAttachment,
} from "@/shared/types/job-attachment";
import type { Job } from "@/shared/types/job";
import type { OperationalActivity } from "@/shared/types/operational-activity";

type CustomerDetailTabsProps = {
  customer: Customer;
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  payments: InvoicePayment[];
  activities: OperationalActivity[];
  equipment: CustomerEquipment[];
  jobFiles: JobAttachment[];
  expenseReceipts: Expense[];
  canCreateJob: boolean;
  canManageEquipment: boolean;
  canViewBilling: boolean;
  canManageBilling: boolean;
  canViewCompanyExpenses: boolean;
  /** Compact customer info rail rendered beside the tab workspace. */
  sideRail?: ReactNode;
  /** Content between the chrome row and the active tab panel (e.g. stats). */
  beforePanel?: ReactNode;
  /** Back link rendered inline with the tabs/actions chrome row. */
  backLink?: ReactNode;
};

type TabDefinition = {
  id: CustomerDetailTabId;
  label: string;
  count?: number;
  billingOnly?: boolean;
};

function TabEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-altair-border px-4 py-8 text-center">
      <p className="text-sm font-medium text-altair-ink-on-paper-secondary">
        {message}
      </p>
    </div>
  );
}

function isReceiptImage(fileName?: string): boolean {
  if (!fileName) {
    return false;
  }

  return /\.(jpe?g|png|webp|heic|heif)$/i.test(fileName);
}

export function CustomerDetailTabs({
  customer,
  jobs,
  estimates,
  invoices,
  payments,
  activities,
  equipment,
  jobFiles,
  expenseReceipts,
  canCreateJob,
  canManageEquipment,
  canViewBilling,
  canManageBilling,
  canViewCompanyExpenses,
  sideRail,
  beforePanel,
  backLink,
}: CustomerDetailTabsProps) {
  const tabs = useMemo(() => {
    const definitions: TabDefinition[] = [
      { id: "jobs", label: "Jobs", count: jobs.length },
      {
        id: "estimates",
        label: "Estimates",
        count: estimates.length,
        billingOnly: true,
      },
      {
        id: "invoices",
        label: "Invoices",
        count: invoices.length,
        billingOnly: true,
      },
      {
        id: "payments",
        label: "Payments",
        count: payments.length,
        billingOnly: true,
      },
      { id: "notes", label: "Notes" },
      {
        id: "files",
        label: "Files",
        count: jobFiles.length + (canViewCompanyExpenses ? expenseReceipts.length : 0),
      },
      {
        id: "equipment",
        label: "Equipment",
        count: equipment.filter((item) => item.isActive).length,
      },
      { id: "activity", label: "Activity", count: activities.length },
    ];

    return definitions.filter((tab) => !tab.billingOnly || canViewBilling);
  }, [
    activities.length,
    canViewBilling,
    canViewCompanyExpenses,
    equipment,
    estimates.length,
    expenseReceipts.length,
    invoices.length,
    jobFiles.length,
    jobs.length,
    payments.length,
  ]);

  const [activeTab, setActiveTab] = useState<CustomerDetailTabId>("jobs");

  useEffect(() => {
    const applyHash = () => {
      const fromHash = resolveCustomerDetailTabFromHash(window.location.hash);
      if (!fromHash) {
        return;
      }
      if (!canViewBilling && (fromHash === "estimates" || fromHash === "invoices" || fromHash === "payments")) {
        return;
      }
      setActiveTab(fromHash);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [canViewBilling]);

  function selectTab(tab: CustomerDetailTabId) {
    setActiveTab(tab);
    const anchor = CUSTOMER_DETAIL_TAB_ANCHORS[tab];
    const nextHash = `#${anchor}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }

  const invoiceNumberById = useMemo(
    () => new Map(invoices.map((invoice) => [invoice.id, invoice.invoiceNumber])),
    [invoices],
  );

  const activeEquipment = equipment.filter((item) => item.isActive);
  const notes = customer.notes?.trim() ?? "";
  const activityDescription = canViewBilling
    ? "Jobs, billing, and account events"
    : "Jobs, equipment, and account events";

  return (
    <section className={`flex flex-col ${altairMcGridGapClass}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {backLink}

          <div
            className={`${adminSegmentedControlClass} !flex min-w-0 max-w-full flex-1 overflow-x-auto`}
            role="tablist"
            aria-label="Customer profile sections"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`customer-tab-${tab.id}`}
                  id={`customer-tab-trigger-${tab.id}`}
                  onClick={() => selectTab(tab.id)}
                  className={`${adminSegmentedItemClass} shrink-0 px-2.5 py-1.5 text-[11px] sm:px-3 sm:text-sm ${
                    isActive ? adminSegmentedItemActiveClass : ""
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === "number" ? (
                    <span
                      className={`ml-1.5 text-[10px] font-medium sm:text-xs ${
                        isActive
                          ? "text-altair-ink-on-paper-secondary"
                          : "text-altair-ink-on-paper-muted"
                      }`}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="shrink-0">
          <CustomerDetailActionBar
            customerId={customer.id}
            invoices={invoices}
            canCreateJob={canCreateJob}
            canManageBilling={canManageBilling}
            compact
          />
        </div>
      </div>

      <div
        className={
          sideRail
            ? `flex flex-col ${altairMcGridGapClass} lg:grid lg:grid-cols-[minmax(15rem,17.5rem)_minmax(0,1fr)] lg:items-start`
            : `flex flex-col ${altairMcGridGapClass}`
        }
      >
        {sideRail ? (
          <aside className="min-w-0 lg:sticky lg:top-3">{sideRail}</aside>
        ) : null}

        <div className={`flex min-w-0 flex-col ${altairMcGridGapClass}`}>
          {beforePanel}

          <div
            role="tabpanel"
            id={`customer-tab-${activeTab}`}
            aria-labelledby={`customer-tab-trigger-${activeTab}`}
            className="space-y-2"
          >
        {activeTab === "jobs" ? (
          <>
            <SectionHeader title="Jobs" />
            <div
              id={CUSTOMER_DETAIL_TAB_ANCHORS.jobs}
              className={`${altairMcCardClass} ${altairMcCardPadClass}`}
            >
              <CustomerJobsSection
                customerId={customer.id}
                jobs={jobs}
                canCreateJob={canCreateJob}
                bare
              />
            </div>
          </>
        ) : null}

        {activeTab === "estimates" ? (
          <>
            <SectionHeader
              title="Estimates"
              action={
                canManageBilling
                  ? {
                      label: "New estimate",
                      href: createEstimateForCustomerHref(customer.id),
                    }
                  : undefined
              }
            />
            <div
              id={CUSTOMER_DETAIL_TAB_ANCHORS.estimates}
              className={`${altairMcCardClass} ${altairMcCardPadClass}`}
            >
              {estimates.length === 0 ? (
                <TabEmpty message="No estimates yet" />
              ) : (
                <ul className={altairMcListClass}>
                  {estimates.map((estimate) => (
                    <li key={estimate.id}>
                      <Link
                        href={`/estimates/${estimate.id}`}
                        className={`flex items-start justify-between gap-3 ${altairMcListRowClass}`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-altair-ink-on-paper">
                            {estimate.estimateNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-altair-ink-on-paper-muted">
                            Created {formatDate(estimate.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <p className="text-sm font-semibold text-altair-ink-on-paper">
                            {formatCurrency(estimate.total)}
                          </p>
                          <EstimateStatusBadge status={estimate.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {activeTab === "invoices" ? (
          <>
            <SectionHeader
              title="Invoices"
              action={
                canManageBilling
                  ? {
                      label: "New invoice",
                      href: createInvoiceForCustomerHref(customer.id),
                    }
                  : undefined
              }
            />
            <div
              id={CUSTOMER_DETAIL_TAB_ANCHORS.invoices}
              className={`${altairMcCardClass} ${altairMcCardPadClass}`}
            >
              {invoices.length === 0 ? (
                <TabEmpty message="No invoices yet" />
              ) : (
                <ul className={altairMcListClass}>
                  {invoices.map((invoice) => (
                    <li key={invoice.id}>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className={`flex items-start justify-between gap-3 ${altairMcListRowClass}`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-altair-ink-on-paper">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-altair-ink-on-paper-muted">
                            Issued {formatDate(invoice.issueDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <p className="text-sm font-semibold text-altair-ink-on-paper">
                            {formatCurrency(invoice.total)}
                          </p>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {activeTab === "payments" ? (
          <>
            <SectionHeader title="Payments" />
            <div
              id={CUSTOMER_DETAIL_TAB_ANCHORS.payments}
              className={`${altairMcCardClass} ${altairMcCardPadClass}`}
            >
              {payments.length === 0 ? (
                <TabEmpty message="No payments recorded yet" />
              ) : (
                <ul className={altairMcListClass}>
                  {payments.map((payment) => (
                    <li key={payment.id}>
                      <Link
                        href={`/invoices/${payment.invoiceId}`}
                        className={`flex items-start justify-between gap-3 ${altairMcListRowClass}`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-altair-ink-on-paper">
                            {invoiceNumberById.get(payment.invoiceId) ?? "Invoice"}
                          </p>
                          <p className="mt-0.5 text-xs text-altair-ink-on-paper-muted">
                            {formatDate(payment.paymentDate)} ·{" "}
                            {formatPaymentMethod(payment.paymentMethod)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-altair-success-foreground">
                          {formatCurrency(payment.amount)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {activeTab === "notes" ? (
          <>
            <SectionHeader title="Notes" />
            <div
              id={CUSTOMER_DETAIL_TAB_ANCHORS.notes}
              className={`${altairMcCardClass} ${altairMcCardPadClass}`}
            >
              {notes ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-altair-ink-on-paper-secondary">
                  {notes}
                </p>
              ) : (
                <TabEmpty message="No notes on this customer yet" />
              )}
            </div>
          </>
        ) : null}

        {activeTab === "files" ? (
          <>
            <SectionHeader title="Files from jobs & expenses" />
            <div
              id={CUSTOMER_DETAIL_TAB_ANCHORS.files}
              className={`${altairMcCardClass} ${altairMcCardPadClass} space-y-4`}
            >
              <p className="text-xs text-altair-ink-on-paper-muted">
                Attachments collected from jobs and expense receipts — not a
                general account file vault.
              </p>

              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-on-paper-muted">
                  Job attachments
                </h3>
                {jobFiles.length === 0 ? (
                  <div className="mt-2">
                    <TabEmpty message="No job attachments yet" />
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {jobFiles.map((attachment) => (
                      <Link
                        key={attachment.id}
                        href={`/work/${attachment.jobId}`}
                        className="w-36 shrink-0 overflow-hidden rounded-lg border border-altair-border bg-[var(--surface-card)] transition-colors hover:border-altair-border-strong"
                      >
                        <div className="aspect-square bg-altair-paper-subtle">
                          {attachment.signedUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={attachment.signedUrl}
                              alt={attachment.fileName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-medium text-altair-ink-on-paper-secondary">
                              {attachment.fileName}
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-2">
                          <p className="truncate text-xs font-semibold text-altair-ink-on-paper">
                            {formatJobAttachmentType(attachment.attachmentType)}
                          </p>
                          <p className="truncate text-[11px] text-altair-ink-on-paper-muted">
                            {attachment.fileName}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {canViewCompanyExpenses ? (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-on-paper-muted">
                      Expense receipts
                    </h3>
                    <Link
                      href={customerExpensesHref(customer.id)}
                      className="text-xs font-medium text-altair-ink-on-paper-secondary underline-offset-2 hover:underline"
                    >
                      All expenses
                    </Link>
                  </div>
                  {expenseReceipts.length === 0 ? (
                    <div className="mt-2">
                      <TabEmpty message="No expense receipts yet" />
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {expenseReceipts.map((expense) => (
                        <article
                          key={expense.id}
                          className="w-36 shrink-0 overflow-hidden rounded-lg border border-altair-border bg-[var(--surface-card)]"
                        >
                          <div className="aspect-square bg-altair-paper-subtle">
                            {isReceiptImage(expense.receiptFileName) &&
                            expense.receiptSignedUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={expense.receiptSignedUrl}
                                alt={
                                  expense.receiptFileName ?? expense.expenseNumber
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-medium text-altair-ink-on-paper-secondary">
                                {expense.receiptFileName ?? "Receipt"}
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-2">
                            <p className="truncate text-xs font-semibold text-altair-ink-on-paper">
                              {expense.merchant.trim() || expense.expenseNumber}
                            </p>
                            <p className="text-[11px] text-altair-ink-on-paper-muted">
                              {formatExpenseAmount(expense.amount)}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {activeTab === "equipment" ? (
          <>
            <SectionHeader title="Equipment" />
            <div
              id={CUSTOMER_DETAIL_TAB_ANCHORS.equipment}
              className={`${altairMcCardClass} ${altairMcCardPadClass}`}
            >
              <CustomerEquipmentSection
                customerId={customer.id}
                equipment={activeEquipment}
                canManage={canManageEquipment}
                bare
              />
            </div>
          </>
        ) : null}

        {activeTab === "activity" ? (
          <>
            <SectionHeader title="Activity" />
            <div
              id={CUSTOMER_DETAIL_TAB_ANCHORS.activity}
              className={`${altairMcCardClass} ${altairMcCardPadClass}`}
            >
              <OperationalActivityTimeline
                activities={activities}
                canViewBilling={canViewBilling}
                bare
                description={activityDescription}
                emptyDescription="Activity will appear here as work progresses."
              />
            </div>
          </>
        ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
