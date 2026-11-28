import { PageLoadingMark } from "@/shared/components/feedback/GearSpinner";

/**
 * Shown while a dynamic public page (an Insights article, a resource page)
 * is being prepared, so a slow connection sees the Altair gear instead of
 * a frozen screen. Static pages are prerendered and never show it.
 */
export default function MarketingLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#080907]">
      <PageLoadingMark tone="light" text="Loading" />
    </div>
  );
}
