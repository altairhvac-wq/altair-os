import { formatDate } from "@/shared/types/customer";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type EstimateThankYouFooterProps = {
  company: BillingCompanyContact;
  validUntil?: string | null;
  /** When true, include guidance about online approval. */
  showApprovalGuidance?: boolean;
};

export function EstimateThankYouFooter({
  company,
  validUntil,
  showApprovalGuidance = false,
}: EstimateThankYouFooterProps) {
  const phone = company.phone?.trim();
  const email = company.email?.trim();
  const hasContact = Boolean(phone || email);
  const trimmedValidUntil = validUntil?.trim();

  return (
    <footer className="estimate-thank-you-footer mt-8 border-t-2 border-slate-900 pt-8 text-center print:mt-8 print:border-slate-800 print:pt-8 print:break-inside-avoid">
      <p className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
        Thank you for considering {company.name}
      </p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600 print:text-slate-700">
        We appreciate the opportunity to serve you. Please retain this estimate
        for your records.
      </p>

      {trimmedValidUntil || showApprovalGuidance ? (
        <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 bg-white px-5 py-4 print:max-w-none print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
            Estimate validity &amp; approval
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 print:text-slate-800">
            {trimmedValidUntil
              ? `This estimate is valid until ${formatDate(trimmedValidUntil)}. `
              : null}
            {showApprovalGuidance
              ? "Use the secure approval link in your email to review and sign online."
              : "Contact us to approve this estimate or request changes before the validity date."}
          </p>
        </div>
      ) : null}

      {hasContact ? (
        <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 bg-white px-5 py-4 print:max-w-none print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
            Questions about this estimate
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 print:text-slate-800">
            {phone ? (
              <>
                Call{" "}
                <span className="font-semibold text-slate-900">{phone}</span>
              </>
            ) : null}
            {phone && email ? " or email " : email ? "Email " : null}
            {email ? (
              <span className="font-semibold text-slate-900">{email}</span>
            ) : null}
            .
          </p>
        </div>
      ) : null}
    </footer>
  );
}
