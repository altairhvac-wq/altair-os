import { MIN_PASSWORD_LENGTH } from "./constants";

export function validatePasswordLength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return null;
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string,
): string | null {
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): string | null {
  const lengthError = validatePasswordLength(password);

  if (lengthError) {
    return lengthError;
  }

  return validatePasswordMatch(password, confirmPassword);
}
