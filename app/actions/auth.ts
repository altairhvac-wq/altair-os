"use server";

import type { User } from "@supabase/supabase-js";
import { recordSecurityAuditEvent } from "@/lib/security/audit";
import {
  enforcePublicRateLimit,
  rateLimitMessage,
  resolveRequestAddress,
} from "@/lib/security/public-rate-limit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PASSWORD_RESET_RATE_LIMIT_MESSAGE, PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/auth/constants";
import { validateNewPassword } from "@/lib/auth/password";
import {
  buildAuthCallbackUrl,
  resolveAuthRedirectOrigin,
} from "@/lib/auth/request-origin";
import { validateSignupNetworkInviteEmail } from "@/lib/auth/network-invite-signup";
import { userHasPendingTeamInvites } from "@/lib/auth/pending-team-invites";
import { resolvePostLoginRedirect, sanitizeNextPath } from "@/lib/auth/redirects";
import {
  clearSignupNetworkInviteCookie,
  readSignupNetworkInviteCookie,
  resolveSignupNetworkInviteToken,
} from "@/lib/auth/signup-invite-cookie";
import { createAuthEmailClient } from "@/lib/supabase/auth-email";
import { createClient } from "@/lib/supabase/server";
import {
  bootstrapCompanyForNewUser,
  getActiveCompanyContext,
  getCompanyNameFromUserMetadata,
  getTradeFromUserMetadata,
} from "@/lib/database";
import { processNetworkInviteAfterCompanyBootstrap } from "@/lib/database/services/network-invite-acceptance";
import { mapAuthError } from "@/lib/database/errors";
import {
  normalizeTradeKey,
  type TradeKey,
} from "@/shared/lib/trades/trade-options";

export type AuthActionState = {
  error?: string;
  success?: string;
  needsEmailConfirmation?: boolean;
};

async function redirectAfterAuth(next?: string | null): Promise<never> {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  redirect(resolvePostLoginRedirect(companyContext, next));
}

