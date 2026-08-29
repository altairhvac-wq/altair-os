import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type AdminPendingLabelProps = {
  pending: boolean;
  pendingLabel: string;
  idleLabel: ReactNode;
  spinnerClassName?: string;
};

/** Spinner + label pair for admin primary/secondary buttons during async work. */
export function AdminPendingLabel({
  pending,
  pendingLabel,
  idleLabel,
  spinnerClassName = "h-3.5 w-3.5",
}: AdminPendingLabelProps) {
  if (!pending) {
    return <>{idleLabel}</>;
  }

  return (
    <>
      <Loader2
        className={`${spinnerClassName} shrink-0 animate-spin`}
        aria-hidden="true"
      />
      {/*
       * `role="status"` (an implicit polite live region) so the swap from the
       * idle label to "Saving…" is announced. Without it, a text change
       * inside the button the user just activated is silent to screen
       * readers, leaving no feedback that the submission started.
       */}
      <span role="status">{pendingLabel}</span>
    </>
  );
}
