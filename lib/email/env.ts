export type ResendEmailEnv = {
  apiKey: string;
  from: string;
};

export type EmailEnvCheck =
  | { configured: true; resend: ResendEmailEnv }
  | { configured: false; missing: string[] };

const RESEND_API_KEY_ENV = "RESEND_API_KEY";
const RESEND_FROM_EMAIL_ENV = "RESEND_FROM_EMAIL";
const APP_URL_ENV = "NEXT_PUBLIC_APP_URL";
const NEXT_PUBLIC_APP_URL_ENV = APP_URL_ENV;

export function getMissingResendEnvVars(): string[] {
  const missing: string[] = [];

  if (!process.env[RESEND_API_KEY_ENV]?.trim()) {
    missing.push(RESEND_API_KEY_ENV);
  }

  if (!process.env[RESEND_FROM_EMAIL_ENV]?.trim()) {
    missing.push(RESEND_FROM_EMAIL_ENV);
  }

  return missing;
}

export function getResendEmailEnv(): EmailEnvCheck {
  const missing = getMissingResendEnvVars();

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  return {
    configured: true,
    resend: {
      apiKey: process.env[RESEND_API_KEY_ENV]!.trim(),
      from: process.env[RESEND_FROM_EMAIL_ENV]!.trim(),
    },
  };
}

export function getAppBaseUrl(): string | null {
  const explicit = process.env[NEXT_PUBLIC_APP_URL_ENV]?.trim();

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();

  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return null;
}

export function getMissingInviteEmailEnvVars(): string[] {
  const missing = getMissingResendEnvVars();

  if (!getAppBaseUrl()) {
    missing.push(APP_URL_ENV);
  }

  return missing;
}

export function formatMissingEmailEnvMessage(_missing: string[]): string {
  return "Email isn't set up yet. Ask your office admin to configure outbound email in Settings.";
}

/** Temporary diagnostics — logs presence only, never secret values. */
export function logInviteEmailEnvPresence(context: string): void {
  console.info(`[team-invite-debug:${context}] env presence:`, {
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY?.trim()),
    RESEND_FROM_EMAIL: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    VERCEL_URL: Boolean(process.env.VERCEL_URL?.trim()),
    NODE_ENV: process.env.NODE_ENV ?? "unknown",
  });
}
