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
import {
  emailHasPendingTeamInvite,
  userHasPendingTeamInvites,
} from "@/lib/auth/pending-team-invites";
import { resolvePostLoginRedirect, sanitizeNextPath } from "@/lib/auth/redirects";
import {
  clearSignupNetworkInviteCookie,
  readSignupNetworkInviteCookie,
  resolveSignupNetworkInviteToken,
} from "@/lib/auth/signup-invite-cookie";
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
  CAPTCHA_FAILED_MESSAGE,
  isCaptchaError,
  readCaptchaToken,
} from "@/shared/lib/auth/captcha";
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

  // Turnstile token, verified by Supabase when CAPTCHA protection is on
  // (shared/lib/auth/captcha.ts). Ignored by Supabase while it is off.
  const captchaToken = readCaptchaToken(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    ...(captchaToken ? { options: { captchaToken } } : {}),
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

  // ============================== BEFORE ANYTHING IS CREATED ==============================
  // Two dimensions. The address stops one client opening accounts in bulk,
  // and is generous on purpose: a carrier NAT puts thousands of people behind
  // one address (see PUBLIC_RATE_LIMITS). The email stops one inbox being
  // flooded with confirmation mail, which the address dimension cannot see.
  // The refusal is the same message whichever dimension refused.
  const signupAddress = await resolveRequestAddress();
  const signupLimit = await enforcePublicRateLimit("auth.signup", {
    ip: signupAddress,
    email: email || null,
  });
  if (!signupLimit.allowed) {
    await recordSecurityAuditEvent({
      event: "signup.rate_limited",
      outcome: "refused",
      subject: email || null,
      address: signupAddress,
      reason: "rate_limited",
    });
    return { error: rateLimitMessage(signupLimit) };
  }

  if (!fullName || !email || !password) {
    return { error: "Full name, email, and password are required." };
  }

  // ============================== THE COMPANY NAME IS FOR FOUNDERS ==============================
  // Someone creating a workspace names it. Someone joining one has nothing
  // to name: their company exists, and bootstrap is deferred to /setup where
  // they accept the invite. The invite email points at /signup?next=/setup so
  // the form knows which case it is in. But a person who typed /signup on
  // their own with an invite waiting is in the second case too, and the only
  // way to know is to ask (launch audit M4).
  let joiningExistingCompany = setupInviteFlow;

  if (!companyName && !joiningExistingCompany) {
    joiningExistingCompany = await emailHasPendingTeamInvite(email);
  }

  if (!companyName && !joiningExistingCompany) {
    return {
      error:
        "Enter your company name. If you were invited to join a company, sign up with the email address the invitation was sent to and leave this blank.",
    };
  }

  if (companyName && !setupInviteFlow && !trade) {
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

  // ============================== PKCE, SO THE LINK ALWAYS CARRIES ?code= ==============================
  // The cookie-backed server client runs the PKCE flow: it stores a code
  // verifier in a cookie on this response, and whatever shape the Supabase
  // confirmation template has, the link lands on /auth/callback?code=... which
  // the callback exchanges. The implicit-flow client this replaced depended
  // on the template having been rewritten to token_hash; with the default
  // template it put the tokens in the URL fragment, which a server never
  // sees (launch audit B3). The callback keeps token_hash as a fallback, so a
  // rewritten template still works.
  //
  // The cost of PKCE is that the link must be opened in the browser that
  // holds the verifier cookie. The callback names that failure in its log.
  const captchaToken = readCaptchaToken(formData);
  const supabase = await createClient();
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
      ...(captchaToken ? { captchaToken } : {}),
    },
  });

  if (error) {
    return { error: mapAuthError(error) };
  }

  // With email confirmation off, the server client has already written the
  // session cookies; with it on, there is no session until the link is
  // opened. The copy says what the link does: it signs the person in and
  // finishes setup. Telling them to "sign in" afterwards sent people to the
  // login form before they had clicked it.
  if (!data.session) {
    await clearSignupNetworkInviteCookie();

    return {
      success:
        "Account created. Open the link we just emailed you: it finishes setup and signs you in.",
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
    // Match the Supabase allowlist path exactly. Recovery is detected by the
    // callback from the PKCE exchange (redirectType), with the link's
    // type=recovery honoured when a token_hash template provides it.
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

  // PKCE (see signupAction). The verifier cookie set here is marked as a
  // recovery, and the callback learns that from the exchange itself, so the
  // reset no longer depends on `type=recovery` surviving the email template.
  const captchaToken = readCaptchaToken(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
    ...(captchaToken ? { captchaToken } : {}),
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

    // Before the generic success below: a refused security check must not be
    // reported as "email sent". Saying so reveals nothing about the account.
    if (isCaptchaError(error)) {
      return { error: CAPTCHA_FAILED_MESSAGE };
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
