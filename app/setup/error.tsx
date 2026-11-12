"use client";

import { RouteErrorScreen } from "@/shared/components/support/RouteErrorScreen";

/** Company setup: signed in, but there is no workspace (or dashboard) yet. */
export default function SetupError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteErrorScreen
      error={error}
      retry={retry}
      boundary="setup"
      homeHref="/setup"
      homeLabel="Back to setup"
    />
  );
}
