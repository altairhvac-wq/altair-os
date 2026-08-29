"use client";

import Link from "next/link";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { StatusPill } from "@/shared/design-system/components";
import type { StatusPillTone } from "@/shared/design-system/components";
import {
  getSubscriptionBillingBannerModel,
  type SubscriptionBillingBannerTone,
} from "./subscription-billing-banner-model";

type SubscriptionBillingBannerProps = {
  access: CompanyBillingAccess;
  canManageBilling: boolean;
  className?: string;
};

const TONE_TO_PILL: Record<SubscriptionBillingBannerTone, StatusPillTone> = {
  info: "info",
  warning: "warning",
  error: "danger",
};

const BILLING_SETTINGS_HREF = "/settings/subscription";

/**
 * Compact subscription status notice for the persistent admin/technician
 * top bar. Renders once in the shell chrome — dashboards must not duplicate it.
 */
export function SubscriptionBillingBanner({
  access,
  canManageBilling,
  className = "",
}: SubscriptionBillingBannerProps) {
  const model = getSubscriptionBillingBannerModel(access, canManageBilling);

  if (!model) {
    return null;
  }

  const pillTone = TONE_TO_PILL[model.tone];
  // Closed-beta status is desktop-only — it consumes scarce mobile chrome without aiding tasks.
  const hideOnMobile = access.state === "ACTIVE" && access.isComped;
  const label = model.shortLabel;
  const tooltip = model.description;

  const pill = (
    <StatusPill tone={pillTone} size="sm" className="max-w-full truncate">
      {label}
    </StatusPill>
  );

  return (
    <div
      role={model.role}
      aria-live={model.role === "alert" ? "assertive" : "polite"}
      title={tooltip}
      className={`min-w-0 shrink ${hideOnMobile ? "hidden md:block" : ""} ${className}`}
    >
      {model.showManageAction ? (
        <Link
          href={BILLING_SETTINGS_HREF}
          className="inline-flex min-w-0 rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-label={`${label}. ${tooltip}`}
        >
          {pill}
        </Link>
      ) : (
        <span className="inline-flex min-w-0" aria-label={`${label}. ${tooltip}`}>
          {pill}
        </span>
      )}
    </div>
  );
}
