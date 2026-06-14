import type { User } from "@supabase/supabase-js";
import { acceptNetworkInvite } from "@/lib/database/queries/network-invites";
import { createClient } from "@/lib/supabase/server";

const INVITE_TOKEN_METADATA_KEY = "network_invite_token";

export function getNetworkInviteTokenFromUserMetadata(
  user: User,
): string | null {
  const value = user.user_metadata?.[INVITE_TOKEN_METADATA_KEY];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function processNetworkInviteAfterCompanyBootstrap(input: {
  user: User;
  companyId: string;
  inviteToken?: string | null;
}): Promise<{ sourceCompanyName?: string; error?: string }> {
  const rawToken =
    input.inviteToken?.trim() ||
    getNetworkInviteTokenFromUserMetadata(input.user);

  if (!rawToken) {
    return {};
  }

  const signupEmail = input.user.email?.trim();

  if (!signupEmail) {
    return { error: "Unable to verify invitation email." };
  }

  const result = await acceptNetworkInvite({
    rawToken,
    acceptedCompanyId: input.companyId,
    acceptedUserId: input.user.id,
    signupEmail,
  });

  if (!result.ok) {
    console.error("[processNetworkInviteAfterCompanyBootstrap] accept failed:", {
      userId: input.user.id,
      companyId: input.companyId,
      error: result.error,
    });
    return { error: result.error };
  }

  const supabase = await createClient();
  const { error: metadataError } = await supabase.auth.updateUser({
    data: { [INVITE_TOKEN_METADATA_KEY]: null },
  });

  if (metadataError) {
    console.error(
      "[processNetworkInviteAfterCompanyBootstrap] failed to clear invite token metadata:",
      {
        userId: input.user.id,
        companyId: input.companyId,
        error: metadataError.message,
      },
    );
  }

  return { sourceCompanyName: result.sourceCompanyName };
}
