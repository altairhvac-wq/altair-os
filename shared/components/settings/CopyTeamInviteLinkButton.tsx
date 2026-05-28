"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { buildTeamInviteShareTextFromOrigin } from "@/shared/lib/team-invite-link";

type CopyTeamInviteLinkButtonProps = {
  inviteEmail: string;
  companyName?: string;
  className?: string;
  disabled?: boolean;
};

export function CopyTeamInviteLinkButton({
  inviteEmail,
  companyName,
  className = "",
  disabled = false,
}: CopyTeamInviteLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (disabled) {
      return;
    }

    const text = buildTeamInviteShareTextFromOrigin(
      window.location.origin,
      inviteEmail,
      companyName,
    );

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      {copied ? "Copied invite link" : "Copy invite link"}
    </button>
  );
}
