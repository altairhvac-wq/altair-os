import { formatDate } from "@/shared/types/customer";

type InvoiceIdentityCardProps = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
};

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 print:text-slate-600">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900 print:text-base">
        {value}
      </dd>
    </div>
  );
}

export function InvoiceIdentityCard({
  invoiceNumber,
  issueDate,
  dueDate,
}: InvoiceIdentityCardProps) {
  return (
    <div className="invoice-identity-card rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-5 ring-1 ring-slate-100 sm:px-6 sm:py-6 print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-0 print:ring-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 print:text-slate-600">
        Invoice details
      </p>
      <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl print:mt-2 print:text-2xl">
        {invoiceNumber}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200/80 pt-5 print:mt-4 print:border-slate-300 print:pt-4">
        <MetaField label="Issue date" value={formatDate(issueDate)} />
        <MetaField label="Due date" value={formatDate(dueDate)} />
      </dl>
    </div>
  );
}
