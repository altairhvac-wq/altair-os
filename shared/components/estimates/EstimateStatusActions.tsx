"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Mail } from "lucide-react";
import { convertEstimateToInvoiceAction } from "@/app/actions/invoices";
import {
  resendEstimateEmailAction,
  updateEstimateStatusAction,
} from "@/app/actions/estimates";
import type { BillingEmailDelivery } from "@/lib/email/billing-send";
import {
  formatActionError,
  formatBillingEmailDeliveryError,
  formatBillingEmailRecipientRedirectWarning,
  getBillingActionFeedbackTone,
  hasValidCustomerEmailForSend,
} from "@/shared/lib/operational-errors";
import { formatBillingEmailSuccessMessage } from "@/shared/lib/billing-email-sent";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import {
  canResendEstimateEmail,
  type EstimateDetail,
  type EstimateStatus,
} from "@/shared/types/estimate";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type EstimateStatusActionsProps = {
  estimate: EstimateDetail;
  canManageEstimates: boolean;
  customerEmailBlockReason: string | null;
  lastEmailSentMessage?: string | null;
  variant?: "inline" | "sticky" | "overlay-footer";
  northStar?: boolean;
};

type StatusAction = {
  label: string;
  shortLabel?: string;
  helper?: string;
  toStatus: EstimateStatus;
  className: string;
};

const OUTCOME_SHEET_TITLE_ID = "estimate-outcome-sheet-title";

