"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type NetworkInvitedByBannerProps = {
  sourceCompanyName: string;
  companyId: string;
};

function getDismissStorageKey(companyId: string): string {
  return `network-invite-attribution-dismissed:${companyId}`;
}

export function NetworkInvitedByBanner({
  sourceCompanyName,
  companyId,
}: NetworkInvitedByBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(getDismissStorageKey(companyId));
    setVisible(!dismissed);
  }, [companyId]);

  function handleDismiss() {
    window.localStorage.setItem(getDismissStorageKey(companyId), "1");
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Invited by</p>
        <p className="mt-0.5 text-sm text-slate-700">{sourceCompanyName}</p>
        <p className="mt-1 text-xs text-slate-500">
          You joined Altair through a trusted network invitation.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="rounded-lg p-1 text-slate-500 transition hover:bg-white hover:text-slate-700"
        aria-label="Dismiss invited by banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
