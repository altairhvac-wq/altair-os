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
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <p className="text-sm font-bold text-emerald-950">Paid in full</p>
        <p className="mt-1 text-xs leading-snug text-emerald-900">
          No payment is required. Contact us if you have questions.
        </p>
        {(phone || email) ? (
          <ContactActions phone={phone} email={email} className="mt-2" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
      <ContactActions phone={phone} email={email} stacked />
      <p className="mt-2 text-center text-[11px] leading-snug text-slate-600">
        Pay{" "}
        <span className="font-semibold text-slate-900">
          {formatCurrency(balanceDue)}
        </span>{" "}
        by{" "}
        <span className="font-semibold text-slate-900">
          {formatDate(dueDate, companyTimeZone)}
        </span>
        . Online card checkout will be available here in a future update.
      </p>
      {(phone || email) ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Office contact
          </p>
          <ContactDetails phone={phone} email={email} className="mt-1.5" />
        </div>
      ) : (
        <p className="mt-2 text-center text-xs text-slate-600">
          Use the contact details from your invoice email.
        </p>
      )}
    </div>
  );
}

function ContactActions({
  phone,
  email,
  stacked = false,
  className = "",
}: {
  phone?: string;
  email?: string;
  stacked?: boolean;
  className?: string;
}) {
  if (!phone && !email) {
    return null;
  }

  const layoutClass = stacked
    ? "flex flex-col gap-2"
    : "flex flex-col gap-2 sm:flex-row sm:flex-wrap";

  return (
    <div className={`${layoutClass} ${className}`}>
      {phone ? (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-800"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden />
          Call to pay
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Mail className="h-4 w-4 shrink-0" aria-hidden />
          Email to pay
        </a>
      ) : null}
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
    <div className={`space-y-1 text-xs text-slate-700 ${className}`}>
      {phone ? (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex items-center gap-2 font-semibold text-cyan-800 hover:text-cyan-900"
        >
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {phone}
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 break-all font-semibold text-cyan-800 hover:text-cyan-900"
        >
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {email}
        </a>
      ) : null}
    </div>
  );
}
