import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { CustomerDetailLoadingState } from "@/shared/components/customers/CustomerDetailLoadingState";
import { CustomerDetailNorthStarLoadingState } from "@/shared/components/customers/north-star-m3b";

export default function CustomerDetailLoading() {
  if (isNorthStarShellEnabled()) {
    return <CustomerDetailNorthStarLoadingState />;
  }

  return <CustomerDetailLoadingState />;
}
