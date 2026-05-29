"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  RESET_PASSWORD_PATH,
} from "@/lib/auth/constants";
import { validateNewPassword } from "@/lib/auth/password";
import { buildAuthCallbackUrl, getRequestOrigin } from "@/lib/auth/request-origin";
import { resolvePostLoginRedirect } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import {
  bootstrapCompanyForNewUser,
  getActiveCompanyContext,
  getCompanyNameFromUserMetadata,
} from "@/lib/database";
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
  const next = String(formData.get("next") ?? "").trim() || null;

  if (!fullName || !email || !password || !companyName) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
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

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required." };
  }

  const origin = await getRequestOrigin();

  if (!origin) {
    console.error("[requestPasswordResetAction] missing request origin for redirect URL");
    return {
      error: "Password reset is temporarily unavailable. Please try again later.",
    };
  }

  const supabase = await createClient();
  const redirectTo = buildAuthCallbackUrl(origin, RESET_PASSWORD_PATH);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("[requestPasswordResetAction] resetPasswordForEmail failed:", {
      message: error.message,
      code: error.code,
    });
    return {
      error: "Could not start password reset. Please try again in a moment.",
    };
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
