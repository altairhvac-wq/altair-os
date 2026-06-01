"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Copy,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { generateInvoiceMessageDraftAction } from "@/app/actions/invoice-ai";
import { formatActionError } from "@/shared/lib/operational-errors";

type InvoiceMessageAiAssistantProps = {
  invoiceId: string;
  aiFeaturesEnabled: boolean;
};

function getHideReason(aiFeaturesEnabled: boolean): string | null {
  if (!aiFeaturesEnabled) {
    return "AI disabled (set AI_FEATURES_ENABLED=true and restart the dev server)";
  }

  return null;
}

export function InvoiceMessageAiAssistant({
  invoiceId,
  aiFeaturesEnabled,
}: InvoiceMessageAiAssistantProps) {
  const [draftText, setDraftText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isVisible = aiFeaturesEnabled;
  const hideReason = getHideReason(aiFeaturesEnabled);

  if (process.env.NODE_ENV === "development" && hideReason) {
    console.debug(`[InvoiceMessageAiAssistant] hidden: ${hideReason}`);
  }

  if (!isVisible) {
    if (process.env.NODE_ENV === "development" && hideReason) {
      return (
        <p className="text-[10px] text-amber-700" aria-hidden="true">
          Dev: AI invoice message hidden — {hideReason}
        </p>
      );
    }

    return null;
  }

  function handleDraft() {
    if (isPending) {
      return;
    }

    setError(null);
    setIsDismissed(false);
    setCopied(false);

    startTransition(async () => {
      const result = await generateInvoiceMessageDraftAction(invoiceId);

      if (result.error || !result.draftText?.trim()) {
        setError(
          formatActionError(
            result.error,
            "Could not draft the invoice message. Try again.",
          ),
        );
        return;
      }

      setDraftText(result.draftText.trim());
    });
  }

  async function handleCopy() {
    if (!draftText?.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  function handleDismiss() {
    setIsDismissed(true);
    setError(null);
  }

  const showPanel = draftText && !isDismissed;

  return (
    <section className="rounded-xl border border-cyan-100 bg-cyan-50/30 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleDraft}
          disabled={isPending}
          aria-busy={isPending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:w-auto sm:px-2.5 sm:py-1.5 sm:text-xs"
        >
          {isPending ? (
            <Loader2
              className="h-4 w-4 animate-spin sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
          ) : (
            <Sparkles
              className="h-4 w-4 sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
          )}
          {isPending ? "Drafting…" : "Draft payment message"}
        </button>

        {!isPending && !showPanel ? (
          <p className="text-[11px] text-slate-500 sm:text-right">
            Create a customer-ready invoice message.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}

      {showPanel ? (
        <div className="mt-3 rounded-lg border border-cyan-100 bg-white px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-900">
                AI invoice message
              </p>
              <p className="mt-0.5 text-[11px] text-cyan-800/80">
                Review before sending.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:min-h-8 sm:px-1.5 sm:py-1"
                aria-label={copied ? "Message copied" : "Copy message"}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={handleDraft}
                disabled={isPending}
                className="inline-flex min-h-9 items-center rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-8 sm:px-1.5 sm:py-1"
              >
                {isPending ? "Drafting…" : "Regenerate"}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex min-h-9 items-center rounded-md px-2 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:min-h-8 sm:px-1.5 sm:py-1"
                aria-label="Dismiss message"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <p
            className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700"
            aria-live="polite"
          >
            {draftText}
          </p>
        </div>
      ) : null}
    </section>
  );
}
