"use client";

import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import {
  DecisionSurface,
  ModuleGrid,
  ModuleGridItem,
} from "@/shared/design-system/layout";
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
  { container: string; text: string; title: string; body: string }
> = {
  error: {
    container: "border-[rgba(185,28,28,0.28)] bg-[rgba(254,242,242,0.92)]",
    text: "text-[#991B1B]",
    title: "text-sm font-semibold",
    body: "mt-0.5 text-sm leading-relaxed opacity-95",
  },
  warning: {
    container: "border-[rgba(180,83,9,0.22)] bg-[rgba(255,247,237,0.92)]",
    text: "text-[#9A3412]",
    title: "text-sm font-semibold",
    body: "mt-0.5 text-sm leading-relaxed opacity-95",
  },
  info: {
    /* Closed-beta account notice — secondary to Mission Briefing content */
    container:
      "border-[rgba(174,182,194,0.22)] bg-[rgba(255,255,255,0.06)] shadow-none",
    text: "text-[var(--north-star-text-light-muted)]",
    title: "text-xs font-medium tracking-tight text-[var(--north-star-text-light)]",
    body: "mt-0.5 text-xs leading-relaxed text-[var(--north-star-text-light-muted)] opacity-90",
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
    : {
        ...TONE_STYLES[model.tone],
        title: "font-semibold",
        body: "mt-0.5 text-sm leading-relaxed opacity-95",
      };
  const description =
    model.showManageAction && canManageBilling
      ? `${model.description} Contact support to update billing details.`
      : model.description;
  // Closed-beta status is desktop-only — it consumes scarce mobile chrome without aiding tasks.
  const hideOnMobile = access.state === "ACTIVE" && access.isComped;
  const isQuietInfo = northStar && model.tone === "info";

  return (
    <ModuleGrid
      rhythm="compact"
      className={`mb-2.5 ${hideOnMobile ? "hidden md:grid" : ""}`}
    >
      <ModuleGridItem span={1} size="s">
        <DecisionSurface
          size="s"
          variant="bare"
          role={model.role}
          aria-live={model.role === "alert" ? "assertive" : "polite"}
          title={model.title}
          description={description}
          className={`break-words rounded-lg border text-sm ${styles.container} ${styles.text} ${
            isQuietInfo ? "px-3 py-1.5" : "px-4 py-3"
          } ${className}`}
          classNames={{
            title: styles.title,
            description: styles.body,
          }}
        />
      </ModuleGridItem>
    </ModuleGrid>
  );
}
