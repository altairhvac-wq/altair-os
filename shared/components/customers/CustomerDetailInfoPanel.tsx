import { Mail, MapPin, Phone, Tag } from "lucide-react";
import { CustomerEditControl } from "./CustomerEditControl";
import { CustomerLifecycleControl } from "./CustomerLifecycleControl";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import type { CustomerDeleteDependencies } from "@/shared/lib/customer-lifecycle";
import {
  formatDate,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";

type CustomerDetailInfoPanelProps = {
  customer: Customer;
  canManageCustomers: boolean;
  deleteDependencies: CustomerDeleteDependencies;
  deleted: boolean;
  archived: boolean;
};

export function CustomerDetailInfoPanel({
  customer,
  canManageCustomers,
  deleteDependencies,
  deleted,
  archived,
}: CustomerDetailInfoPanelProps) {
  const addressLine = [customer.address, customer.city, customer.state, customer.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="space-y-2">
      <SectionHeader title="Customer" />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <div className="flex items-start gap-2.5">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-altair-stone text-xs font-bold text-altair-ink-on-paper ring-1 ring-altair-border"
          >
            {getCustomerInitials(customer.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-snug tracking-tight text-altair-ink-on-paper sm:text-lg">
              <DemoDisplayName>{customer.name}</DemoDisplayName>
            </h1>
            <div className="mt-1">
              <CustomerStatusBadge status={customer.status} />
            </div>
            {customer.company ? (
              <p className="mt-1 text-xs font-medium text-altair-ink-on-paper-secondary">
                {customer.company}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-3 space-y-1.5 text-xs text-altair-ink-on-paper-secondary sm:text-sm">
          <div className="flex min-w-0 items-start gap-2">
            <dt className="sr-only">Email</dt>
            <Mail
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted"
              aria-hidden="true"
            />
            <dd className="m-0 min-w-0 break-words">
              {customer.email || "No email on file"}
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <dt className="sr-only">Phone</dt>
            <Phone
              className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted"
              aria-hidden="true"
            />
            <dd className="m-0">{customer.phone || "No phone on file"}</dd>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <dt className="sr-only">Address</dt>
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted"
              aria-hidden="true"
            />
            <dd className="m-0 min-w-0 break-words">
              {addressLine || "No address on file"}
            </dd>
          </div>
        </dl>

        {customer.tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {customer.tags.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-altair-ink-on-paper/[0.04] px-2 py-0.5 text-[11px] font-medium text-altair-ink-on-paper-secondary ring-1 ring-altair-border"
              >
                <Tag
                  className="h-2.5 w-2.5 text-altair-ink-on-paper-muted"
                  aria-hidden="true"
                />
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-2 text-[11px] text-altair-ink-on-paper-muted">
          Customer since {formatDate(customer.createdAt)}
        </p>

        {canManageCustomers ? (
          <div className="mt-3 flex flex-col gap-1.5 border-t border-altair-border pt-3">
            <CustomerEditControl
              customer={customer}
              canManage={canManageCustomers}
            />
            <CustomerLifecycleControl
              customer={customer}
              deleteDependencies={deleteDependencies}
              canManage={canManageCustomers}
            />
          </div>
        ) : null}

        {deleted ? (
          <div className="mt-3 rounded-md border border-altair-warning/30 bg-altair-warning-surface px-2.5 py-2 text-xs text-altair-warning-foreground">
            This customer is in Recently Deleted and hidden from customer lists.
            {customer.deletedAt ? (
              <>
                {" "}
                Deleted {formatDate(customer.deletedAt)}
                {customer.deleteAfter
                  ? ` · eligible for permanent deletion after ${formatDate(customer.deleteAfter)}`
                  : null}
                .
              </>
            ) : null}
          </div>
        ) : archived ? (
          <div className="mt-3 rounded-md border border-altair-border bg-altair-paper-subtle px-2.5 py-2 text-xs text-altair-ink-on-paper-secondary">
            This customer is archived and hidden from active customer lists.
          </div>
        ) : null}
      </div>
    </section>
  );
}
