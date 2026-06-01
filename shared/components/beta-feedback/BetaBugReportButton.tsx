"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { submitBetaFeedbackReportAction } from "@/app/actions/beta-feedback";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetFooterActions,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
  MobileSheetSuccess,
} from "@/shared/components/ui/mobile-sheet";
import {
  BETA_FEEDBACK_EXPECTED_BEHAVIOR_MAX_LENGTH,
  BETA_FEEDBACK_MESSAGE_MAX_LENGTH,
  BETA_FEEDBACK_SEVERITY_OPTIONS,
  type BetaFeedbackSeverity,
} from "@/shared/types/beta-feedback";

const TITLE_ID = "beta-bug-report-sheet-title";
const FORM_ID = "beta-bug-report-form";

const textareaClassName =
  "mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/5 transition-shadow placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

type BetaBugReportButtonProps = {
  /** Position above technician bottom nav when true. */
  aboveMobileBottomNav?: boolean;
};

export function BetaBugReportButton({
  aboveMobileBottomNav = false,
}: BetaBugReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [severity, setSeverity] = useState<BetaFeedbackSeverity>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const closeDisabled = isSubmitting || showSuccess;

  function resetForm() {
    setMessage("");
    setExpectedBehavior("");
    setSeverity("medium");
    setError(null);
    setShowSuccess(false);
  }

  function handleOpen() {
    resetForm();
    setOpen(true);
  }

  function handleClose() {
    if (closeDisabled) {
      return;
    }

    setOpen(false);
    resetForm();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await submitBetaFeedbackReportAction({
        pageUrl: window.location.href,
        severity,
        message,
        expectedBehavior: expectedBehavior.trim() || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setShowSuccess(true);
      window.setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  }

  const positionClassName = aboveMobileBottomNav
    ? "bottom-[max(5.5rem,calc(5rem+env(safe-area-inset-bottom,0px)))]"
    : "bottom-[max(1rem,env(safe-area-inset-bottom))]";

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Report a bug"
        className={`fixed right-4 z-40 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-red-700/25 transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${positionClassName}`}
      >
        <Bug className="h-4 w-4 shrink-0" aria-hidden="true" />
        Bug
      </button>

      {open ? (
        <MobileSheet
          onClose={handleClose}
          closeDisabled={closeDisabled}
          ariaLabelledBy={TITLE_ID}
          variant="responsive"
          zIndex={60}
        >
          <MobileSheetPanel maxWidth="lg" responsiveRounded>
            <MobileSheetHeader
              titleId={TITLE_ID}
              title="Report a bug"
              subtitle="Tell us what broke so we can fix it"
              onClose={handleClose}
              closeDisabled={closeDisabled}
              icon={
                <MobileSheetHeaderIcon className="bg-red-50 ring-1 ring-red-600/15">
                  <Bug className="h-5 w-5 text-red-600" />
                </MobileSheetHeaderIcon>
              }
            />

            {showSuccess ? (
              <MobileSheetSuccess
                title="Thanks — bug report sent."
                subtitle="We'll review it soon."
              />
            ) : (
              <>
                <MobileSheetBody>
                  <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="beta-bug-message"
                        className="text-sm font-semibold text-slate-900"
                      >
                        What went wrong?
                        <span className="text-red-600"> *</span>
                      </label>
                      <textarea
                        id="beta-bug-message"
                        name="message"
                        required
                        rows={4}
                        maxLength={BETA_FEEDBACK_MESSAGE_MAX_LENGTH}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Describe the problem you ran into"
                        className={textareaClassName}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="beta-bug-expected"
                        className="text-sm font-semibold text-slate-900"
                      >
                        What were you trying to do?
                      </label>
                      <textarea
                        id="beta-bug-expected"
                        name="expectedBehavior"
                        rows={3}
                        maxLength={BETA_FEEDBACK_EXPECTED_BEHAVIOR_MAX_LENGTH}
                        value={expectedBehavior}
                        onChange={(event) => setExpectedBehavior(event.target.value)}
                        placeholder="Optional — what you expected to happen"
                        className={textareaClassName}
                      />
                    </div>

                    <fieldset>
                      <legend className="text-sm font-semibold text-slate-900">
                        Severity
                      </legend>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {BETA_FEEDBACK_SEVERITY_OPTIONS.map((option) => {
                          const selected = severity === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setSeverity(option.value)}
                              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                selected
                                  ? "border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600/20"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    {error ? (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                      >
                        {error}
                      </p>
                    ) : null}
                  </form>
                </MobileSheetBody>
                <MobileSheetFooter>
                  <MobileSheetFooterActions
                    onCancel={handleClose}
                    submitLabel="Send bug report"
                    submittingLabel="Sending..."
                    submitForm={FORM_ID}
                    isSubmitting={isSubmitting}
                    submitDisabled={!message.trim()}
                    submitClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </MobileSheetFooter>
              </>
            )}
          </MobileSheetPanel>
        </MobileSheet>
      ) : null}
    </>
  );
}
