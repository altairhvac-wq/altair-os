"use client";

import { useState } from "react";
import { Flag, Lightbulb, MessageCircle } from "lucide-react";
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

type FeedbackIntent = "feedback" | "issue" | "feature";

const INTENT_COPY: Record<
  FeedbackIntent,
  { title: string; subtitle: string; severity: BetaFeedbackSeverity; placeholder: string }
> = {
  feedback: {
    title: "Send feedback",
    subtitle: "Tell us what feels smooth — or what should feel smoother.",
    severity: "medium",
    placeholder: "What should we know?",
  },
  issue: {
    title: "Report an issue",
    subtitle: "Something broken, confusing, or slower than it should be?",
    severity: "high",
    placeholder: "What went wrong, and where were you?",
  },
  feature: {
    title: "Request a feature",
    subtitle: "What would make Altair more useful for your crew?",
    severity: "low",
    placeholder: "Describe the capability you need",
  },
};

const textareaClassName =
  "mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-shadow placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";

type ClosedBetaFeedbackStripProps = {
  northStar?: boolean;
  className?: string;
};

export function ClosedBetaFeedbackStrip({
  northStar = false,
  className = "",
}: ClosedBetaFeedbackStripProps) {
  const [intent, setIntent] = useState<FeedbackIntent | null>(null);
  const [message, setMessage] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [severity, setSeverity] = useState<BetaFeedbackSeverity>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const open = intent !== null;
  const copy = intent ? INTENT_COPY[intent] : null;
  const closeDisabled = isSubmitting || showSuccess;
  const titleId = "closed-beta-feedback-title";
  const formId = "closed-beta-feedback-form";

  function openIntent(next: FeedbackIntent) {
    setIntent(next);
    setMessage(next === "feature" ? "[Feature request] " : "");
    setExpectedBehavior("");
    setSeverity(INTENT_COPY[next].severity);
    setError(null);
    setShowSuccess(false);
  }

  function handleClose() {
    if (closeDisabled) {
      return;
    }
    setIntent(null);
    setMessage("");
    setExpectedBehavior("");
    setError(null);
    setShowSuccess(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intent) {
      return;
    }

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
        setIntent(null);
        setMessage("");
        setExpectedBehavior("");
        setError(null);
        setShowSuccess(false);
      }, 1100);
    } finally {
      setIsSubmitting(false);
    }
  }

  const linkClass = northStar
    ? "text-[#8A6324] underline-offset-2 hover:underline"
    : "text-cyan-700 underline-offset-2 hover:underline";

  return (
    <>
      <aside
        className={`flex min-w-0 flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
          northStar
            ? "border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]"
            : "border-slate-200/80 bg-slate-50/80"
        } ${className}`.trim()}
        aria-label="Closed beta"
      >
        <p
          className={`text-xs leading-relaxed ${
            northStar ? "text-[#4F4638]" : "text-slate-600"
          }`}
        >
          Thanks for helping shape Altair.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
          <button type="button" onClick={() => openIntent("feedback")} className={linkClass}>
            Feedback
          </button>
          <button type="button" onClick={() => openIntent("issue")} className={linkClass}>
            Report issue
          </button>
          <button type="button" onClick={() => openIntent("feature")} className={linkClass}>
            Request feature
          </button>
        </div>
      </aside>

      {open && copy ? (
        <MobileSheet
          onClose={handleClose}
          closeDisabled={closeDisabled}
          ariaLabelledBy={titleId}
          variant="responsive"
          zIndex={60}
        >
          <MobileSheetPanel maxWidth="lg" responsiveRounded>
            <MobileSheetHeader
              titleId={titleId}
              title={copy.title}
              subtitle={copy.subtitle}
              onClose={handleClose}
              closeDisabled={closeDisabled}
              icon={
                <MobileSheetHeaderIcon className="bg-sky-50 ring-1 ring-sky-600/15">
                  {intent === "issue" ? (
                    <Flag className="h-5 w-5 text-sky-600" />
                  ) : intent === "feature" ? (
                    <Lightbulb className="h-5 w-5 text-sky-600" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-sky-600" />
                  )}
                </MobileSheetHeaderIcon>
              }
            />

            {showSuccess ? (
              <MobileSheetSuccess
                title="Thanks — feedback sent."
                subtitle="We'll review it soon."
              />
            ) : (
              <>
                <MobileSheetBody>
                  <form id={formId} onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="closed-beta-message"
                        className="text-sm font-semibold text-slate-900"
                      >
                        Details
                        <span className="text-sky-600"> *</span>
                      </label>
                      <textarea
                        id="closed-beta-message"
                        name="message"
                        required
                        rows={4}
                        maxLength={BETA_FEEDBACK_MESSAGE_MAX_LENGTH}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={copy.placeholder}
                        className={textareaClassName}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="closed-beta-expected"
                        className="text-sm font-semibold text-slate-900"
                      >
                        Context
                        <span className="ml-1 text-xs font-normal text-slate-500">
                          optional
                        </span>
                      </label>
                      <textarea
                        id="closed-beta-expected"
                        name="expectedBehavior"
                        rows={2}
                        maxLength={BETA_FEEDBACK_EXPECTED_BEHAVIOR_MAX_LENGTH}
                        value={expectedBehavior}
                        onChange={(event) => setExpectedBehavior(event.target.value)}
                        placeholder="Optional — what you were trying to do"
                        className={textareaClassName}
                      />
                    </div>

                    <fieldset>
                      <legend className="text-sm font-semibold text-slate-900">
                        How serious is it?
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
                                  ? "border-sky-600 bg-sky-50 text-sky-700 ring-1 ring-sky-600/20"
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
                    submitLabel="Send"
                    submittingLabel="Sending..."
                    submitForm={formId}
                    isSubmitting={isSubmitting}
                    submitDisabled={!message.trim()}
                    submitClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
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
