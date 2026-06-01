"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import {
  clearBillingSignatureAction,
  saveBillingSignatureAction,
} from "@/app/actions/billing-signatures";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import { formatActionError, formatRetryGuidance } from "@/shared/lib/operational-errors";
import type { BillingSignatureBlockVariant } from "@/shared/lib/billing-signature-block";
import { getBillingSignatureBlockContent } from "@/shared/lib/billing-signature-block";
import type { BillingSignature } from "@/shared/types/billing-signature";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

type BillingSignatureCaptureSheetProps = {
  entityType: "estimate" | "invoice";
  entityId: string;
  documentNumber: string;
  customerId: string;
  jobId?: string | null;
  existingSignature?: BillingSignature | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerClassName?: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

const CAPTURE_SIGNATURE_TITLE_ID = "capture-signature-modal-title";

export function BillingSignatureCaptureSheet({
  entityType,
  entityId,
  documentNumber,
  customerId,
  jobId,
  existingSignature,
  open,
  onOpenChange,
  showTrigger = true,
  triggerClassName = "",
}: BillingSignatureCaptureSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const variant: BillingSignatureBlockVariant = entityType;
  const content = getBillingSignatureBlockContent(variant);
  const hasExistingSignature = Boolean(existingSignature);

  function setOpen(nextOpen: boolean) {
    if (isControlled) {
      onOpenChange?.(nextOpen);
      return;
    }

    setInternalOpen(nextOpen);
  }

  return (
    <>
      {showTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            triggerClassName ||
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          }
        >
          <PenLine className="h-4 w-4" />
          {hasExistingSignature ? "Update signature" : "Capture signature"}
        </button>
      ) : null}

      {isOpen ? (
        <CaptureSignatureModal
          entityType={entityType}
          entityId={entityId}
          documentNumber={documentNumber}
          customerId={customerId}
          jobId={jobId}
          contentLabel={content.label}
          existingSignature={existingSignature}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

type CaptureSignatureModalProps = {
  entityType: "estimate" | "invoice";
  entityId: string;
  documentNumber: string;
  customerId: string;
  jobId?: string | null;
  contentLabel: string;
  existingSignature?: BillingSignature | null;
  onClose: () => void;
};

function CaptureSignatureModal({
  entityType,
  entityId,
  documentNumber,
  customerId,
  jobId,
  contentLabel,
  existingSignature,
  onClose,
}: CaptureSignatureModalProps) {
  const router = useRouter();
  const padRef = useRef<SignaturePadHandle>(null);
  const [isPending, startTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(existingSignature?.signerName ?? "");
  const [hasDrawn, setHasDrawn] = useState(false);

  const formDisabled = isPending || isClearing;
  /** Block backdrop/Escape dismiss while drawing; Cancel still works explicitly. */
  const preventAccidentalDismiss = formDisabled || hasDrawn;

  function handleClearPad() {
    padRef.current?.clear();
    setHasDrawn(false);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formDisabled) {
      return;
    }

    setError(null);

    const signatureData = padRef.current?.toDataUrl();
    if (!signatureData) {
      setError("Draw a signature before saving.");
      return;
    }

    startTransition(async () => {
      const result = await saveBillingSignatureAction(
        entityType,
        entityId,
        {
          signerName,
          signatureData,
        },
        {
          customerId,
          jobId,
        },
      );

      if (result.error) {
        setError(
          formatRetryGuidance(
            formatActionError(
              result.error,
              "We couldn't save this signature. Try again.",
            ),
          ),
        );
        return;
      }

      router.refresh();
      onClose();
    });
  }

  function handleClearSavedSignature() {
    if (formDisabled || !existingSignature) {
      return;
    }

    setError(null);

    startClearTransition(async () => {
      const result = await clearBillingSignatureAction(
        entityType,
        entityId,
        {
          customerId,
          jobId,
        },
      );

      if (result.error) {
        setError(
          formatRetryGuidance(
            formatActionError(
              result.error,
              "We couldn't clear this signature. Try again.",
            ),
          ),
        );
        return;
      }

      router.refresh();
      onClose();
    });
  }

  return (
    <MobileSheet
      onClose={onClose}
      closeDisabled={preventAccidentalDismiss}
      ariaLabelledBy={CAPTURE_SIGNATURE_TITLE_ID}
      variant="responsive"
    >
      <MobileSheetPanel maxWidth="2xl" maxHeight="90" responsiveRounded>
        <MobileSheetHeader
          titleId={CAPTURE_SIGNATURE_TITLE_ID}
          title={contentLabel}
          subtitle={`${documentNumber} — have the customer sign below.`}
          onClose={onClose}
          closeDisabled={preventAccidentalDismiss}
          safeAreaTop
          icon={
            <MobileSheetHeaderIcon className="h-9 w-9 bg-cyan-100 text-cyan-700">
              <PenLine className="h-4 w-4" />
            </MobileSheetHeaderIcon>
          }
        />

        <form
          id="capture-signature-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <MobileSheetBody>
            <div className="space-y-4">
              <div>
                <label htmlFor="signature-signer-name" className={labelClass}>
                  Printed name
                </label>
                <input
                  id="signature-signer-name"
                  type="text"
                  value={signerName}
                  onChange={(event) => setSignerName(event.target.value)}
                  disabled={formDisabled}
                  autoComplete="name"
                  placeholder="Customer full name"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className={labelClass.replace("mb-1.5 ", "")}>
                    Signature
                  </span>
                  <button
                    type="button"
                    onClick={handleClearPad}
                    disabled={formDisabled}
                    className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50"
                  >
                    Clear drawing
                  </button>
                </div>
                <SignaturePad
                  ref={padRef}
                  disabled={formDisabled}
                  onStroke={() => setHasDrawn(true)}
                />
                {!hasDrawn ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Use a finger or stylus to sign in the box above.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          </MobileSheetBody>

          <MobileSheetFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
            {existingSignature ? (
              <button
                type="button"
                onClick={handleClearSavedSignature}
                disabled={formDisabled}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isClearing ? "Clearing…" : "Clear saved signature"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={formDisabled}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formDisabled}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:ml-auto sm:w-auto"
            >
              {isPending ? "Saving…" : "Save signature"}
            </button>
          </MobileSheetFooter>
        </form>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
