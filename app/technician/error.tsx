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
      title="Connection problem"
      description="We couldn't load your schedule. Check your connection and try again."
      backHref="/technician"
      backLabel="Back to today"
      logLabel="TechnicianPage"
    />
  );
}
