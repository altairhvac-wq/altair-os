"use client";

type AlphaIndicatorProps = {
  tone?: "light" | "dark";
  northStar?: boolean;
};

/**
 * Previously showed an "Internal Alpha" badge in the admin header.
 * Kept as a no-op so closed-beta tenants never see development branding.
 * Local development may reintroduce a non-customer label later if needed.
 */
export function AlphaIndicator(_props: AlphaIndicatorProps) {
  return null;
}
