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
  compact?: boolean;
  /** Compact blank signature lines for print/PDF only (no captured image card). */
  printTemplate?: boolean;
};

function SignatureField({
  label,
  compact = false,
  printTemplate = false,
}: {
  label: string;
  compact?: boolean;
  printTemplate?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-600 print:text-slate-700">
        {label}
      </p>
      <div
        aria-hidden="true"
        className={`mt-0.5 border-b border-slate-400 print:border-slate-500 ${
          printTemplate
            ? "h-6 print:h-7"
            : compact
              ? "h-8 print:h-9"
              : "h-10 print:h-12"
        }`}
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
  compact = false,
}: {
  label: string;
  signatureData: string;
  premium?: boolean;
  compact?: boolean;
}) {
  if (!isValidSignatureData(signatureData)) {
    return <SignatureField label={label} compact={compact} />;
  }

  if (premium) {
    return (
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 print:text-slate-600">
          {label}
        </p>
        <div
          className={`mt-1.5 flex items-end rounded-lg border border-slate-200 bg-white px-3 py-2 print:rounded-none print:border-slate-300 print:bg-white ${compact ? "min-h-16 print:min-h-14" : "min-h-24 print:min-h-20"} print:px-0`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signatureData}
            alt={label}
            className={`w-auto max-w-full object-contain object-left ${compact ? "max-h-14 print:max-h-12" : "max-h-20 print:max-h-16"}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-600 print:text-slate-700">
        {label}
      </p>
      <div
        className={`mt-1 flex items-end border-b border-slate-400 pb-0.5 print:border-slate-500 ${compact ? "min-h-12 print:min-h-14" : "min-h-16 print:min-h-20"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signatureData}
          alt={label}
          className={`w-auto max-w-full object-contain object-left ${compact ? "max-h-12 print:max-h-14" : "max-h-16 print:max-h-20"}`}
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
  compact = false,
  printTemplate = false,
}: BillingSignatureBlockProps) {
  const isPremiumStyle =
    !printTemplate && isPremiumBillingDocumentStyle(documentStyle);
  const isEstimateStyle = documentStyle === "estimate";
  const content = getBillingSignatureBlockContent(variant);
  const hasCapturedSignature =
    !printTemplate &&
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

  const useCompactFields = compact || printTemplate;

  const innerContent = (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
        <h3
          className={
            printTemplate
              ? "text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 print:text-slate-600"
              : isPremiumStyle
                ? "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600"
                : "text-[11px] font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700"
          }
        >
          {content.label}
        </h3>
        {isPremiumStyle && hasCapturedSignature ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80 print:rounded-none print:bg-white print:px-0 print:py-0 print:text-slate-900 print:ring-0">
            <CheckCircle2 className="h-3 w-3 print:hidden" />
            {isEstimateStyle ? "Signed & approved" : "Signed & accepted"}
          </span>
        ) : null}
      </div>

      <div
        className={
          printTemplate
            ? "mt-1.5 grid gap-2 print:grid-cols-2 print:gap-3"
            : compact
              ? "mt-2 grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-4"
              : isPremiumStyle
                ? "mt-4 grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-6"
                : "mt-3 grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-6"
        }
      >
        <div className="sm:col-span-2 print:col-span-2">
          {hasCapturedSignature ? (
            <CapturedSignatureImage
              label={content.fields.signature}
              signatureData={signature.signatureData}
              premium={isPremiumStyle}
              compact={useCompactFields}
            />
          ) : (
            <SignatureField
              label={content.fields.signature}
              compact={useCompactFields}
              printTemplate={printTemplate}
            />
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
            <SignatureField
              label={content.fields.printedName}
              compact={useCompactFields}
              printTemplate={printTemplate}
            />
            <SignatureField
              label={content.fields.date}
              compact={useCompactFields}
              printTemplate={printTemplate}
            />
          </>
        )}
      </div>

      <p
        className={
          printTemplate
            ? "mt-1.5 text-[10px] leading-snug text-slate-500 print:mt-1 print:text-slate-600"
            : compact
              ? "mt-2 text-[11px] leading-snug text-slate-500 print:mt-1.5 print:text-slate-600"
              : isPremiumStyle
                ? "mt-3 text-xs leading-relaxed text-slate-500 print:mt-2 print:text-slate-600"
                : "mt-3 text-xs leading-relaxed text-slate-500 print:text-slate-600"
        }
      >
        {content.supportingText}
      </p>
    </>
  );

  const shellClass = printTemplate
    ? "border-t border-slate-200 pt-2 print:mt-1.5 print:pt-1.5 print:break-inside-avoid"
    : compact
      ? "border-t border-slate-200 pt-3 print:mt-2 print:pt-2 print:break-inside-avoid"
      : "border-t border-slate-200 pt-6 print:mt-4 print:pt-4 print:break-inside-avoid";

  return (
    <div className={`${shellClass} ${className}`}>
      {isPremiumStyle ? (
        <div
          className={
            compact
              ? "rounded-lg border border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3 print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-0"
              : "rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-0"
          }
        >
          {innerContent}
        </div>
      ) : (
        innerContent
      )}
    </div>
  );
}
