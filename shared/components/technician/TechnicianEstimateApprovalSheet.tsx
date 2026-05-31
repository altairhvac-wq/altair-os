"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { approveEstimateOnSiteAction } from "@/app/actions/estimates";
import { SignaturePad, type SignaturePadHandle } from "@/shared/components/billing/SignaturePad";
import { getBillingSignatureBlockContent } from "@/shared/lib/billing-signature-block";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
  MobileSheetSuccess,
} from "@/shared/components/ui/mobile-sheet";

type TechnicianEstimateApprovalSheetProps = {
  estimateId: string;
  estimateNumber: string;
  jobNumber: string;
  customerName: string;
  onClose: () => void;
  onApproved?: () => void;
};

const TITLE_ID = "technician-estimate-approval-sheet-title";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function TechnicianEstimateApprovalSheet({
  estimateId,
  estimateNumber,
  jobNumber,
  customerName,
  onClose,
  onApproved,
}: TechnicianEstimateApprovalSheetProps) {
  const router = useRouter();
  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const [signerName, setSignerName] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const content = getBillingSignatureBlockContent("estimate");
  const closeDisabled = isPending || showSuccess;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const signatureData = signaturePadRef.current?.toDataUrl();
    if (!signatureData) {
      setError("Please capture the customer signature before approving.");
      return;
    }

    const formData = new FormData();
    formData.set("signerName", signerName);
    formData.set("signatureData", signatureData);
    if (authorized) {
      formData.set("authorized", "on");
    }

    startTransition(async () => {
      const result = await approveEstimateOnSiteAction(estimateId, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setShowSuccess(true);
      onApproved?.();
      router.refresh();

      window.setTimeout(() => {
        onClose();
      }, 1200);
    });
  }

  return (
    <MobileSheet
      onClose={onClose}
      closeDisabled={closeDisabled}
      ariaLabelledBy={TITLE_ID}
    >
      <MobileSheetPanel>
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Approve estimate on site"
          subtitle={`${estimateNumber} · ${customerName}`}
          onClose={onClose}
          closeDisabled={closeDisabled}
          icon={
            <MobileSheetHeaderIcon className="bg-emerald-50 ring-1 ring-emerald-600/15">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            </MobileSheetHeaderIcon>
          }
        />

        {showSuccess ? (
          <MobileSheetSuccess
            title="Estimate approved"
            subtitle="Work authorized — complete when finished on site."
          />
        ) : (
          <>
            <MobileSheetBody>
              <form
                id="technician-estimate-approval-form"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <p className="text-xs leading-relaxed text-slate-600">
                  {content.supportingText} Job {jobNumber}.
                </p>

                <div>
                  <label htmlFor="on-site-signer-name" className={labelClass}>
                    Customer printed name
                  </label>
                  <input
                    id="on-site-signer-name"
                    name="signerName"
                    type="text"
                    autoComplete="name"
                    value={signerName}
                    onChange={(event) => setSignerName(event.target.value)}
                    className={inputClass}
                    placeholder="Customer full name"
                    disabled={isPending}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Customer signature</label>
                  <SignaturePad ref={signaturePadRef} disabled={isPending} />
                </div>

                <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(event) => setAuthorized(event.target.checked)}
                    disabled={isPending}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>
                    The customer authorizes the proposed work in this estimate.
                  </span>
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  >
                    {error}
                  </p>
                ) : null}
              </form>
            </MobileSheetBody>
            <MobileSheetFooter>
              <button
                type="button"
                onClick={onClose}
                disabled={closeDisabled}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="technician-estimate-approval-form"
                disabled={isPending}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 sm:ml-auto sm:w-auto"
              >
                {isPending ? "Approving…" : "Approve & authorize work"}
              </button>
            </MobileSheetFooter>
          </>
        )}
      </MobileSheetPanel>
    </MobileSheet>
  );
}
