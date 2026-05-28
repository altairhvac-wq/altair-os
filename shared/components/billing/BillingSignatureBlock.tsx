import {
  getBillingSignatureBlockContent,
  type BillingSignatureBlockVariant,
} from "@/shared/lib/billing-signature-block";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { isValidSignatureData } from "@/shared/lib/billing-signature-validation";
import type { BillingSignature } from "@/shared/types/billing-signature";

type BillingSignatureBlockProps = {
  variant: BillingSignatureBlockVariant;
  signature?: BillingSignature | null;
  companyTimeZone?: string;
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

function CapturedValueField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-600 print:text-slate-700">
        {label}
      </p>
      <p className="mt-2 min-h-10 border-b border-slate-400 pb-1 text-sm font-medium text-slate-900 print:min-h-12 print:border-slate-500 print:text-base">
        {value}
      </p>
    </div>
  );
}

function CapturedSignatureImage({
  label,
  signatureData,
}: {
  label: string;
  signatureData: string;
}) {
  if (!isValidSignatureData(signatureData)) {
    return <SignatureField label={label} />;
  }

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-600 print:text-slate-700">
        {label}
      </p>
      <div className="mt-2 flex min-h-16 items-end border-b border-slate-400 pb-1 print:min-h-20 print:border-slate-500">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signatureData}
          alt={label}
          className="max-h-16 w-auto max-w-full object-contain object-left print:max-h-20"
        />
      </div>
    </div>
  );
}

export function BillingSignatureBlock({
  variant,
  signature,
  companyTimeZone,
  className = "",
}: BillingSignatureBlockProps) {
  const content = getBillingSignatureBlockContent(variant);
  const hasCapturedSignature =
    signature &&
    isValidSignatureData(signature.signatureData) &&
    signature.signerName.trim().length > 0;

  const signedDateLabel = hasCapturedSignature
    ? formatDateTimeInTimeZone(signature.signedAt, companyTimeZone, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={`border-t border-slate-200 pt-6 print:mt-8 print:pt-8 print:break-inside-avoid ${className}`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
        {content.label}
      </h3>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 print:grid-cols-2 print:gap-8">
        <div className="sm:col-span-2 print:col-span-2">
          {hasCapturedSignature ? (
            <CapturedSignatureImage
              label={content.fields.signature}
              signatureData={signature.signatureData}
            />
          ) : (
            <SignatureField label={content.fields.signature} />
          )}
        </div>

        {hasCapturedSignature && signedDateLabel ? (
          <>
            <CapturedValueField
              label={content.fields.printedName}
              value={signature.signerName}
            />
            <CapturedValueField
              label={content.fields.date}
              value={signedDateLabel}
            />
          </>
        ) : (
          <>
            <SignatureField label={content.fields.printedName} />
            <SignatureField label={content.fields.date} />
          </>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500 print:text-slate-600">
        {content.supportingText}
      </p>
    </div>
  );
}
