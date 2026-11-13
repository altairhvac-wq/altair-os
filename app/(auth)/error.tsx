"use client";

import { RouteErrorScreen } from "@/shared/components/support/RouteErrorScreen";

/** Sign-in, sign-up and password pages: the person may not have an account yet. */
export default function AuthError({
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
      boundary="auth"
      homeHref="/login"
      homeLabel="Back to sign in"
    />
  );
}
