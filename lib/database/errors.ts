type DatabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function isSafeUserFacingMessage(message: string): boolean {
  const lower = message.toLowerCase();

  return (
    message.length > 0 &&
    message.length <= 200 &&
    !lower.includes("sql state") &&
    !lower.includes("plpgsql") &&
    !lower.includes("at character") &&
    !lower.includes("schema cache")
  );
}

export function mapDatabaseError(error: DatabaseErrorLike): string {
  const rawMessage = error.message?.trim() ?? "";
  const message = rawMessage.toLowerCase();

  if (message.includes("not authenticated")) {
    return "Your session expired. Please sign in again.";
  }

  if (message.includes("was not found") || message.includes("not found or")) {
    if (message.includes("job")) {
      return "Job not found. It may have been removed or you no longer have access.";
    }

    if (message.includes("customer")) {
      return "Customer not found. They may have been removed or you no longer have access.";
    }

    if (message.includes("invoice")) {
      return "Invoice not found. It may have been removed or you no longer have access.";
    }

    if (message.includes("invitation")) {
      return "Invitation not found or no longer available.";
    }
  }

  if (
    message.includes("cannot be reassigned") ||
    message.includes("cannot be assigned")
  ) {
    return rawMessage.endsWith(".") ? rawMessage : `${rawMessage}.`;
  }

  if (message.includes("already completed") || message.includes("already paid")) {
    return rawMessage.endsWith(".") ? rawMessage : `${rawMessage}.`;
  }

  if (message.includes("company name is required")) {
    return "Company name is required.";
  }

  if (message.includes("duplicate key") || error.code === "23505") {
    return "That record already exists. Try signing in instead.";
  }

  if (message.includes("permission denied") || error.code === "42501") {
    return "You do not have permission to perform this action.";
  }

  if (
    error.code === "PGRST202" ||
    message.includes("could not find the function")
  ) {
    return "Company setup is not available yet. Please contact support.";
  }

  if (
    message.includes("row-level security") ||
    message.includes("infinite recursion detected in policy")
  ) {
    return "Could not access your company workspace. Please try again.";
  }

  if (error.code === "P0001" && isSafeUserFacingMessage(rawMessage)) {
    return rawMessage;
  }

  if (isSafeUserFacingMessage(rawMessage)) {
    return rawMessage;
  }

  return "Something went wrong. Please try again.";
}

export function mapAuthError(error: { message?: string; code?: string }): string {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (message.includes("user already registered")) {
    return "An account with this email already exists.";
  }

  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }

  if (message.includes("unable to validate email")) {
    return "Please enter a valid email address.";
  }

  if (message.includes("signup is disabled")) {
    return "Sign up is currently unavailable. Please contact support.";
  }

  return mapDatabaseError(error);
}
