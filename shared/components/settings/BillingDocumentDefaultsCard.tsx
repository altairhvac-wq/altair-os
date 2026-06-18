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
import { st } from "@/shared/components/settings/north-star-m10/settings-north-star-styles";

type BillingDocumentDefaultsCardProps = {
  initialDefaults: CompanyBillingDefaults;
  canManage: boolean;
  showSetupHint?: boolean;
  northStar?: boolean;
};

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

const legacyInputClass =
  "w-full min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:min-h-[44px] sm:py-2.5";

const legacyTextareaClass =
  "w-full min-h-[80px] max-w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:min-h-[96px] sm:py-2.5";

const legacyLabelClass = "mb-1 block text-xs font-semibold text-slate-600";

type CollapsibleNotesFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
  labelClass: string;
  textareaClass: string;
  northStar?: boolean;
};

function CollapsibleNotesField({
  id,
  label,
  value,
  placeholder,
  disabled,
  onChange,
  labelClass,
  textareaClass,
  northStar = false,
}: CollapsibleNotesFieldProps) {
  const [expanded, setExpanded] = useState(Boolean(value.trim()));

  return (
    <>
      <div className="md:hidden">
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={
              northStar
                ? "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-left text-sm transition-colors hover:bg-[#F3EBDD]"
                : "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
            }
          >
            <span
              className={
                northStar ? "font-medium text-[#4F4638]" : "font-medium text-slate-700"
              }
            >
              {label}
            </span>
            <span
              className={
                northStar ? "shrink-0 text-xs text-[#6B6255]" : "shrink-0 text-xs text-slate-400"
              }
            >
              Optional
            </span>
          </button>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={id} className={labelClass}>
                {label}
              </label>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className={
                  northStar
                    ? "text-xs font-medium text-[#6B6255] hover:text-[#4F4638]"
                    : "text-xs font-medium text-slate-500 hover:text-slate-700"
                }
              >
                Collapse
              </button>
            </div>
            <textarea
              id={id}
              name={id}
              rows={3}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              placeholder={placeholder}
              className={textareaClass}
            />
          </div>
        )}
      </div>

      <div className="hidden min-w-0 md:block">
        <label htmlFor={`${id}-desktop`} className={labelClass}>
          {label}
        </label>
        <textarea
          id={`${id}-desktop`}
          name={id}
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={textareaClass}
        />
      </div>
    </>
  );
}

export function BillingDocumentDefaultsCard({
  initialDefaults,
  canManage,
  showSetupHint = false,
  northStar = false,
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

  const inputClass = northStar ? st.formInput : legacyInputClass;
  const textareaClass = northStar ? st.formTextarea : legacyTextareaClass;
  const labelClass = northStar ? st.formLabel : legacyLabelClass;

  return (
    <div
      className={
        northStar
          ? "min-w-0 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-3 sm:p-4"
          : "admin-card min-w-0 p-3 sm:p-4"
      }
    >
      <div className="flex items-start gap-2.5">
        <div
          className={
            northStar
              ? "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)] sm:flex"
              : "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 sm:flex"
          }
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className={
              northStar
                ? "text-sm font-semibold text-[#17130E] sm:text-base"
                : "admin-heading-section text-sm sm:text-base"
            }
          >
            Billing Document Defaults
          </h2>
          <p
            className={
              northStar
                ? "mt-0.5 hidden text-xs text-[#6B6255] sm:block sm:text-sm"
                : "admin-text-helper mt-0.5 hidden sm:block"
            }
          >
            Default tax rate, payment terms, and notes for new estimates and
            invoices.
          </p>
          {showSetupHint && canManage ? (
            <p
              className={
                northStar
                  ? "mt-2 rounded-lg border border-[rgba(180,83,9,0.22)] bg-[rgba(255,247,237,0.75)] px-2.5 py-1.5 text-xs text-[#9A3412] sm:text-sm"
                  : "mt-2 rounded-lg border border-cyan-100 bg-cyan-50/60 px-2.5 py-1.5 text-xs text-cyan-900 sm:text-sm"
              }
            >
              Review these defaults before creating your first estimate or invoice.
              Save once to mark this setup step complete.
            </p>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-2.5 min-w-0 space-y-2.5 sm:mt-4 sm:space-y-3"
        aria-label="Billing document defaults"
        aria-busy={isPending}
      >
        <div className="grid min-w-0 gap-2.5 sm:grid-cols-3 sm:gap-3">
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

        <div className="grid min-w-0 gap-2.5 md:grid-cols-2 md:gap-3">
          <CollapsibleNotesField
            id="defaultEstimateNotes"
            label="Default estimate notes"
            value={formValues.defaultEstimateNotes}
            placeholder="Optional notes pre-filled on new estimates"
            disabled={!canManage || isPending}
            onChange={(value) => updateField("defaultEstimateNotes", value)}
            labelClass={labelClass}
            textareaClass={textareaClass}
            northStar={northStar}
          />

          <CollapsibleNotesField
            id="defaultInvoiceNotes"
            label="Default invoice notes"
            value={formValues.defaultInvoiceNotes}
            placeholder="Optional notes pre-filled on new invoices"
            disabled={!canManage || isPending}
            onChange={(value) => updateField("defaultInvoiceNotes", value)}
            labelClass={labelClass}
            textareaClass={textareaClass}
            northStar={northStar}
          />
        </div>

        {feedback ? (
          <SettingsAlertBanner tone={feedback.tone} northStar={northStar}>
            {feedback.message}
          </SettingsAlertBanner>
        ) : null}

        {canManage ? (
          <div
            className={
              northStar
                ? "border-t border-[rgba(138,99,36,0.12)] pt-2.5 sm:sticky sm:bottom-0 sm:-mx-4 sm:px-4 sm:py-2.5 sm:supports-[padding:max(0px)]:pb-[max(0.625rem,env(safe-area-inset-bottom))]"
                : "border-t border-slate-100 pt-2.5 sm:admin-sticky-footer-inline sm:sticky sm:bottom-0 sm:-mx-4 sm:px-4 sm:py-2.5 sm:supports-[padding:max(0px)]:pb-[max(0.625rem,env(safe-area-inset-bottom))]"
            }
          >
            <button
              type="submit"
              disabled={isPending}
              className={
                northStar
                  ? st.saveButton
                  : "inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px] sm:w-auto sm:py-2.5"
              }
            >
              {isPending ? "Saving..." : "Save billing defaults"}
            </button>
          </div>
        ) : (
          <p className={northStar ? "text-sm text-[#6B6255]" : "text-sm text-slate-500"}>
            Billing defaults can only be changed by owner and admin roles.
          </p>
        )}
      </form>
    </div>
  );
}
