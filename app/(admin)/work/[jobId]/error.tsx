"use client";

import { RouteErrorView } from "@/shared/components/ui/RouteErrorView";

type WorkJobDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function WorkJobDetailError({
  error,
  reset,
}: WorkJobDetailErrorProps) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Could not load job"
      description="Something went wrong while fetching this job. Please try again."
      backHref="/work"
      backLabel="Back to Work"
      logLabel="WorkJobDetailPage"
    />
  );
}
