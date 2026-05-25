"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function redirectIfCompanyReady(): never {
  redirect("/");
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

  redirectIfCompanyReady();
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();

  if (!fullName || !email || !password || !companyName) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
      },
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

  redirectIfCompanyReady();
}

export async function setupCompanyAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim();

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
    redirectIfCompanyReady();
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

  redirectIfCompanyReady();
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
