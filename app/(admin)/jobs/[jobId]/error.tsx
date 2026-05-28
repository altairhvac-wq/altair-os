"use client";

import { RouteErrorView } from "@/shared/components/ui/RouteErrorView";

type JobDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function JobDetailError({ error, reset }: JobDetailErrorProps) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Could not load job"
      description="Something went wrong while fetching this job. Please try again."
      backHref="/jobs"
      backLabel="Back to jobs"
      logLabel="JobDetailPage"
    />
  );
}
