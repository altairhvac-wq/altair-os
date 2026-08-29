import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicNetworkInvitePreview } from "@/lib/database/queries/network-invites";
import { SignUpForm } from "@/shared/components/auth/SignUpForm";

type SignUpPageProps = {
  searchParams: Promise<{ invite?: string }>;
};

export const metadata: Metadata = {
  title: "Create your account",
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const inviteToken = params.invite?.trim() || null;
  const invitePreview = inviteToken
    ? await getPublicNetworkInvitePreview(inviteToken)
    : null;

  return (
    <Suspense fallback={null}>
      <SignUpForm inviteToken={inviteToken} invitePreview={invitePreview} />
    </Suspense>
  );
}
