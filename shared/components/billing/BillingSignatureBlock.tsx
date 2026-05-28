import {
  getBillingSignatureBlockContent,
  type BillingSignatureBlockVariant,
} from "@/shared/lib/billing-signature-block";

type BillingSignatureBlockProps = {
  variant: BillingSignatureBlockVariant;
  className?: string;
};

function SignatureField({ label }: { label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-600 print:text-slate-700">
        {label}
      </p>
      <div
        aria-hidden="true"
        className="mt-2 h-10 border-b border-slate-400 print:h-12 print:border-slate-500"
      />
    </div>
  );
}

export function BillingSignatureBlock({
  variant,
  className = "",
}: BillingSignatureBlockProps) {
  const content = getBillingSignatureBlockContent(variant);

  return (
    <div
      className={`border-t border-slate-200 pt-6 print:mt-8 print:pt-8 print:break-inside-avoid ${className}`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
        {content.label}
      </h3>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 print:grid-cols-2 print:gap-8">
        <div className="sm:col-span-2 print:col-span-2">
          <SignatureField label={content.fields.signature} />
        </div>
        <SignatureField label={content.fields.printedName} />
        <SignatureField label={content.fields.date} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500 print:text-slate-600">
        {content.supportingText}
      </p>
    </div>
  );
}
