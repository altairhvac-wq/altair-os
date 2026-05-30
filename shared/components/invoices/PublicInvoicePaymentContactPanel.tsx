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
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm sm:rounded-2xl sm:p-5 md:p-6">
        <h2 className="text-base font-bold text-emerald-950 sm:text-lg">
          Paid in full
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-emerald-900 sm:mt-2 sm:text-sm">
          This invoice has no balance due. Retain it for your records.
          {(phone || email) && " Contact us if you have any questions."}
        </p>
        {(phone || email) ? (
          <ContactDetails phone={phone} email={email} className="mt-3 sm:mt-4" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5 md:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        How to pay
      </p>
      <h2 className="mt-1 text-base font-bold text-slate-900 sm:mt-2 sm:text-lg">
        Pay invoice
      </h2>
      <p className="mt-1.5 text-xs leading-snug text-slate-600 sm:mt-2 sm:text-sm sm:leading-relaxed">
        Contact {company.name} to arrange payment of{" "}
        <span className="font-semibold text-slate-900">
          {formatCurrency(balanceDue)}
        </span>{" "}
        by{" "}
        <span className="font-semibold text-slate-900">
          {formatDate(dueDate, companyTimeZone)}
        </span>
        .
      </p>

      {(phone || email) ? (
        <div className="mt-3 flex flex-col gap-2 sm:mt-5">
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-800 sm:min-h-12 sm:w-auto sm:min-w-[220px]"
            >
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              Call to pay
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:min-h-12 sm:w-auto sm:min-w-[220px]"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              Email to pay
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-600 sm:mt-4 sm:text-sm">
          Use the contact details from your invoice email to reach the office.
        </p>
      )}

      {(phone || email) ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:mt-4 sm:rounded-xl sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Office contact
          </p>
          <ContactDetails phone={phone} email={email} className="mt-2" />
        </div>
      ) : null}

      <p className="mt-3 text-[11px] leading-snug text-slate-500 sm:mt-4 sm:text-xs sm:leading-relaxed">
        Online card payment is not available yet. Secure online checkout will be
        available here in a future update.
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
    <div className={`space-y-1.5 text-xs text-slate-700 sm:space-y-2 sm:text-sm ${className}`}>
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
