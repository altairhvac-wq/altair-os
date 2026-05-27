"use client";

import { RouteErrorView } from "@/shared/components/ui/RouteErrorView";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Could not load page"
      description="Something went wrong while loading this page. Please try again."
      backHref="/"
      backLabel="Back to dashboard"
      logLabel="AdminPage"
    />
  );
}
