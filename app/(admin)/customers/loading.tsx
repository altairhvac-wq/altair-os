import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { CustomersNorthStarLoadingState } from "@/shared/components/customers/north-star-m3a";
import { CustomersLoadingState } from "@/shared/components/customers/CustomersLoadingState";

export default function CustomersLoading() {
  if (isNorthStarShellEnabled()) {
    return <CustomersNorthStarLoadingState />;
  }

  return <CustomersLoadingState />;
}
