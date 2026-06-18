import Link from "next/link";
import { Building2, Mail, Phone } from "lucide-react";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { DemoCustomerInitials } from "@/shared/components/display/DemoCustomerInitials";
import { JobCustomerQuickActions } from "@/shared/components/jobs/JobCustomerQuickActions";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

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
    <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
      <h2 className={dt.sectionTitle}>Customer</h2>
      <p className={dt.sectionSubtitle}>Contact and quick actions</p>

      <div className="mt-3 flex items-start gap-3">
        <div className={dt.heroAvatar}>
          <DemoCustomerInitials name={customerName} />
        </div>
        <div className="min-w-0 flex-1">
          <CustomerNameLink
            customerId={customerId}
            customerName={customerName}
            canManageCustomers={canManageCustomers}
            linkClassName="text-base font-bold text-[#17130E] transition-colors hover:text-[#8A6324]"
          />
          {company ? (
            <div className={`mt-1 ${dt.ivoryMetaRow}`}>
              <Building2 className={dt.metaIcon} />
              <span className={dt.ivoryCardSecondary}>{company}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`mt-3 space-y-1.5 ${dt.innerCard}`}>
        {email ? (
          <a
            href={`mailto:${email}`}
            className={`${dt.ivoryMetaRow} break-all hover:text-[#17130E]`}
          >
            <Mail className={dt.metaIcon} />
            <span className={dt.ivoryCardSecondary}>{email}</span>
          </a>
        ) : null}
        {phone ? (
          <a
            href={`tel:${phone}`}
            className={`${dt.ivoryMetaRow} hover:text-[#17130E]`}
          >
            <Phone className={dt.metaIcon} />
            <span className={dt.ivoryCardSecondary}>{phone}</span>
          </a>
        ) : null}
        {!email && !phone ? (
          <p className={dt.ivoryCardMuted}>No contact details on file.</p>
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
        <Link href={`/customers/${customerId}`} className={`mt-3 inline-flex ${dt.link}`}>
          Open customer profile
        </Link>
      ) : null}
    </section>
  );
}
