import { MasterContentStack } from "./MasterContentStack";
import { MasterPageCanvas } from "./MasterPageCanvas";
import { masterDetailOverlayBodyInsetClass } from "./tokens";

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export type MasterBillingDetailOverlayLoadingStateProps = {
  variant: "estimate" | "invoice";
};

/**
 * Loading scaffold for estimate/invoice overlays inside `FocusedDocumentOverlay`.
 * Mirrors loaded overlay body rhythm — no `MasterShellPage` or `MasterDetailPageLayout`.
 */
export function MasterBillingDetailOverlayLoadingState({
  variant,
}: MasterBillingDetailOverlayLoadingStateProps) {
  const isInvoice = variant === "invoice";

  return (
    <MasterPageCanvas width="detail" className={masterDetailOverlayBodyInsetClass}>
      <MasterContentStack density="default">
        <section className="overflow-x-hidden admin-card">
          <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-7 w-28 sm:hidden" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl lg:w-64" />
            </div>
          </div>

          {isInvoice ? (
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : null}

          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
            <Skeleton className="h-36 rounded-xl lg:col-span-2" />
            {isInvoice ? (
              <div className="space-y-5">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            ) : (
              <Skeleton className="h-36 rounded-xl" />
            )}
          </div>
        </section>

        <Skeleton className="h-[28rem] w-full rounded-2xl" />

        {isInvoice ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}

        <Skeleton className="h-32 w-full rounded-2xl" />
      </MasterContentStack>
    </MasterPageCanvas>
  );
}
