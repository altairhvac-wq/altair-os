"use client";

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
  const model = getSubscriptionBillingBannerModel(access, canManageBilling);

  if (!model) {
    return null;
  }

  const northStar = isNorthStarShellEnabled();
  const styles = northStar
    ? NORTH_STAR_TONE_STYLES[model.tone]
    : TONE_STYLES[model.tone];
  const description =
    model.showManageAction && canManageBilling
      ? `${model.description} Contact support to update billing details.`
      : model.description;

  return (
    <div
      role={model.role}
      aria-live={model.role === "alert" ? "assertive" : "polite"}
      className={`mb-2.5 min-w-0 break-words rounded-lg border px-4 py-3 text-sm ${styles.container} ${styles.text} ${className}`}
    >
      <div className="min-w-0">
        <p className="font-semibold">{model.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed opacity-95">{description}</p>
      </div>
    </div>
  );
}
