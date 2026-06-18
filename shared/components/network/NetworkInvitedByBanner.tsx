"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkInvitedByBannerProps = {
  sourceCompanyName: string;
  companyId: string;
  surface?: NetworkSurface;
};

function getDismissStorageKey(companyId: string): string {
  return `network-invite-attribution-dismissed:${companyId}`;
}

export function NetworkInvitedByBanner({
  sourceCompanyName,
  companyId,
  surface = "legacy",
}: NetworkInvitedByBannerProps) {
  const [visible, setVisible] = useState(false);
  const isNorthStar = surface === "north-star";

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

  const shellClass = isNorthStar
    ? "flex items-start justify-between gap-3 rounded-[1rem] border border-[rgba(201,164,77,0.28)] bg-[#FFF9EA] px-4 py-3"
    : "flex items-start justify-between gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3";
  const titleClass = isNorthStar
    ? "text-sm font-semibold text-[#17130E]"
    : "text-sm font-semibold text-slate-900";
  const nameClass = isNorthStar
    ? "mt-0.5 text-sm text-[#4F4638]"
    : "mt-0.5 text-sm text-slate-700";
  const bodyClass = isNorthStar
    ? "mt-1 text-xs text-[#6B6255]"
    : "mt-1 text-xs text-slate-500";
  const dismissClass = isNorthStar
    ? "rounded-lg p-1 text-[#6B6255] transition hover:bg-[#EFE4CB] hover:text-[#17130E]"
    : "rounded-lg p-1 text-slate-500 transition hover:bg-white hover:text-slate-700";

  return (
    <div className={shellClass}>
      <div>
        <p className={titleClass}>Invited by</p>
        <p className={nameClass}>{sourceCompanyName}</p>
        <p className={bodyClass}>
          You joined Altair through a trusted network invitation.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className={dismissClass}
        aria-label="Dismiss invited by banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
