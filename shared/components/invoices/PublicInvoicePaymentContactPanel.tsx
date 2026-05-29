import { Mail, Phone } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type PublicInvoicePaymentContactPanelProps = {
  company: BillingCompanyContact;
  balanceDue: number;
  dueDate: string;
  companyTimeZone?: string;
};

export function PublicInvoicePaymentContactPanel({
  company,
  balanceDue,
  dueDate,
  companyTimeZone,
}: PublicInvoicePaymentContactPanelProps) {
  const phone = company.phone?.trim();
  const email = company.email?.trim();
  const isPaidInFull = balanceDue <= 0;

  if (isPaidInFull) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-emerald-950">Paid in full</h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900">
          This invoice has no balance due. Retain it for your records.
          {(phone || email) && " Contact us if you have any questions."}
        </p>
        {(phone || email) ? (
          <ContactDetails phone={phone} email={email} className="mt-4" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        How to pay
      </p>
      <h2 className="mt-2 text-lg font-bold text-slate-900">
        Contact {company.name} to pay
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Online card payment is not available yet. Please contact the office to
        arrange payment of{" "}
        <span className="font-semibold text-slate-900">
          {formatCurrency(balanceDue)}
        </span>{" "}
        by{" "}
        <span className="font-semibold text-slate-900">
          {formatDate(dueDate, companyTimeZone)}
        </span>
        .
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Office contact
        </p>
        {(phone || email) ? (
          <ContactDetails phone={phone} email={email} className="mt-3" />
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Use the contact details from your invoice email to reach the office.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Secure online checkout will be available here in a future update. Your
        payment is not recorded until the office confirms receipt.
      </p>
    </div>
  );
}

function ContactDetails({
  phone,
  email,
  className = "",
}: {
  phone?: string;
  email?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 text-sm text-slate-700 ${className}`}>
      {phone ? (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex items-center gap-2 font-semibold text-cyan-800 hover:text-cyan-900"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden />
          {phone}
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 break-all font-semibold text-cyan-800 hover:text-cyan-900"
        >
          <Mail className="h-4 w-4 shrink-0" aria-hidden />
          {email}
        </a>
      ) : null}
    </div>
  );
}
