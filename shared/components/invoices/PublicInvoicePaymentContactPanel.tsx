import { Mail, Phone } from "lucide-react";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type PublicInvoicePaymentContactPanelProps = {
  company: BillingCompanyContact;
  balanceDue: number;
};

export function PublicInvoicePaymentContactPanel({
  company,
  balanceDue,
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

  if (!phone && !email) {
    return (
      <p className="text-center text-xs leading-snug text-slate-600">
        Use the contact details from your invoice email to arrange payment.
      </p>
    );
  }

  return <ContactActions phone={phone} email={email} stacked />;
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
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-teal-800"
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
