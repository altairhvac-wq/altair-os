"use client";

import { useRef, useState, useTransition } from "react";
import { submitPublicEstimateApprovalAction } from "@/app/actions/estimate-public-approval";
import { SignaturePad, type SignaturePadHandle } from "@/shared/components/billing/SignaturePad";
import { getBillingSignatureBlockContent } from "@/shared/lib/billing-signature-block";

type PublicEstimateApprovalFormProps = {
  rawToken: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function PublicEstimateApprovalForm({
  rawToken,
}: PublicEstimateApprovalFormProps) {
  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const [signerName, setSignerName] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const content = getBillingSignatureBlockContent("estimate");

  function handleClearSignature() {
    signaturePadRef.current?.clear();
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const signatureData = signaturePadRef.current?.toDataUrl();

    if (!signatureData) {
      setError("Please draw your signature before approving.");
      return;
    }

    const formData = new FormData();
    formData.set("signerName", signerName);
    formData.set("signatureData", signatureData);
    if (authorized) {
      formData.set("authorized", "on");
    }

    startTransition(async () => {
      const result = await submitPublicEstimateApprovalAction(
        rawToken,
        formData,
      );

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-bold text-slate-900">Sign &amp; approve</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {content.supportingText}
      </p>

      <div className="mt-5">
        <label htmlFor="signer-name" className={labelClass}>
          Printed name
        </label>
        <input
          id="signer-name"
          name="signerName"
          type="text"
          autoComplete="name"
          value={signerName}
          onChange={(event) => setSignerName(event.target.value)}
          className={inputClass}
          placeholder="Your full name"
          disabled={isPending}
          required
        />
      </div>

      <div className="mt-5">
        <label className={labelClass}>Signature</label>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SignaturePad ref={signaturePadRef} disabled={isPending} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleClearSignature}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            Clear signature
          </button>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-slate-700">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(event) => setAuthorized(event.target.checked)}
          disabled={isPending}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
        />
        <span>I authorize the proposed work described in this estimate.</span>
      </label>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
      >
        {isPending ? "Submitting…" : "Approve & Sign"}
      </button>
    </form>
  );
}
