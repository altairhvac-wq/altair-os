import { CheckCircle2 } from "lucide-react";
import {
  getBillingSignatureBlockContent,
  type BillingSignatureBlockVariant,
} from "@/shared/lib/billing-signature-block";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { isValidSignatureData } from "@/shared/lib/billing-signature-validation";
import {
  isPremiumBillingDocumentStyle,
  type BillingDocumentStyle,
} from "@/shared/lib/billing-document-style";
import type { BillingSignature } from "@/shared/types/billing-signature";

type BillingSignatureBlockProps = {
  variant: BillingSignatureBlockVariant;
  signature?: BillingSignature | null;
  companyTimeZone?: string;
  documentStyle?: BillingDocumentStyle;
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
  premium = false,
}: {
  label: string;
  value: string;
  premium?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={
          premium
            ? "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 print:text-slate-600"
            : "text-xs font-medium text-slate-600 print:text-slate-700"
        }
      >
        {label}
      </p>
      <p
        className={
          premium
            ? "mt-1.5 text-base font-semibold text-slate-900 print:text-sm"
            : "mt-2 min-h-10 border-b border-slate-400 pb-1 text-sm font-medium text-slate-900 print:min-h-12 print:border-slate-500 print:text-base"
        }
      >
        {value}
      </p>
    </div>
  );
}

function CapturedSignatureImage({
  label,
  signatureData,
  premium = false,
}: {
  label: string;
  signatureData: string;
  premium?: boolean;
}) {
  if (!isValidSignatureData(signatureData)) {
    return <SignatureField label={label} />;
  }

  if (premium) {
    return (
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 print:text-slate-600">
          {label}
        </p>
        <div className="mt-3 flex min-h-24 items-end rounded-lg border border-slate-200 bg-white px-4 py-3 print:min-h-20 print:rounded-none print:border-slate-300 print:bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signatureData}
            alt={label}
            className="max-h-20 w-auto max-w-full object-contain object-left print:max-h-16"
          />
        </div>
      </div>
    );
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
  documentStyle = "default",
  className = "",
}: BillingSignatureBlockProps) {
  const isPremiumStyle = isPremiumBillingDocumentStyle(documentStyle);
  const isEstimateStyle = documentStyle === "estimate";
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

  const innerContent = (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
        <h3
          className={
            isPremiumStyle
              ? "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600"
              : "text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700"
          }
        >
          {content.label}
        </h3>
        {isPremiumStyle && hasCapturedSignature ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80 print:rounded-none print:bg-white print:px-0 print:py-0 print:text-slate-900 print:ring-0">
            <CheckCircle2 className="h-3.5 w-3.5 print:hidden" />
            {isEstimateStyle ? "Signed & approved" : "Signed & accepted"}
          </span>
        ) : null}
      </div>

      <div
        className={
          isPremiumStyle
            ? "mt-5 grid gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-8"
            : "mt-4 grid gap-5 sm:grid-cols-2 print:grid-cols-2 print:gap-8"
        }
      >
        <div className="sm:col-span-2 print:col-span-2">
          {hasCapturedSignature ? (
            <CapturedSignatureImage
              label={content.fields.signature}
              signatureData={signature.signatureData}
              premium={isPremiumStyle}
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
              premium={isPremiumStyle}
            />
            <CapturedValueField
              label={content.fields.date}
              value={signedDateLabel}
              premium={isPremiumStyle}
            />
          </>
        ) : (
          <>
            <SignatureField label={content.fields.printedName} />
            <SignatureField label={content.fields.date} />
          </>
        )}
      </div>

      <p
        className={
          isPremiumStyle
            ? "mt-5 text-xs leading-relaxed text-slate-500 print:mt-4 print:text-slate-600"
            : "mt-4 text-xs leading-relaxed text-slate-500 print:text-slate-600"
        }
      >
        {content.supportingText}
      </p>
    </>
  );

  return (
    <div
      className={`border-t border-slate-200 pt-8 print:mt-8 print:pt-8 print:break-inside-avoid ${className}`}
    >
      {isPremiumStyle ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-6 print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-0">
          {innerContent}
        </div>
      ) : (
        innerContent
      )}
    </div>
  );
}
