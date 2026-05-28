import { isValidEmail, normalizeEmail } from "@/shared/lib/email-validation";

export const EMAIL_RECIPIENT_OVERRIDE_ENV = "EMAIL_RECIPIENT_OVERRIDE";

/** @deprecated Use EMAIL_RECIPIENT_OVERRIDE. Still read so misconfigured Vercel vars are visible. */
const LEGACY_EMAIL_RECIPIENT_OVERRIDE_ENVS = [
  "TEST_EMAIL",
  "RESEND_TEST_EMAIL",
  "EMAIL_OVERRIDE_TO",
] as const;

export type EmailRecipientRedirectReason = "override_env" | "legacy_override_env";

export type ResolvedEmailRecipient = {
  to: string;
  intendedRecipient: string;
  redirected: boolean;
  redirectReason?: EmailRecipientRedirectReason;
  warning?: string;
  overrideEnv?: string;
};

export type ResolveEmailRecipientResult =
  | { ok: true; recipient: ResolvedEmailRecipient }
  | { ok: false; error: string };

export function readEmailRecipientOverrideEnv(): {
  value: string | null;
  envName: string | null;
  legacyEnvNames: string[];
} {
  const canonical = process.env[EMAIL_RECIPIENT_OVERRIDE_ENV]?.trim();

  if (canonical) {
    return {
      value: canonical,
      envName: EMAIL_RECIPIENT_OVERRIDE_ENV,
      legacyEnvNames: [],
    };
  }

  const legacyEnvNames: string[] = [];
  let legacyValue: string | null = null;
  let legacyEnvName: string | null = null;

  for (const envName of LEGACY_EMAIL_RECIPIENT_OVERRIDE_ENVS) {
    const value = process.env[envName]?.trim();

    if (value) {
      legacyEnvNames.push(envName);

      if (!legacyValue) {
        legacyValue = value;
        legacyEnvName = envName;
      }
    }
  }

  return {
    value: legacyValue,
    envName: legacyEnvName,
    legacyEnvNames,
  };
}

export function formatEmailRecipientOverrideProductionWarning(
  envName: string,
): string {
  return `${envName} is set in production. Billing emails are redirected away from customer addresses. Remove it in Vercel for beta customer delivery.`;
}

export function resolveEmailRecipient(intendedTo: string): ResolveEmailRecipientResult {
  const intendedRecipient = intendedTo.trim();

  if (!intendedRecipient || !isValidEmail(intendedRecipient)) {
    return { ok: false, error: "Recipient email address is not valid." };
  }

  const { value: override, envName, legacyEnvNames } =
    readEmailRecipientOverrideEnv();

  if (!override || !envName) {
    return {
      ok: true,
      recipient: {
        to: intendedRecipient,
        intendedRecipient,
        redirected: false,
      },
    };
  }

  if (!isValidEmail(override)) {
    return {
      ok: false,
      error: `${envName} is set but is not a valid email address.`,
    };
  }

  if (normalizeEmail(override) === normalizeEmail(intendedRecipient)) {
    return {
      ok: true,
      recipient: {
        to: intendedRecipient,
        intendedRecipient,
        redirected: false,
      },
    };
  }

  const redirectReason: EmailRecipientRedirectReason =
    envName === EMAIL_RECIPIENT_OVERRIDE_ENV
      ? "override_env"
      : "legacy_override_env";

  const legacyNote =
    legacyEnvNames.length > 0
      ? ` Rename ${legacyEnvNames.join(", ")} to ${EMAIL_RECIPIENT_OVERRIDE_ENV} for local dev only.`
      : "";

  const isProduction = process.env.NODE_ENV === "production";
  const warning = isProduction
    ? `Billing email redirected by ${envName}: intended ${intendedRecipient}, sent to ${override}. Remove ${envName} in Vercel for real customer delivery.${legacyNote}`
    : `Billing email redirected by ${envName}: intended ${intendedRecipient}, sent to ${override}.${legacyNote}`;

  if (legacyEnvNames.length > 0) {
    console.warn("[resolveEmailRecipient] legacy override env detected:", {
      activeEnv: envName,
      legacyEnvNames,
      intendedDomain: intendedRecipient.split("@")[1] ?? "unknown",
      overrideDomain: override.split("@")[1] ?? "unknown",
    });
  }

  console.warn("[resolveEmailRecipient] recipient override active:", {
    envName,
    isProduction,
    intendedDomain: intendedRecipient.split("@")[1] ?? "unknown",
    overrideDomain: override.split("@")[1] ?? "unknown",
  });

  return {
    ok: true,
    recipient: {
      to: override,
      intendedRecipient,
      redirected: true,
      redirectReason,
      warning,
      overrideEnv: envName,
    },
  };
}
