import type { CompanyRole } from "@/lib/database/types/enums";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import {
  formatMissingEmailEnvMessage,
  getAppBaseUrl,
  getMissingInviteEmailEnvVars,
  getResendEmailEnv,
  logInviteEmailEnvPresence,
} from "@/lib/email/env";
import { buildTeamInviteAcceptUrl, buildTeamInviteShareText } from "@/shared/lib/team-invite-link";

export type SendTeamInviteEmailResult =
  | { ok: true; providerMessageId: string }
  | {
      ok: false;
      reason: "not_configured";
      missingEnv: string[];
      message: string;
    }
  | { ok: false; reason: "app_url_missing"; message: string }
  | { ok: false; reason: "provider_error"; message: string };

type SendTeamInviteEmailInput = {
  to: string;
  companyName: string;
  inviteEmail: string;
  role: CompanyRole;
  inviterName?: string | null;
};

function buildInviteEmailSubject(companyName: string): string {
  return `You're invited to ${companyName} on Altair OS`;
}

function buildInviteEmailHtml(input: {
  companyName: string;
  inviteEmail: string;
  roleLabel: string;
  acceptUrl: string;
  inviterName?: string | null;
}): string {
  const inviterLine = input.inviterName
    ? `<p>${escapeHtml(input.inviterName)} invited you to join <strong>${escapeHtml(input.companyName)}</strong> as <strong>${escapeHtml(input.roleLabel)}</strong>.</p>`
    : `<p>You have been invited to join <strong>${escapeHtml(input.companyName)}</strong> as <strong>${escapeHtml(input.roleLabel)}</strong>.</p>`;

  return `
    <p>Hello,</p>
    ${inviterLine}
    <p>Sign up or log in at <a href="${escapeHtml(input.acceptUrl)}">${escapeHtml(input.acceptUrl)}</a> using <strong>${escapeHtml(input.inviteEmail)}</strong> to accept your invitation.</p>
    <p>If you did not expect this invitation, you can ignore this email.</p>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendTeamInviteEmail(
  input: SendTeamInviteEmailInput,
): Promise<SendTeamInviteEmailResult> {
  console.info("[team-invite-prod-debug] sendTeamInviteEmail entered", {
    toDomain: input.to.split("@")[1] ?? "unknown",
  });

  console.info("[team-invite-debug:sendTeamInviteEmail] entered", {
    toDomain: input.to.split("@")[1] ?? "unknown",
  });
  logInviteEmailEnvPresence("sendTeamInviteEmail");

  const missingEnv = getMissingInviteEmailEnvVars();

  if (missingEnv.length > 0) {
    console.info("[team-invite-debug:sendTeamInviteEmail] short-circuit: missing env", {
      missingEnv,
    });
    return {
      ok: false,
      reason: "not_configured",
      missingEnv,
      message: formatMissingEmailEnvMessage(missingEnv),
    };
  }

  const appBaseUrl = getAppBaseUrl();

  if (!appBaseUrl) {
    console.info("[team-invite-debug:sendTeamInviteEmail] short-circuit: app url missing");
    return {
      ok: false,
      reason: "app_url_missing",
      message:
        "Invite email could not be sent because the app URL is not configured. Set NEXT_PUBLIC_APP_URL (or deploy on Vercel).",
    };
  }

  const env = getResendEmailEnv();

  if (!env.configured) {
    const missing = getMissingInviteEmailEnvVars();
    console.info("[team-invite-debug:sendTeamInviteEmail] short-circuit: resend not configured", {
      missingEnv: missing,
    });
    return {
      ok: false,
      reason: "not_configured",
      missingEnv: missing,
      message: formatMissingEmailEnvMessage(missing),
    };
  }

  const acceptUrl = buildTeamInviteAcceptUrl(appBaseUrl);
  const roleLabel = COMPANY_ROLE_LABELS[input.role] ?? input.role;
  const text = buildTeamInviteShareText({
    acceptUrl,
    inviteEmail: input.inviteEmail,
    companyName: input.companyName,
  });

  try {
    console.info("[team-invite-debug:sendTeamInviteEmail] calling Resend API", {
      toDomain: input.to.split("@")[1] ?? "unknown",
      fromDomain: env.resend.from.split("@")[1] ?? "unknown",
    });

    console.info("[team-invite-prod-debug] before Resend fetch", {
      toDomain: input.to.split("@")[1] ?? "unknown",
      fromDomain: env.resend.from.split("@")[1] ?? "unknown",
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resend.from,
        to: [input.to],
        subject: buildInviteEmailSubject(input.companyName),
        text,
        html: buildInviteEmailHtml({
          companyName: input.companyName,
          inviteEmail: input.inviteEmail,
          roleLabel,
          acceptUrl,
          inviterName: input.inviterName,
        }),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    console.info("[team-invite-prod-debug] Resend response status", {
      status: response.status,
      ok: response.ok,
    });

    console.info("[team-invite-prod-debug] Resend response body", {
      body: payload,
    });

    console.info("[team-invite-debug:sendTeamInviteEmail] Resend API response", {
      status: response.status,
      ok: response.ok,
      providerMessageId: payload?.id ?? null,
      providerError: payload?.message ?? payload?.name ?? null,
      toDomain: input.to.split("@")[1] ?? "unknown",
    });

    if (!response.ok) {
      console.error("[sendTeamInviteEmail] provider rejected request:", {
        status: response.status,
        providerMessage: payload?.message ?? payload?.name ?? "unknown",
        toDomain: input.to.split("@")[1] ?? "unknown",
      });

      return {
        ok: false,
        reason: "provider_error",
        message:
          payload?.message ??
          "The email provider rejected the invite email. Check Resend configuration and sender domain.",
      };
    }

    const providerMessageId = payload?.id?.trim();

    if (!providerMessageId) {
      console.error("[sendTeamInviteEmail] provider response missing id:", {
        status: response.status,
        toDomain: input.to.split("@")[1] ?? "unknown",
      });

      return {
        ok: false,
        reason: "provider_error",
        message:
          "The email provider did not confirm delivery. The invite was saved; share the invite link manually.",
      };
    }

    console.info("[sendTeamInviteEmail] provider accepted invite email:", {
      providerMessageId,
      status: response.status,
      toDomain: input.to.split("@")[1] ?? "unknown",
    });

    return { ok: true, providerMessageId };
  } catch (error) {
    console.error("[sendTeamInviteEmail] provider request failed:", {
      toDomain: input.to.split("@")[1] ?? "unknown",
      error: error instanceof Error ? error.message : "unknown",
    });

    return {
      ok: false,
      reason: "provider_error",
      message:
        "Could not reach the email provider. The invite was saved; share the invite link manually.",
    };
  }
}
