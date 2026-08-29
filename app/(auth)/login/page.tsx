import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginFormFields } from "@/shared/components/auth/LoginForm";
import { LoginMarketingPanel } from "@/shared/components/auth/LoginMarketingPanel";
import { LoginPageShell } from "@/shared/components/auth/LoginPageShell";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <LoginPageShell heroPanel={<LoginMarketingPanel />}>
      <Suspense fallback={null}>
        <LoginFormFields />
      </Suspense>
    </LoginPageShell>
  );
}
