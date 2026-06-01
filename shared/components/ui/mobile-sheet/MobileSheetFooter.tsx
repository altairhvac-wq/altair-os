"use client";

type MobileSheetFooterProps = {
  children: React.ReactNode;
  className?: string;
};

export function MobileSheetFooter({
  children,
  className,
}: MobileSheetFooterProps) {
  return (
    <footer
      className={`overlay-form-actions flex shrink-0 gap-2.5 admin-sticky-footer-inline px-3 py-2.5 sm:px-4 ${className ?? ""}`}
    >
      {children}
    </footer>
  );
}

/** Standard dual-action footer buttons (cancel + primary submit). */
export function MobileSheetFooterActions({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel,
  submittingLabel,
  submitForm,
  isSubmitting = false,
  submitDisabled = false,
  submitClassName = "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60",
}: {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  submittingLabel: string;
  submitForm: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitClassName?: string;
}) {
  const cancelClass =
    "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60";

  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className={cancelClass}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        form={submitForm}
        disabled={isSubmitting || submitDisabled}
        className={submitClassName}
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </>
  );
}