function getAvailableActions(status: EstimateStatus): StatusAction[] {
  switch (status) {
    case "draft":
      return [
        {
          label: "Send to customer",
          shortLabel: "Send",
          helper: "Emails the estimate and marks it as sent.",
          toStatus: "sent",
          className: "bg-slate-900 text-white hover:bg-slate-800",
        },
        {
          label: "Cancel estimate",
          shortLabel: "Cancel",
          toStatus: "cancelled",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
      ];
    case "sent":
      return [
        {
          label: "Approve estimate",
          shortLabel: "Approve",
          helper: "Records customer approval for this estimate.",
          toStatus: "approved",
          className: "bg-emerald-600 text-white hover:bg-emerald-700",
        },
        {
          label: "Decline estimate",
          shortLabel: "Decline",
          helper: "Records that the customer declined this estimate.",
          toStatus: "declined",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
        {
          label: "Cancel estimate",
          shortLabel: "Cancel",
          toStatus: "cancelled",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
      ];
    case "approved":
      return [
        {
          label: "Cancel estimate",
          shortLabel: "Cancel",
          toStatus: "cancelled",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
      ];
    case "declined":
      return [
        {
          label: "Cancel estimate",
          shortLabel: "Cancel",
          toStatus: "cancelled",
          className:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
        },
      ];
    default:
      return [];
  }
}

function getStatusPendingLabel(status: EstimateStatus): string {
  switch (status) {
    case "sent":
      return "Sending…";
    case "approved":
      return "Approving…";
    case "declined":
      return "Declining…";
    case "cancelled":
      return "Canceling…";
    default:
      return "Saving…";
  }
}

function resolveActionClassName(
  action: StatusAction,
  northStar: boolean,
): string {
  if (!northStar) {
    return action.className;
  }

  switch (action.toStatus) {
    case "sent":
      return dt.primaryAction;
    case "approved":
      return "bg-emerald-600 text-white hover:bg-emerald-700";
    case "declined":
    case "cancelled":
      return dt.secondaryAction;
    default:
      return dt.secondaryAction;
  }
}

function actionButtonClassName(
  kind: "status" | "convert" | "resend" | "record",
  northStar: boolean,
  isMobileFooter: boolean,
  action?: StatusAction,
): string {
  const disabled =
    "disabled:cursor-not-allowed disabled:opacity-60";
  const mobileBase =
    `inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${disabled}`;
  const legacyInlineBase =
    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${disabled}`;

  if (!northStar) {
    if (isMobileFooter) {
      switch (kind) {
        case "convert":
          return `${mobileBase} bg-violet-600 text-white hover:bg-violet-700`;
        case "resend":
          return `${mobileBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
        case "record":
          return `${mobileBase} bg-slate-900 text-white hover:bg-slate-800`;
        case "status":
          return `${mobileBase} ${action ? action.className : ""}`;
      }
    }

    switch (kind) {
      case "convert":
        return `${legacyInlineBase} bg-violet-600 text-white hover:bg-violet-700`;
      case "resend":
        return `${legacyInlineBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
      case "record":
        return `${legacyInlineBase} bg-slate-900 text-white hover:bg-slate-800`;
      case "status":
        return `${legacyInlineBase} ${action ? action.className : ""}`;
    }
  }

  if (isMobileFooter) {
    switch (kind) {
      case "convert":
      case "record":
        return `${mobileBase} ${dt.primaryAction}`;
      case "resend":
        return `${mobileBase} ${dt.secondaryAction}`;
      case "status":
        return `${mobileBase} ${action ? resolveActionClassName(action, true) : ""}`;
    }
  }

  switch (kind) {
    case "convert":
    case "record":
      return `${dt.primaryAction} ${disabled}`;
    case "resend":
      return `${dt.secondaryAction} ${disabled}`;
    case "status":
      return `${resolveActionClassName(action!, true)} ${disabled}`;
  }
}

export function EstimateStatusActions({
  estimate,
  canManageEstimates,
  customerEmailBlockReason,
  lastEmailSentMessage,
  variant = "inline",
  northStar = false,
}: EstimateStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<EstimateStatus | null>(
    null,
  );
  const [convertPending, setConvertPending] = useState(false);
  const [localStatus, setLocalStatus] = useState(estimate.status);
  const [outcomeSheetOpen, setOutcomeSheetOpen] = useState(false);
  const [emailDelivery, setEmailDelivery] = useState<
    BillingEmailDelivery | undefined
  >(undefined);
  const router = useRouter();

  useEffect(() => {
    setLocalStatus(estimate.status);
  }, [estimate.status]);

  useEffect(() => {
    if (localStatus !== "sent") {
      setOutcomeSheetOpen(false);
    }
  }, [localStatus]);

  const customerEmail = estimate.customerEmail?.trim();
  const hasValidCustomerEmail = hasValidCustomerEmailForSend(customerEmail);
  const actions = getAvailableActions(localStatus);
  const canConvertToInvoice = localStatus === "approved";
  const canResendEmail = canResendEstimateEmail(localStatus);
  const emailSendBlocked =
    Boolean(customerEmailBlockReason) &&
    (canResendEmail || localStatus === "draft");
  const isSticky = variant === "sticky";
  const isOverlayFooter = variant === "overlay-footer";
  const isMobileFooter = isSticky || isOverlayFooter;
  const isSentStickyWorkflow = isMobileFooter && localStatus === "sent";
  const workflowBusy = isPending || resendPending || convertPending;
  const primaryAction = actions.find(
    (action) =>
      action.toStatus === "sent" ||
      action.toStatus === "approved" ||
      action.toStatus === "declined",
  );
  const secondaryActions = actions.filter((action) => action !== primaryAction);

  if (!canManageEstimates) {
    return null;
  }

  function handleStatusChange(toStatus: EstimateStatus) {
    if (isPending || resendPending || convertPending) {
      return;
    }

    if (toStatus === "sent" && !hasValidCustomerEmail) {
      setSuccessMessage(null);
      setError(customerEmailBlockReason ?? "A valid customer email is required.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setEmailDelivery(undefined);
    setPendingStatus(toStatus);

    startTransition(async () => {
      try {
        const result = await updateEstimateStatusAction(
          estimate.id,
          localStatus,
          toStatus,
        );

        if (result.error) {
          setError(formatActionError(result.error, "We couldn't update this estimate. Try again."));
          router.refresh();
          return;
        }

        if (
          toStatus === "sent" &&
          result.emailDelivery &&
          result.emailDelivery.status !== "sent"
        ) {
          setEmailDelivery(result.emailDelivery);
          setError(formatBillingEmailDeliveryError(result.emailDelivery, "estimate", "send"));
          router.refresh();
          return;
        }

        setLocalStatus(toStatus);
        if (toStatus === "sent") {
          const redirectWarning = result.emailDelivery
            ? formatBillingEmailRecipientRedirectWarning(result.emailDelivery)
            : null;

          if (redirectWarning) {
            setEmailDelivery(result.emailDelivery);
            setError(redirectWarning);
          } else if (customerEmail) {
            setSuccessMessage(
              formatBillingEmailSuccessMessage(customerEmail, "send", "estimate"),
            );
          }
        } else {
          setOutcomeSheetOpen(false);
        }
        router.refresh();
      } finally {
        setPendingStatus(null);
      }
    });
  }

  function handleConvertToInvoice() {
    if (isPending || resendPending || convertPending) {
      return;
    }

    setError(null);
    setConvertPending(true);

    startTransition(async () => {
      try {
        const result = await convertEstimateToInvoiceAction(estimate.id);

        if (result.error || !result.invoice) {
          setError(
            result.error ??
              "Could not convert this estimate to an invoice. Refresh and try again.",
          );
          return;
        }

        router.push(`/invoices/${result.invoice.id}`);
      } finally {
        setConvertPending(false);
      }
    });
  }

  function handleResendEmail() {
    if (isPending || resendPending || convertPending) {
      return;
    }

    if (!hasValidCustomerEmail) {
      setSuccessMessage(null);
      setError(customerEmailBlockReason ?? "A valid customer email is required.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setEmailDelivery(undefined);
    setResendPending(true);

    startTransition(async () => {
      try {
        const result = await resendEstimateEmailAction(estimate.id);

        if (result.error) {
          setError(formatActionError(result.error, "Estimate email could not be resent. Try again."));
          return;
        }

        if (
          result.emailDelivery &&
          result.emailDelivery.status !== "sent"
        ) {
          setEmailDelivery(result.emailDelivery);
          setError(formatBillingEmailDeliveryError(result.emailDelivery, "estimate", "resend"));
          return;
        }

        const redirectWarning = result.emailDelivery
          ? formatBillingEmailRecipientRedirectWarning(result.emailDelivery)
          : null;

        if (redirectWarning) {
          setEmailDelivery(result.emailDelivery);
          setError(redirectWarning);
        } else if (customerEmail) {
          setSuccessMessage(
            formatBillingEmailSuccessMessage(customerEmail, "resend", "estimate"),
          );
        }
        router.refresh();
      } finally {
        setResendPending(false);
      }
    });
  }

  if (!canConvertToInvoice && actions.length === 0 && !canResendEmail) {
    return null;
  }

  const containerClass = isSticky
    ? northStar
      ? "admin-sticky-footer north-star-estimate-sticky-footer sm:hidden"
      : "admin-sticky-footer sm:hidden"
    : isOverlayFooter
      ? northStar
        ? "admin-sticky-footer-inline north-star-estimate-sticky-footer flex flex-col px-3 py-2.5 sm:hidden"
        : "admin-sticky-footer-inline flex flex-col px-3 py-2.5 sm:hidden"
      : "flex flex-col items-start gap-2";

  const actionButtons = (
    <div className={isMobileFooter ? "flex min-w-0 flex-wrap gap-2" : "flex flex-wrap gap-2"}>
      {canConvertToInvoice ? (
        <button
          type="button"
          disabled={isPending || resendPending || convertPending}
          onClick={handleConvertToInvoice}
          className={actionButtonClassName("convert", northStar, isMobileFooter)}
        >
          {convertPending
            ? "Converting…"
            : isMobileFooter
              ? "Convert"
              : "Convert to invoice"}
        </button>
      ) : null}
      {canResendEmail ? (
        <button
          type="button"
          disabled={workflowBusy || !hasValidCustomerEmail}
          onClick={handleResendEmail}
          title={
            hasValidCustomerEmail
              ? "Sends another copy to the customer's email on file."
              : customerEmailBlockReason ?? undefined
          }
          className={actionButtonClassName("resend", northStar, isMobileFooter)}
        >
          <Mail className="h-4 w-4" />
          {resendPending
            ? "Resending…"
            : isMobileFooter
              ? "Resend"
              : "Resend to customer"}
        </button>
      ) : null}
      {isSentStickyWorkflow ? (
        <button
          type="button"
          disabled={workflowBusy}
          onClick={() => setOutcomeSheetOpen(true)}
          className={actionButtonClassName("record", northStar, isMobileFooter)}
        >
          Record outcome
        </button>
      ) : (
        <>
          {isMobileFooter && primaryAction ? (
            <button
              key={primaryAction.toStatus}
              type="button"
              disabled={
                workflowBusy ||
                (primaryAction.toStatus === "sent" && !hasValidCustomerEmail)
              }
              title={
                primaryAction.toStatus === "sent" && !hasValidCustomerEmail
                  ? customerEmailBlockReason ?? undefined
                  : undefined
              }
              onClick={() => handleStatusChange(primaryAction.toStatus)}
              className={actionButtonClassName("status", northStar, isMobileFooter, primaryAction)}
            >
              {isPending && pendingStatus === primaryAction.toStatus
                ? getStatusPendingLabel(primaryAction.toStatus)
                : (primaryAction.shortLabel ?? primaryAction.label)}
            </button>
          ) : null}
          {(isMobileFooter ? secondaryActions : actions).map((action) => (
            <button
              key={action.toStatus}
              type="button"
              disabled={
                workflowBusy ||
                (action.toStatus === "sent" && !hasValidCustomerEmail)
              }
              title={
                action.toStatus === "sent" && !hasValidCustomerEmail
                  ? customerEmailBlockReason ?? undefined
                  : undefined
              }
              onClick={() => handleStatusChange(action.toStatus)}
              className={actionButtonClassName("status", northStar, isMobileFooter, action)}
            >
              {isPending && pendingStatus === action.toStatus
                ? getStatusPendingLabel(action.toStatus)
                : isMobileFooter
                  ? (action.shortLabel ?? action.label)
                  : action.label}
            </button>
          ))}
        </>
      )}
    </div>
  );

  const helperText = emailSendBlocked
    ? customerEmailBlockReason
    : northStar && !isMobileFooter
      ? canResendEmail
        ? lastEmailSentMessage ??
          "Resend sends another copy to the customer's email on file."
        : null
      : isSentStickyWorkflow
        ? lastEmailSentMessage ??
          "Awaiting customer decision. You can leave and return anytime."
        : primaryAction?.helper ??
          (canResendEmail
            ? lastEmailSentMessage ??
              "Resend sends another copy to the customer's email on file."
            : null);

  const feedbackBanner = error ? (
    <SettingsAlertBanner tone={getBillingActionFeedbackTone(error, emailDelivery)}>
      {error}
      {getBillingActionFeedbackTone(error, emailDelivery) === "warning" ? (
        <span className="mt-1 block text-xs opacity-90">
          Refresh this page to confirm the current status before retrying.
        </span>
      ) : null}
    </SettingsAlertBanner>
  ) : null;

  const successBanner = successMessage ? (
    <SettingsAlertBanner tone="success">{successMessage}</SettingsAlertBanner>
  ) : null;

  if (isMobileFooter) {
    const hasActions =
      canConvertToInvoice || canResendEmail || actions.length > 0;

    if (!hasActions) {
      return null;
    }

    return (
      <>
        <div className={containerClass}>
          {actionButtons}
          {feedbackBanner ? (
            <div className="mt-2 w-full">{feedbackBanner}</div>
          ) : successBanner ? (
            <div className="mt-2 w-full">{successBanner}</div>
          ) : helperText ? (
            <p className={`mt-2 text-xs ${northStar ? "text-[#4F4638]" : "text-slate-500"}`}>{helperText}</p>
          ) : null}
        </div>
        {isSticky ? <div className="admin-sticky-footer-spacer" aria-hidden /> : null}
        {outcomeSheetOpen ? (
          <MobileSheet
            onClose={() => setOutcomeSheetOpen(false)}
            closeDisabled={workflowBusy}
            ariaLabelledBy={OUTCOME_SHEET_TITLE_ID}
            zIndex={50}
          >
            <MobileSheetPanel maxWidth="lg">
              <MobileSheetHeader
                titleId={OUTCOME_SHEET_TITLE_ID}
                title="Record customer outcome"
                subtitle="Update when the customer responds. You can return to this estimate anytime."
                onClose={() => setOutcomeSheetOpen(false)}
                closeDisabled={workflowBusy}
                icon={
                  <MobileSheetHeaderIcon className="bg-slate-100 text-slate-700">
                    <ClipboardCheck className="h-4 w-4" />
                  </MobileSheetHeaderIcon>
                }
              />
              <MobileSheetBody>
                <div className="flex flex-col gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.toStatus}
                      type="button"
                      disabled={workflowBusy}
                      onClick={() => handleStatusChange(action.toStatus)}
                      className={actionButtonClassName("status", northStar, true, action)}
                    >
                      {isPending && pendingStatus === action.toStatus
                        ? getStatusPendingLabel(action.toStatus)
                        : action.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Record the customer&apos;s response when you hear back. You can
                  close this and return later.
                </p>
                {feedbackBanner ? (
                  <div className="mt-3">{feedbackBanner}</div>
                ) : null}
              </MobileSheetBody>
            </MobileSheetPanel>
          </MobileSheet>
        ) : null}
      </>
    );
  }

  return (
    <div className={containerClass}>
      {actionButtons}
      {helperText ? (
        <p className={`text-xs ${northStar ? "text-[#4F4638]" : "text-slate-500"}`}>{helperText}</p>
      ) : null}
      {successBanner}
      {feedbackBanner}
    </div>
  );
}
