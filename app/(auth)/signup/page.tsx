import {
  clearSignupNetworkInviteCookie,
  setSignupNetworkInviteCookie,
} from "@/lib/auth/signup-invite-cookie";
import { getPublicNetworkInvitePreview } from "@/lib/database/queries/network-invites";
import { SignUpForm } from "@/shared/components/auth/SignUpForm";

type SignUpPageProps = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const inviteToken = params.invite?.trim() || null;
  const invitePreview = inviteToken
    ? await getPublicNetworkInvitePreview(inviteToken)
    : null;

  if (inviteToken && invitePreview?.state === "valid") {
    await setSignupNetworkInviteCookie(inviteToken);
  } else {
    await clearSignupNetworkInviteCookie();
  }

  return (
    <SignUpForm inviteToken={inviteToken} invitePreview={invitePreview} />
  );
}
