import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/database/types/core-tables";
import { mapDatabaseError } from "./errors";

export type BootstrapCompanyResult = {
  companyId: string | null;
  error: string | null;
};

export const getCurrentUser = cache(async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

export const getCurrentProfile = cache(async function getCurrentProfile(): Promise<
  ProfileRow | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return profile;
});

export async function ensureProfileExists(
  user: User,
): Promise<{ profile: ProfileRow | null; error: string | null }> {
  const existing = await getCurrentProfile();

  if (existing) {
    return { profile: existing, error: null };
  }

  const supabase = await createClient();
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
    })
    .select("*")
    .maybeSingle();

  if (inserted) {
    return { profile: inserted, error: null };
  }

  if (insertError) {
    const { data: profile, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      return { profile, error: null };
    }

    return {
      profile: null,
      error: mapDatabaseError(selectError ?? insertError),
    };
  }

  return { profile: null, error: "Unable to create your profile." };
}

export async function bootstrapCompanyForNewUser(
  companyName: string,
): Promise<BootstrapCompanyResult> {
  const trimmedName = companyName.trim();

  if (!trimmedName) {
    return { companyId: null, error: "Company name is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bootstrap_company_for_new_user", {
    p_company_name: trimmedName,
  });

  if (error) {
    console.error("[bootstrapCompanyForNewUser] RPC bootstrap_company_for_new_user failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { companyId: null, error: mapDatabaseError(error) };
  }

  if (!data) {
    console.error(
      "[bootstrapCompanyForNewUser] RPC bootstrap_company_for_new_user returned no company id",
    );
    return {
      companyId: null,
      error: "Company setup did not return a workspace id. Please try again.",
    };
  }

  return { companyId: data, error: null };
}

export async function ensureOwnerMembershipExists(
  companyName: string,
): Promise<BootstrapCompanyResult> {
  return bootstrapCompanyForNewUser(companyName);
}

export function getCompanyNameFromUserMetadata(
  user: User,
): string | null {
  const value = user.user_metadata?.company_name;

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
