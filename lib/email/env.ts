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

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

/** Normalize host-only or scheme-less values into an absolute http(s) URL. */
export function normalizeAppBaseUrl(raw: string): string | null {
  const trimmed = stripTrailingSlash(raw.trim());

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (!url.hostname) {
        return null;
      }
      return stripTrailingSlash(url.toString());
    } catch {
      return null;
    }
  }

  const hostOnly = trimmed.replace(/^\/+/, "");
  const protocol = /^localhost(?::\d+)?$/i.test(hostOnly) ? "http" : "https";

  try {
    const url = new URL(`${protocol}://${hostOnly}`);
    if (!url.hostname) {
      return null;
    }
    return stripTrailingSlash(url.toString());
  } catch {
    return null;
  }
}

export type AppBaseUrlResolution =
  | { ok: true; url: string }
  | { ok: false; reason: "missing" | "invalid" };

export function resolveAppBaseUrl(): AppBaseUrlResolution {
  const explicit = process.env[NEXT_PUBLIC_APP_URL_ENV]?.trim();

  if (explicit) {
    const normalized = normalizeAppBaseUrl(explicit);
    if (!normalized) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, url: normalized };
  }

  const vercel = process.env.VERCEL_URL?.trim();

  if (vercel) {
    return { ok: true, url: `https://${stripTrailingSlash(vercel)}` };
  }

  return { ok: false, reason: "missing" };
}

export function getAppBaseUrl(): string | null {
  const resolved = resolveAppBaseUrl();
  return resolved.ok ? resolved.url : null;
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
    EMAIL_RECIPIENT_OVERRIDE: Boolean(
      process.env.EMAIL_RECIPIENT_OVERRIDE?.trim(),
    ),
    TEST_EMAIL: Boolean(process.env.TEST_EMAIL?.trim()),
    RESEND_TEST_EMAIL: Boolean(process.env.RESEND_TEST_EMAIL?.trim()),
    EMAIL_OVERRIDE_TO: Boolean(process.env.EMAIL_OVERRIDE_TO?.trim()),
  });
}

/** Temporary diagnostics for billing/resend sends — never logs the API key. */
export function logResendEnvDiagnostics(context: string): {
  hasResendApiKey: boolean;
  hasResendFromEmail: boolean;
  resendFromEmail: string | null;
  missing: string[];
} {
  const resendFromEmail = process.env[RESEND_FROM_EMAIL_ENV]?.trim() || null;
  const diagnostics = {
    hasResendApiKey: Boolean(process.env[RESEND_API_KEY_ENV]?.trim()),
    hasResendFromEmail: Boolean(resendFromEmail),
    resendFromEmail,
    missing: getMissingResendEnvVars(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercelEnv: process.env.VERCEL_ENV ?? null,
  };

  console.info(`[resend-env:${context}]`, diagnostics);

  return {
    hasResendApiKey: diagnostics.hasResendApiKey,
    hasResendFromEmail: diagnostics.hasResendFromEmail,
    resendFromEmail: diagnostics.resendFromEmail,
    missing: diagnostics.missing,
  };
}