async function ensureCompanyAfterAuth(
  user: User,
  companyName?: string,
  trade?: TradeKey | null,
): Promise<AuthActionState | null> {
  let context = await getActiveCompanyContext();

  if (!context) {
    if (await userHasPendingTeamInvites(user)) {
      redirect("/setup");
    }

    if (companyName) {
      const bootstrapResult = await bootstrapCompanyForNewUser(
        companyName,
        trade,
      );

      if (bootstrapResult.error) {
        return { error: bootstrapResult.error };
      }

      if (bootstrapResult.companyId) {
        context = await getActiveCompanyContext({
          companyId: bootstrapResult.companyId,
        });
      }
    } else {
      redirect("/setup");
    }
  }

  if (context) {
    await processNetworkInviteAfterCompanyBootstrap({
      user,
      companyId: context.company.id,
    });
  }

  return null;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim() || null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // ============================== BEFORE THE CREDENTIAL IS CHECKED ==============================
  // Two dimensions: the address stops one client working through many
  // accounts, and the email stops many clients working through one. Either
  // alone leaves the other open.
  //
  // The refusal message is identical whichever dimension refused and does not
  // say whether the account exists -- a limiter that distinguishes them is an
  // enumeration oracle.
  const address = await resolveRequestAddress();
  const loginLimit = await enforcePublicRateLimit("auth.login", {
    email,
    ip: address,
  });
  if (!loginLimit.allowed) {
    await recordSecurityAuditEvent({
      event: "login.rate_limited",
      outcome: "refused",
      subject: email,
      address,
      reason: "rate_limited",
    });
    return { error: rateLimitMessage(loginLimit) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // The provider's message is NOT recorded: those have been known to echo
    // the submitted address. `reason` is the error CODE, which is bounded.
    await recordSecurityAuditEvent({
      event: "login.failed",
      outcome: "failed",
      subject: email,
      address,
      reason: error.code ?? "sign_in_failed",
    });
    return { error: mapAuthError(error) };
  }

  await recordSecurityAuditEvent({
    event: "login.succeeded",
    outcome: "succeeded",
    userId: data.user?.id ?? null,
    subject: email,
    address,
  });

  const companyName = data.user
    ? getCompanyNameFromUserMetadata(data.user)
    : null;
  const trade = data.user ? getTradeFromUserMetadata(data.user) : null;
  const setupResult = data.user
    ? await ensureCompanyAfterAuth(
        data.user,
        companyName ?? undefined,
        trade,
      )
    : null;

  if (setupResult?.error) {
    return setupResult;
  }

  return redirectAfterAuth(next);
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  // Address only: there is no account yet, so there is no identity dimension
  // to limit, and limiting by the submitted email would let an attacker pick a
  // fresh one per attempt.
  const signupAddress = await resolveRequestAddress();
  const signupLimit = await enforcePublicRateLimit("auth.signup", {
    ip: signupAddress,
  });
  if (!signupLimit.allowed) {
    await recordSecurityAuditEvent({
      event: "signup.rate_limited",
      outcome: "refused",
      address: signupAddress,
      reason: "rate_limited",
    });
    return { error: rateLimitMessage(signupLimit) };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const tradeRaw = String(formData.get("trade") ?? "").trim();
  const formInviteToken =
    String(formData.get("inviteToken") ?? "").trim() || null;
  const next = String(formData.get("next") ?? "").trim() || null;
  const setupInviteFlow = sanitizeNextPath(next) === "/setup";
  const trade = normalizeTradeKey(tradeRaw);

  if (!fullName || !email || !password || (!companyName && !setupInviteFlow)) {
    return {
      error: setupInviteFlow
        ? "Full name, email, and password are required."
        : "All fields are required.",
    };
  }

  if (!setupInviteFlow && !trade) {
    return { error: "Please choose a trade." };
  }

  const cookieInviteToken = await readSignupNetworkInviteCookie();
  const resolvedInvite = resolveSignupNetworkInviteToken({
    formToken: formInviteToken,
    cookieToken: cookieInviteToken,
  });

  if (resolvedInvite.error) {
    return { error: resolvedInvite.error };
  }

  const inviteToken = resolvedInvite.token;

  if (inviteToken) {
    const inviteEmailError = await validateSignupNetworkInviteEmail(
      inviteToken,
      email,
    );

    if (inviteEmailError) {
      return { error: inviteEmailError };
    }
  }

  const { origin, source } = await resolveAuthRedirectOrigin();

  if (!origin) {
    console.error(
      "[signupAction] missing request origin for redirect URL",
      { source },
    );
    return {
      error: "Sign up is temporarily unavailable. Please try again later.",
    };
  }

  let emailRedirectTo: string;

  try {
    emailRedirectTo = buildAuthCallbackUrl(origin);
  } catch (error) {
    console.error("[signupAction] invalid redirect URL:", {
      origin,
      source,
      error,
    });
    return {
      error: "Sign up is temporarily unavailable. Please try again later.",
    };
  }

  const supabase = createAuthEmailClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        ...(companyName ? { company_name: companyName } : {}),
        ...(trade ? { trade } : {}),
        ...(inviteToken ? { network_invite_token: inviteToken } : {}),
      },
      emailRedirectTo,
    },
  });

  if (error) {
    return { error: mapAuthError(error) };
  }

  if (data.session) {
    const ssrClient = await createClient();
    await ssrClient.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  if (!data.session) {
    await clearSignupNetworkInviteCookie();

    return {
      success:
        "Account created. Check your email to confirm your address, then sign in.",
      needsEmailConfirmation: true,
    };
  }

  if (data.user && (await userHasPendingTeamInvites(data.user))) {
    await clearSignupNetworkInviteCookie();
    return redirectAfterAuth(next);
  }

  if (companyName) {
    const bootstrapResult = await bootstrapCompanyForNewUser(
      companyName,
      trade,
    );

    if (bootstrapResult.error) {
      return { error: bootstrapResult.error };
    }

    if (bootstrapResult.companyId && data.user) {
      await processNetworkInviteAfterCompanyBootstrap({
        user: data.user,
        companyId: bootstrapResult.companyId,
        inviteToken,
      });
    }
  }

  await clearSignupNetworkInviteCookie();

  return redirectAfterAuth(next);
}

