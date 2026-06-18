import { formatDate } from "@/shared/types/customer";

type InvoiceIdentityCardProps = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  northStar?: boolean;
};

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[10px] sm:tracking-[0.1em] print:text-slate-600">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900 sm:mt-1 sm:text-sm print:text-base">
        {value}
      </dd>
    </div>
  );
}

export function InvoiceIdentityCard({
  invoiceNumber,
  issueDate,
  dueDate,
  northStar = false,
}: InvoiceIdentityCardProps) {
  if (northStar) {
    const numberClass =
      "text-sm font-bold tabular-nums tracking-tight text-[#17130E] sm:text-base print:text-sm";
    const metaClass =
      "text-xs leading-snug text-[#6B6255] print:text-slate-700";

    return (
      <div className="invoice-document-meta min-w-0">
        <p className={numberClass}>{invoiceNumber}</p>
        <p className={`mt-0.5 ${metaClass}`}>
          Issued {formatDate(issueDate)}
          <span className="text-[#8A6324]" aria-hidden>
            {" "}
            ·{" "}
          </span>
          Due {formatDate(dueDate)}
        </p>
      </div>
    );
  }

  return (
    <div className="invoice-identity-card rounded-lg border border-slate-200 bg-white px-3 py-3 ring-1 ring-slate-100 sm:rounded-xl sm:px-5 sm:py-5 md:px-6 md:py-6 print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-0 print:ring-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em] print:text-slate-600">
        Invoice details
      </p>
      <p className="mt-1.5 break-words text-lg font-bold tracking-tight text-slate-900 sm:mt-3 sm:text-2xl md:text-3xl print:mt-2 print:text-2xl">
        {invoiceNumber}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-200/80 pt-3 sm:mt-5 sm:gap-x-6 sm:gap-y-4 sm:pt-5 print:mt-4 print:border-slate-300 print:pt-4">
        <MetaField label="Issue date" value={formatDate(issueDate)} />
        <MetaField label="Due date" value={formatDate(dueDate)} />
      </dl>
    </div>
  );
}
