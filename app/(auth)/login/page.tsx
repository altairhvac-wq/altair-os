import { Suspense } from "react";
import { LoginFormFields } from "@/shared/components/auth/LoginForm";
import {
  LoginMarketingPanel,
  LoginMobileMarketing,
} from "@/shared/components/auth/LoginMarketingPanel";
import { LoginPageShell } from "@/shared/components/auth/LoginPageShell";

export default function LoginPage() {
  return (
    <LoginPageShell
      heroPanel={<LoginMarketingPanel />}
      belowFooter={<LoginMobileMarketing />}
    >
      <Suspense fallback={null}>
        <LoginFormFields />
      </Suspense>
    </LoginPageShell>
  );
}
