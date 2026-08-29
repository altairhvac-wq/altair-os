import Link from "next/link";
import { formatPhoneForDisplay } from "@/shared/lib/phone";
import { Building2, Mail, Phone } from "lucide-react";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { DemoCustomerInitials } from "@/shared/components/display/DemoCustomerInitials";
import { JobCustomerQuickActions } from "@/shared/components/jobs/JobCustomerQuickActions";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import { altairCanvasInkLinkClass } from "@/shared/design-system/foundation";

type JobDetailSideRailCustomerCardProps = {
  customerId: string;
  customerName: string;
  customerCompany?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  canManageCustomers: boolean;
};

export function JobDetailSideRailCustomerCard({
  customerId,
  customerName,
  customerCompany,
  customerEmail,
  customerPhone,
  serviceAddress,
  city,
  state,
  zip,
  canManageCustomers,
}: JobDetailSideRailCustomerCardProps) {
  const email = customerEmail?.trim();
  const phone = customerPhone?.trim();
  const company = customerCompany?.trim();

  return (
    <section className="scroll-mt-6 space-y-2">
      <SectionHeader title="Customer" />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-altair-stone text-xs font-bold text-altair-ink-on-paper ring-1 ring-altair-border"
          >
            <DemoCustomerInitials name={customerName} />
          </div>
          <div className="min-w-0 flex-1">
            <CustomerNameLink
              customerId={customerId}
              customerName={customerName}
              canManageCustomers={canManageCustomers}
              linkClassName="text-base font-bold text-altair-ink-on-paper transition-colors hover:text-altair-brass"
            />
            {company ? (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-altair-ink-on-paper-secondary">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
                <span>{company}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 rounded-lg border border-altair-border bg-[var(--surface-tile)] px-2.5 py-2">
          {email ? (
            <a
              href={`mailto:${email}`}
              className="flex min-w-0 items-center gap-2 break-all text-xs text-altair-ink-on-paper-secondary transition-colors hover:text-altair-ink-on-paper"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
              <span>{email}</span>
            </a>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 text-xs text-altair-ink-on-paper-secondary transition-colors hover:text-altair-ink-on-paper"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
              <span>{formatPhoneForDisplay(phone)}</span>
            </a>
          ) : null}
          {!email && !phone ? (
            <p className="text-xs text-altair-ink-on-paper-muted">
              No contact details on file.
            </p>
          ) : null}
        </div>

        <div className="mt-3">
          <JobCustomerQuickActions
            customerPhone={phone}
            customerEmail={email}
            serviceAddress={serviceAddress}
            city={city}
            state={state}
            zip={zip}
            northStar
          />
        </div>

        {canManageCustomers ? (
          <Link
            href={`/customers/${customerId}`}
            className={`mt-3 inline-flex text-xs font-semibold ${altairCanvasInkLinkClass}`}
          >
            Open customer profile
          </Link>
        ) : null}
      </div>
    </section>
  );
}
