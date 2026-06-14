"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PASSWORD_RESET_RATE_LIMIT_MESSAGE, PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/auth/constants";
import { validateNewPassword } from "@/lib/auth/password";
import {
  buildAuthCallbackUrl,
  resolveAuthRedirectOrigin,
} from "@/lib/auth/request-origin";
import { resolvePostLoginRedirect } from "@/lib/auth/redirects";
import { createAuthEmailClient } from "@/lib/supabase/auth-email";
import { createClient } from "@/lib/supabase/server";
import {
  bootstrapCompanyForNewUser,
  getActiveCompanyContext,
  getCompanyNameFromUserMetadata,
} from "@/lib/database";
import { processNetworkInviteAfterCompanyBootstrap } from "@/lib/database/services/network-invite-acceptance";
import { mapAuthError } from "@/lib/database/errors";

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
  companyName?: string,
): Promise<AuthActionState | null> {
  const context = await getActiveCompanyContext();

  if (context) {
    return null;
  }

  if (companyName) {
    const { error } = await bootstrapCompanyForNewUser(companyName);

    if (error) {
      return { error };
    }

    return null;
  }

  redirect("/setup");
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: mapAuthError(error) };
  }

  const companyName = data.user
    ? getCompanyNameFromUserMetadata(data.user)
    : null;
  const setupResult = await ensureCompanyAfterAuth(companyName ?? undefined);

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
  const inviteToken = String(formData.get("inviteToken") ?? "").trim() || null;
  const next = String(formData.get("next") ?? "").trim() || null;

  if (!fullName || !email || !password || !companyName) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();
  const { origin } = await resolveAuthRedirectOrigin();
  const emailRedirectTo = origin
    ? buildAuthCallbackUrl(origin)
    : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
        ...(inviteToken ? { network_invite_token: inviteToken } : {}),
      },
      emailRedirectTo,
    },
  });

  if (error) {
    return { error: mapAuthError(error) };
  }

  if (!data.session) {
    return {
      success:
        "Account created. Check your email to confirm your address, then sign in.",
      needsEmailConfirmation: true,
    };
  }

  const bootstrapResult = await bootstrapCompanyForNewUser(companyName);

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

  return redirectAfterAuth(next);
}

export async function setupCompanyAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim() || null;

  if (!companyName) {
    return { error: "Company name is required." };
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

  const bootstrapResult = await bootstrapCompanyForNewUser(companyName);

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
    return { error: mapAuthError(error) };
  }

  return redirectAfterAuth(next);
}
