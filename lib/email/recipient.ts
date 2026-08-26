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
  /**
   * An override variable was set but deliberately ignored because this is a
   * production runtime. Mail goes to the real recipient; the caller reports
   * the misconfiguration.
   */
  overrideIgnoredInProduction?: boolean;
  warning?: string;
  overrideEnv?: string;
};

export type ResolveEmailRecipientFailureReason =
  | "invalid_recipient"
  | "recipient_override_invalid";

export type ResolveEmailRecipientResult =
  | { ok: true; recipient: ResolvedEmailRecipient }
  | {
      ok: false;
      reason: ResolveEmailRecipientFailureReason;
      error: string;
      overrideEnv?: string;
    };

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
  return `${envName} is set in production and is being IGNORED. Email is going to real recipients as intended, but this variable should not exist in a production environment — remove it in Vercel.`;
}

/**
 * Is this a production runtime?
 *
 * Read through a function so the check is one place and so the verifier can
 * assert on it. VERCEL_ENV is consulted as well as NODE_ENV because a Vercel
 * production deployment is production regardless of how NODE_ENV was set.
 */
function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV?.trim() === "production"
  );
}

export function resolveEmailRecipient(intendedTo: string): ResolveEmailRecipientResult {
  const intendedRecipient = intendedTo.trim();

  if (!intendedRecipient || !isValidEmail(intendedRecipient)) {
    return {
      ok: false,
      reason: "invalid_recipient",
      error: "Recipient email address is not valid.",
    };
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

  // ==================== THE OVERRIDE IS INERT IN PRODUCTION ====================
  //
  // This used to redirect in production too, composing an explicit warning
  // about it and then performing the redirect anyway. The warning went to
  // console.warn, which nothing was watching. The result: one stale Vercel
  // variable could silently intercept every estimate, invoice, payment link
  // and team invite indefinitely, and the only symptom a customer would
  // report is "I never got the email".
  //
  // Two candidate behaviours were available: refuse the send, or ignore the
  // override. Ignoring is correct. Refusing would convert a misconfiguration
  // into a total outage of customer email — strictly worse than the thing
  // being prevented — whereas ignoring restores the intended behaviour and
  // leaves only the operator's test inbox unfed.
  //
  // The misconfiguration is not silent: it is reported to the error monitor,
  // and the system check reports it too.
  if (isProductionRuntime()) {
    console.error(
      "[resolveEmailRecipient] recipient override IGNORED in production:",
      {
        envName,
        legacyEnvNames,
        intendedDomain: intendedRecipient.split("@")[1] ?? "unknown",
        overrideDomain: override.split("@")[1] ?? "unknown",
      },
    );

    return {
      ok: true,
      recipient: {
        to: intendedRecipient,
        intendedRecipient,
        redirected: false,
        // The caller (lib/email/resend.ts) reports this to the error monitor.
        // This module stays a pure decision function with no server-only
        // imports so it remains directly testable.
        overrideIgnoredInProduction: true,
        warning: formatEmailRecipientOverrideProductionWarning(envName),
        overrideEnv: envName,
      },
    };
  }

  if (!isValidEmail(override)) {
    return {
      ok: false,
      reason: "recipient_override_invalid",
      error: `${envName} is set but is not a valid email address.`,
      overrideEnv: envName,
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

  // Production returned above, so a redirect can only happen outside it.
  const warning = `Billing email redirected by ${envName}: intended ${intendedRecipient}, sent to ${override}.${legacyNote}`;

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
