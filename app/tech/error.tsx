"use client";

import { RouteErrorView } from "@/shared/components/ui/RouteErrorView";

type TechErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TechError({ error, reset }: TechErrorProps) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Could not load page"
      description="Something went wrong while loading this page. Please try again."
      backHref="/technician"
      backLabel="Back to today"
      logLabel="TechPage"
    />
  );
}
