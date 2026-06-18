import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { ServiceItemsNorthStarLoadingState } from "@/shared/components/service-items/north-star-m7a";
import { ServiceItemsLoadingState } from "@/shared/components/service-items/ServiceItemsLoadingState";

export default function PriceBookLoading() {
  if (isNorthStarShellEnabled()) {
    return <ServiceItemsNorthStarLoadingState />;
  }

  return <ServiceItemsLoadingState />;
}
