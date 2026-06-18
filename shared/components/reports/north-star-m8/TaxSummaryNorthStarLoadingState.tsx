import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`north-star-skeleton rounded-lg border border-[rgba(138,99,36,0.12)] ${className ?? ""}`}
    />
  );
}

export function TaxSummaryNorthStarLoadingState() {
  return (
    <MasterShellPage density="compact" className={lt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Bookkeeping report"
        title="Tax Summary"
        subtitle="Printable accountant summary for bookkeeping and tax review."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-reports-page-header north-star-tax-summary-page-header ${lt.pageHeader}`}
        eyebrowClassName={lt.pageHeaderEyebrow}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
        secondaryAction={
          <Skeleton className="h-9 w-full sm:w-36" />
        }
        primaryAction={
          <Skeleton className="h-9 w-full sm:w-36" />
        }
      />

      <MasterContentStack
        density="compact"
        className="min-w-0 px-3 pb-5 sm:px-3.5 lg:px-5 lg:pb-6"
      >
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-6 py-8 shadow-[0_4px_16px_rgba(3,7,12,0.08)] sm:px-10 sm:py-10">
            <div className="border-b border-[rgba(138,99,36,0.12)] pb-6">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="mt-3 h-8 w-64 max-w-full" />
              <Skeleton className="mt-3 h-4 w-72 max-w-full" />
              <Skeleton className="mt-2 h-3 w-full max-w-lg" />
            </div>

            <div className="mt-8 space-y-8">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="h-3 w-40" />
                  <div className="mt-2 rounded-xl border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA]/60 px-4 py-3">
                    {Array.from({ length: 4 }).map((__, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="flex items-center justify-between gap-4 border-b border-[rgba(138,99,36,0.08)] py-2.5 last:border-b-0"
                      >
                        <Skeleton className="h-4 w-40 max-w-[60%]" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Skeleton className="mt-10 h-3 w-48" />
          </div>
        </div>
      </MasterContentStack>
    </MasterShellPage>
  );
}
