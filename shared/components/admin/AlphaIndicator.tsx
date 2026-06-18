"use client";

import { isAlphaHardeningEnabled } from "@/lib/beta/alpha-hardening";

const ALPHA_DETAIL =
  "Internal Alpha — Some areas are intentionally hidden or marked Coming Soon while we harden core workflows.";

type AlphaIndicatorProps = {
  tone?: "light" | "dark";
  northStar?: boolean;
};

export function AlphaIndicator({
  tone = "light",
  northStar = false,
}: AlphaIndicatorProps) {
  if (!isAlphaHardeningEnabled()) {
    return null;
  }

  return (
    <span
      role="status"
      title={ALPHA_DETAIL}
      aria-label={ALPHA_DETAIL}
      className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide sm:px-2 sm:text-[11px] ${
        northStar
          ? "north-star-header-alpha border-[rgba(201,164,77,0.28)] bg-[rgba(201,164,77,0.12)] text-[#E6D092]"
          : tone === "dark"
            ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
            : "border-sky-200/90 bg-sky-50 text-sky-700"
      }`}
    >
      Alpha
    </span>
  );
}
