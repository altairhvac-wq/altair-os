"use client";

import { useState } from "react";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import {
  getSubscriptionBillingBannerModel,
  type SubscriptionBillingBannerTone,
} from "./subscription-billing-banner-model";

type SubscriptionBillingBannerProps = {
  access: CompanyBillingAccess;
  canManageBilling: boolean;
  className?: string;
};

const TONE_STYLES: Record<
  SubscriptionBillingBannerTone,
  { container: string; text: string }
> = {
  error: {
    container: "border-rose-200 bg-rose-50",
    text: "text-rose-700",
  },
  warning: {
    container: "border-amber-200 bg-amber-50",
    text: "text-amber-800",
  },
  info: {
    container: "border-cyan-200 bg-cyan-50",
    text: "text-cyan-800",
  },
};

const NORTH_STAR_TONE_STYLES: Record<
  SubscriptionBillingBannerTone,
  { container: string; text: string }
> = {
  error: {
    container: "border-[rgba(185,28,28,0.28)] bg-[rgba(254,242,242,0.92)]",
    text: "text-[#991B1B]",
  },
  warning: {
    container: "border-[rgba(180,83,9,0.22)] bg-[rgba(255,247,237,0.92)]",
    text: "text-[#9A3412]",
  },
  info: {
    container: "border-[rgba(138,99,36,0.22)] bg-[#FFF9EA]",
    text: "text-[#4F4638]",
  },
};

export function SubscriptionBillingBanner({
  access,
  canManageBilling,
  className = "",
}: SubscriptionBillingBannerProps) {
  const [portalMessage, setPortalMessage] = useState<string | null>(null);
  const model = getSubscriptionBillingBannerModel(access, canManageBilling);

  if (!model) {
    return null;
  }

  const northStar = isNorthStarShellEnabled();
  const styles = northStar
    ? NORTH_STAR_TONE_STYLES[model.tone]
    : TONE_STYLES[model.tone];
  const manageButtonClass = northStar
    ? "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(138,99,36,0.28)] bg-white px-3 py-1.5 text-xs font-semibold text-[#17130E] transition-colors hover:bg-[#FFF9EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A6324]"
    : "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400";

  return (
    <div
      role={model.role}
      aria-live={model.role === "alert" ? "assertive" : "polite"}
      className={`mb-2.5 min-w-0 break-words rounded-lg border px-4 py-3 text-sm ${styles.container} ${styles.text} ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{model.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed opacity-95">
            {model.description}
          </p>
          {portalMessage ? (
            <p className="mt-2 text-sm leading-relaxed opacity-95" role="status">
              {portalMessage}
            </p>
          ) : null}
        </div>

        {model.showManageAction ? (
          <button
            type="button"
            className={manageButtonClass}
            onClick={() =>
              setPortalMessage(
                "Billing Portal management is coming soon. Contact support to change payment methods.",
              )
            }
          >
            Manage Subscription
          </button>
        ) : null}
      </div>
    </div>
  );
}
