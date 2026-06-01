"use client";

import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { updateCompanyBillingDefaultsAction } from "@/app/actions/company-settings";
import {
  companyBillingDefaultsToFormValues,
  type CompanyBillingDefaults,
  type CompanyBillingDefaultsInput,
} from "@/shared/lib/company-billing-defaults";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

type BillingDocumentDefaultsCardProps = {
  initialDefaults: CompanyBillingDefaults;
  canManage: boolean;
  showSetupHint?: boolean;
};

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

const inputClass =
  "w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const textareaClass =
  "w-full min-h-[96px] max-w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function BillingDocumentDefaultsCard({
  initialDefaults,
  canManage,
  showSetupHint = false,
}: BillingDocumentDefaultsCardProps) {
  const [formValues, setFormValues] = useState<CompanyBillingDefaultsInput>(() =>
    companyBillingDefaultsToFormValues(initialDefaults),
  );
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof CompanyBillingDefaultsInput>(
    key: K,
    value: CompanyBillingDefaultsInput[K],
  ) {
    setFormValues((previous) => ({ ...previous, [key]: value }));
    setFeedback(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || isPending) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result = await updateCompanyBillingDefaultsAction(formValues);

      if (result.error) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }

      if (result.defaults) {
        setFormValues(companyBillingDefaultsToFormValues(result.defaults));
      }

      setFeedback({
        tone: "success",
        message: "Billing document defaults saved.",
      });
    });
  }

  return (
    <div className="admin-card min-w-0 p-3.5 sm:p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="admin-heading-section text-sm sm:text-base">
            Billing Document Defaults
          </h2>
          <p className="admin-text-helper mt-0.5">
            Default tax rate, payment terms, and notes for new estimates and
            invoices.
          </p>
          {showSetupHint && canManage ? (
            <p className="mt-2 rounded-lg border border-cyan-100 bg-cyan-50/60 px-2.5 py-1.5 text-xs text-cyan-900 sm:text-sm">
              Review these defaults before creating your first estimate or invoice.
              Save once to mark this setup step complete.
            </p>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-3 min-w-0 space-y-3 sm:mt-4"
        aria-label="Billing document defaults"
        aria-busy={isPending}
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          <div className="min-w-0">
            <label htmlFor="defaultTaxRate" className={labelClass}>
              Default tax rate (%)
            </label>
            <input
              id="defaultTaxRate"
              name="defaultTaxRate"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              value={formValues.defaultTaxRate}
              onChange={(event) =>
                updateField("defaultTaxRate", event.target.value)
              }
              disabled={!canManage || isPending}
              className={inputClass}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="defaultPaymentTermsDays" className={labelClass}>
              Invoice payment terms (days)
            </label>
            <input
              id="defaultPaymentTermsDays"
              name="defaultPaymentTermsDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              step={1}
              value={formValues.defaultPaymentTermsDays}
              onChange={(event) =>
                updateField("defaultPaymentTermsDays", event.target.value)
              }
              disabled={!canManage || isPending}
              className={inputClass}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="defaultEstimateExpirationDays" className={labelClass}>
              Estimate validity (days)
            </label>
            <input
              id="defaultEstimateExpirationDays"
              name="defaultEstimateExpirationDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              step={1}
              value={formValues.defaultEstimateExpirationDays}
              onChange={(event) =>
                updateField("defaultEstimateExpirationDays", event.target.value)
              }
              disabled={!canManage || isPending}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="defaultEstimateNotes" className={labelClass}>
              Default estimate notes
            </label>
            <textarea
              id="defaultEstimateNotes"
              name="defaultEstimateNotes"
              rows={4}
              value={formValues.defaultEstimateNotes}
              onChange={(event) =>
                updateField("defaultEstimateNotes", event.target.value)
              }
              disabled={!canManage || isPending}
              placeholder="Optional notes pre-filled on new estimates"
              className={textareaClass}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="defaultInvoiceNotes" className={labelClass}>
              Default invoice notes
            </label>
            <textarea
              id="defaultInvoiceNotes"
              name="defaultInvoiceNotes"
              rows={4}
              value={formValues.defaultInvoiceNotes}
              onChange={(event) =>
                updateField("defaultInvoiceNotes", event.target.value)
              }
              disabled={!canManage || isPending}
              placeholder="Optional notes pre-filled on new invoices"
              className={textareaClass}
            />
          </div>
        </div>

        {feedback ? (
          <SettingsAlertBanner tone={feedback.tone}>
            {feedback.message}
          </SettingsAlertBanner>
        ) : null}

        {canManage ? (
          <div className="admin-sticky-footer-inline sticky bottom-0 -mx-3.5 px-3.5 py-2.5 supports-[padding:max(0px)]:pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:-mx-4 sm:px-4">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isPending ? "Saving..." : "Save billing defaults"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Billing defaults can only be changed by owner and admin roles.
          </p>
        )}
      </form>
    </div>
  );
}
