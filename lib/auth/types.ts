import type { AuthError, Session, User } from "@supabase/supabase-js";

export type AuthDataResult<T> = {
  data: T | null;
  error: AuthError | null;
};

export type AuthSessionResult = AuthDataResult<Session>;
export type AuthUserResult = AuthDataResult<User>;

export type SignInWithPasswordInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  fullName?: string;
  companyName?: string;
};

export type SignUpMetadata = {
  full_name?: string;
  company_name?: string;
};

export function isAuthError<T>(
  result: AuthDataResult<T>,
): result is { data: null; error: AuthError } {
  return result.error !== null;
}