export async function setupCompanyAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const tradeRaw = String(formData.get("trade") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim() || null;
  const trade = normalizeTradeKey(tradeRaw);

  if (!companyName) {
    return { error: "Company name is required." };
  }

  if (!trade) {
    return { error: "Please choose a trade." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const existingContext = await getActiveCompanyContext();

  if (existingContext) {
    return redirectAfterAuth(next);
  }

  const bootstrapResult = await bootstrapCompanyForNewUser(companyName, trade);

  if (bootstrapResult.error) {
    console.error("[setupCompanyAction] company bootstrap failed:", {
      userId: user.id,
      companyName,
      error: bootstrapResult.error,
    });
    return { error: bootstrapResult.error };
  }

  if (bootstrapResult.companyId) {
    await processNetworkInviteAfterCompanyBootstrap({
      user,
      companyId: bootstrapResult.companyId,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/setup");

  const companyContext = await getActiveCompanyContext(
    bootstrapResult.companyId
      ? { companyId: bootstrapResult.companyId }
      : undefined,
  );

  if (!companyContext) {
    console.error(
      "[setupCompanyAction] company context missing after bootstrap:",
      {
        userId: user.id,
        companyId: bootstrapResult.companyId,
        companyName,
      },
    );
    return {
      error:
        "Your company was created but could not be loaded. Please refresh and try again.",
    };
  }

  return redirectAfterAuth(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function isPasswordResetConfigError(message: string, code?: string): boolean {
  const lower = message.toLowerCase();

  return (
    (code === "unexpected_failure" && lower.includes("api key")) ||
    lower.includes("invalid api key") ||
    lower.includes("redirect") ||
    lower.includes("redirect_to") ||
    lower.includes("redirect url") ||
    lower.includes("missing supabase env")
  );
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required." };
  }

  // The address dimension is the one that matters here: the mail goes to
  // whoever was named, so without it anyone's inbox can be flooded from
  // anywhere. The refusal is returned as the same generic success-shaped
  // message the rest of this action uses, so it still reveals nothing about
  // whether the account exists.
  const resetAddress = await resolveRequestAddress();
  const resetLimit = await enforcePublicRateLimit(
    "auth.password_reset_request",
    { email, ip: resetAddress },
  );
  if (!resetLimit.allowed) {
    await recordSecurityAuditEvent({
      event: "password_reset.rate_limited",
      outcome: "refused",
      subject: email,
      address: resetAddress,
      reason: "rate_limited",
    });
    return { error: rateLimitMessage(resetLimit) };
  }

  // Recorded whether or not the address belongs to anyone: "a reset was
  // requested for this account" is the fact worth having, and the action
  // deliberately does not reveal which case it was.
  await recordSecurityAuditEvent({
    event: "password_reset.requested",
    outcome: "succeeded",
    subject: email,
    address: resetAddress,
  });

  const { origin, source } = await resolveAuthRedirectOrigin();

  if (!origin) {
    console.error(
      "[requestPasswordResetAction] missing request origin for redirect URL",
      { source },
    );
    return {
      error: "Password reset is temporarily unavailable. Please try again later.",
    };
  }

  let redirectTo: string;

  try {
    // Match Supabase allowlist path exactly; recovery flow uses type=recovery on the link.
    redirectTo = buildAuthCallbackUrl(origin);
  } catch (error) {
    console.error("[requestPasswordResetAction] invalid redirect URL:", {
      origin,
      source,
      error,
    });
    return {
      error: "Password reset is temporarily unavailable. Please try again later.",
    };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[requestPasswordResetAction] sending recovery email:", {
      origin,
      source,
      redirectTo,
    });
  }

  const supabase = createAuthEmailClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("[requestPasswordResetAction] resetPasswordForEmail failed:", {
      message: error.message,
      code: error.code,
      status: error.status,
      origin,
      source,
      redirectTo,
    });

    if (error.code === "validation_failed") {
      return { error: "Enter a valid email address." };
    }

    if (isPasswordResetConfigError(error.message, error.code)) {
      return {
        error: "Password reset is temporarily unavailable. Please try again later.",
      };
    }

    if (
      error.code === "over_email_send_rate_limit" ||
      error.status === 429
    ) {
      return { error: PASSWORD_RESET_RATE_LIMIT_MESSAGE };
    }

    // Do not reveal delivery/account status (SMTP, unknown addresses, etc.).
    return { success: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  return { success: PASSWORD_RESET_SUCCESS_MESSAGE };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  // Completing a reset consumes a recovery session, so this is where a stolen
  // or guessed recovery link is spent. Address only: the actor has no
  // established identity at this point.
  const updateAddress = await resolveRequestAddress();
  const updateLimit = await enforcePublicRateLimit("auth.password_update", {
    ip: updateAddress,
  });
  if (!updateLimit.allowed) {
    await recordSecurityAuditEvent({
      event: "password.update_rate_limited",
      outcome: "refused",
      address: updateAddress,
      reason: "rate_limited",
    });
    return { error: rateLimitMessage(updateLimit) };
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const next = String(formData.get("next") ?? "").trim() || null;

  const validationError = validateNewPassword(password, confirmPassword);

  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=auth_callback");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    await recordSecurityAuditEvent({
      event: "password.update_failed",
      outcome: "failed",
      userId: user.id,
      address: updateAddress,
      reason: error.code ?? "update_failed",
    });
    return { error: mapAuthError(error) };
  }

  // The single most security-relevant thing that can happen to an account
  // short of a role change, and nothing recorded it.
  await recordSecurityAuditEvent({
    event: "password.updated",
    outcome: "succeeded",
    userId: user.id,
    address: updateAddress,
  });

  return redirectAfterAuth(next);
}
