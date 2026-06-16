import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";

function Skeleton({ className }: { className?: string }) {
  return <div className={`admin-skeleton ${className ?? ""}`} />;
}

export function TaxSummaryLoadingState() {
  return (
    <MasterShellPage>
      <MasterPageCanvas width="detail" className="max-w-4xl">
        <MasterContentStack>
          <MasterPageHeader
            className="no-print flex-col items-stretch gap-3 sm:flex-row sm:items-center"
            title="Tax Summary"
            subtitle="Printable accountant summary for the selected reporting period."
            primaryAction={
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Skeleton className="h-9 w-full rounded-lg sm:w-36" />
                <Skeleton className="h-9 w-full rounded-lg sm:w-36" />
              </div>
            }
          />

          <MasterPageSurface
            variant="card"
            className="bg-white px-6 py-8 sm:px-10 sm:py-10"
          >
            <div className="border-b border-slate-200 pb-6">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="mt-3 h-8 w-64 max-w-full" />
              <Skeleton className="mt-3 h-4 w-72 max-w-full" />
              <Skeleton className="mt-2 h-3 w-full max-w-lg" />
            </div>

            <MasterContentStack className="mt-8">
              {Array.from({ length: 4 }).map((_, index) => (
                <MasterPageSection
                  key={index}
                  title={
                    index === 0
                      ? "Financial Overview"
                      : index === 1
                        ? "Payments by Method"
                        : index === 2
                          ? "Revenue by Customer"
                          : "Invoice Aging"
                  }
                >
                  <MasterPageSurface
                    variant="section"
                    className="rounded-xl border-slate-200 px-4 py-3 shadow-none"
                  >
                    {Array.from({ length: 4 }).map((__, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0"
                      >
                        <Skeleton className="h-4 w-40 max-w-[60%]" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </MasterPageSurface>
                </MasterPageSection>
              ))}
            </MasterContentStack>

            <Skeleton className="mt-10 h-3 w-48" />
          </MasterPageSurface>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
