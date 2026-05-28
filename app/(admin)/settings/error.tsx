"use client";

import { RouteErrorView } from "@/shared/components/ui/RouteErrorView";

type SettingsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SettingsError({ error, reset }: SettingsErrorProps) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Could not load settings"
      description="Something went wrong while loading company settings. Please try again."
      backHref="/"
      backLabel="Back to dashboard"
      logLabel="SettingsPage"
    />
  );
}
