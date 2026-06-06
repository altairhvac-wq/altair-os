"use client";

import type { ReactNode } from "react";
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
        <div className="space-y-2">
          <p>
            New to Altair OS?{" "}
            <AuthLink href="/signup">Create a free account</AuthLink>
          </p>
          <p>
            <AuthLink href="/pricing">View pricing</AuthLink>
          </p>
        </div>
      }
    >
      {children}
    </AuthShell>
  );
}
