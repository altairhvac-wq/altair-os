"use client";

import { useId } from "react";
import {
  ALTAIR_BRAND_COLORS,
  ALTAIR_BRAND_LIBRARY,
  ALTAIR_GOLD_GRADIENT_STOPS,
  ALTAIR_MARK_PATHS,
  ALTAIR_WORDMARK,
  type AltairBrandVariant,
} from "@/shared/components/brand/brand-assets";

export type AltairLogoProps = {
  variant?: AltairBrandVariant | "icon";
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
};

const SIZE_MAP = {
  sm: { icon: 24, wordmark: 72 },
  md: { icon: 32, wordmark: 96 },
  lg: { icon: 48, wordmark: 140 },
} as const;

function resolveFill(
  variant: AltairBrandVariant,
  gradientId: string,
): string {
  if (variant === "white") {
    return ALTAIR_BRAND_COLORS.white;
  }

  return `url(#${gradientId})`;
}

function AltairMark({
  fill,
  showGradient,
  gradientId,
}: {
  fill: string;
  showGradient: boolean;
  gradientId: string;
}) {
  return (
    <>
      {showGradient ? (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            {ALTAIR_GOLD_GRADIENT_STOPS.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
              />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <path fill={fill} d={ALTAIR_MARK_PATHS.mark} />
    </>
  );
}

function AltairWordmark({
  fill,
  fontSize,
}: {
  fill: string;
  fontSize: number;
}) {
  return (
    <>
      <text
        x="50"
        y="78"
        textAnchor="middle"
        fill={fill}
        fontFamily={ALTAIR_WORDMARK.fontFamily}
        fontSize={fontSize}
        fontWeight={ALTAIR_WORDMARK.fontWeight}
        letterSpacing={ALTAIR_WORDMARK.letterSpacing}
      >
        {ALTAIR_WORDMARK.text}
      </text>
      <line
        x1="32"
        y1="84"
        x2="68"
        y2="84"
        stroke={fill}
        strokeWidth="0.75"
        opacity={fill === ALTAIR_BRAND_COLORS.white ? 0.45 : 0.55}
      />
    </>
  );
}

export function AltairLogo({
  variant = "primary",
  size = "md",
  showWordmark = true,
  className = "",
}: AltairLogoProps) {
  const gradientId = useId().replace(/:/g, "");
  const dimensions = SIZE_MAP[size];
  const resolvedVariant: AltairBrandVariant =
    variant === "icon" ? "gold" : variant;
  const useGradient = resolvedVariant !== "white";
  const fill = resolveFill(resolvedVariant, gradientId);
  const includeWordmark = variant !== "icon" && showWordmark;
  const includePrimaryBackground =
    resolvedVariant === "primary" && includeWordmark;

  const width = includeWordmark ? dimensions.wordmark : dimensions.icon;
  const height = includeWordmark
    ? Math.round(dimensions.wordmark * 0.56)
    : dimensions.icon;
  const iconScale = dimensions.icon / 80;
  const wordmarkFontSize = size === "sm" ? 11 : size === "md" ? 14 : 18;

  const markTransform = includeWordmark
    ? `translate(50 36) scale(${iconScale * 0.95}) translate(-40 -32)`
    : `translate(40 40) scale(${iconScale}) translate(-40 -32)`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={includeWordmark ? "0 0 100 90" : "0 0 80 80"}
      width={width}
      height={height}
      role="img"
      aria-label="Altair"
      className={`shrink-0 ${className}`.trim()}
    >
      {includePrimaryBackground ? (
        <rect
          width="100"
          height="90"
          rx="6"
          fill={ALTAIR_BRAND_COLORS.black}
        />
      ) : null}
      <g transform={markTransform}>
        <AltairMark
          fill={fill}
          showGradient={useGradient}
          gradientId={gradientId}
        />
      </g>
      {includeWordmark ? (
        <AltairWordmark fill={fill} fontSize={wordmarkFontSize} />
      ) : null}
    </svg>
  );
}

/** Canonical file paths in the repo asset library (`/branding`). */
export { ALTAIR_BRAND_LIBRARY as ALTAIR_BRAND_ASSETS } from "@/shared/components/brand/brand-assets";

export {
  ALTAIR_BRAND_COLORS,
  ALTAIR_BRAND_IDENTITY,
  ALTAIR_BRAND_LIBRARY,
  ALTAIR_BRAND_PUBLIC_PATHS,
  ALTAIR_BRAND_USAGE,
  ALTAIR_MARK_PATHS,
} from "@/shared/components/brand/brand-assets";
