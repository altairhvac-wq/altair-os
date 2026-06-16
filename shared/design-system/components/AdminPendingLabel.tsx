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
      <span>{pendingLabel}</span>
    </>
  );
}
