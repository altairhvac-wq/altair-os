import type { Metadata } from "next";
import { PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { Suspense } from "react";
import { LoginFormFields } from "@/shared/components/auth/LoginForm";
import { LoginMarketingPanel } from "@/shared/components/auth/LoginMarketingPanel";
import { LoginPageShell } from "@/shared/components/auth/LoginPageShell";

/**
 * Not for search results, but crawlable (see app/robots.ts): signed-out
 * visits to app pages land here as /login?next=..., and Google had indexed
 * two of those as duplicates. The canonical names the one address and
 * noindex keeps even that out of results; `follow` lets the links count.
 */
export const metadata: Metadata = {
  title: "Sign in",
  alternates: { canonical: `${PUBLIC_SITE_ORIGIN}/login` },
  robots: { index: false, follow: true },
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
