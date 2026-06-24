"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { AuthLink, AuthShell } from "./AuthShell";

type LoginPageShellProps = {
  children: ReactNode;
  heroPanel: ReactNode;
  belowFooter: ReactNode;
};

export function LoginPageShell({
  children,
  heroPanel,
  belowFooter,
}: LoginPageShellProps) {
  return (
    <AuthShell
      title="Sign in"
      description="Welcome back — access dispatch, jobs, customers, and your field teams."
      heroPanel={heroPanel}
      belowFooter={belowFooter}
      formAnchorId="sign-in-form"
      footer={
        <Suspense fallback={null}>
          <LoginPageFooter />
        </Suspense>
      }
    >
      {children}
    </AuthShell>
  );
}

function LoginPageFooter() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get("next"));
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <div className="space-y-2">
      <p>
        New to Altair OS?{" "}
        <AuthLink href={signupHref}>Create a free account</AuthLink>
      </p>
      <p>
        <AuthLink href="/pricing">View pricing</AuthLink>
      </p>
    </div>
  );
}
