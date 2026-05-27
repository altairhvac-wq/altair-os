"use client";

import { RouteErrorView } from "@/shared/components/ui/RouteErrorView";

type TechnicianErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TechnicianError({ error, reset }: TechnicianErrorProps) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Could not load jobs"
      description="Something went wrong while loading your assigned jobs. Please try again."
      backHref="/technician"
      backLabel="Back to today"
      logLabel="TechnicianPage"
    />
  );
}
