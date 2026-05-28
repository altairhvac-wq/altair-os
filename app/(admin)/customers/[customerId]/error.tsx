"use client";

import { RouteErrorView } from "@/shared/components/ui/RouteErrorView";

type CustomerDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CustomerDetailError({
  error,
  reset,
}: CustomerDetailErrorProps) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Could not load customer"
      description="Something went wrong while fetching this customer. Please try again."
      backHref="/customers"
      backLabel="Back to customers"
      logLabel="CustomerDetailPage"
    />
  );
}
