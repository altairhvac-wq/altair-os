"use client";

import { useId } from "react";
import {
  ALTAIR_BRAND_COLORS,
  ALTAIR_BRAND_LIBRARY,
  ALTAIR_GOLD_GRADIENT_STOPS,
  ALTAIR_PLATINUM_GRADIENT_STOPS,
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

// Wordmark canvas is 640×200 (icon occupies the first 200×200); keep that
// aspect ratio when the caller only specifies a width.
const WORDMARK_ASPECT = 200 / 640;

type MarkFills = { platinumFill: string; goldFill: string };

function resolveMarkFills(
  variant: AltairBrandVariant,
  platinumGradientId: string,
  goldGradientId: string,
): MarkFills {
  if (variant === "white") {
    return { platinumFill: ALTAIR_BRAND_COLORS.white, goldFill: ALTAIR_BRAND_COLORS.white };
  }
  if (variant === "gold") {
    // Monochrome gold treatment — both halves of the mark share the gold gradient.
    return { platinumFill: `url(#${goldGradientId})`, goldFill: `url(#${goldGradientId})` };
  }
  // "primary" — the native two-tone treatment (platinum + gold).
  return { platinumFill: `url(#${platinumGradientId})`, goldFill: `url(#${goldGradientId})` };
}

function AltairMark({
  platinumFill,
  goldFill,
  showGradients,
  platinumGradientId,
  goldGradientId,
}: MarkFills & {
  showGradients: boolean;
  platinumGradientId: string;
  goldGradientId: string;
}) {
  return (
    <>
      {showGradients ? (
        <defs>
          <linearGradient id={platinumGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {ALTAIR_PLATINUM_GRADIENT_STOPS.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <linearGradient id={goldGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {ALTAIR_GOLD_GRADIENT_STOPS.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <path fill={platinumFill} d={ALTAIR_MARK_PATHS.platinum} />
      <path fill={goldFill} d={ALTAIR_MARK_PATHS.gold} />
    </>
  );
}

function AltairWordmark({
  fill,
  subFill,
  fontSize,
}: {
  fill: string;
  subFill: string;
  fontSize: number;
}) {
  return (
    <>
      <text
        x="420"
        y="98"
        textAnchor="middle"
        fill={fill}
        fontFamily={ALTAIR_WORDMARK.fontFamily}
        fontSize={fontSize}
        fontWeight={ALTAIR_WORDMARK.fontWeight}
        letterSpacing={ALTAIR_WORDMARK.letterSpacing}
      >
        {ALTAIR_WORDMARK.text}
      </text>
      <line x1="330" y1="118" x2="510" y2="118" stroke={subFill} strokeWidth="1.25" opacity={0.8} />
      <text
        x="420"
        y="142"
        textAnchor="middle"
        fill={subFill}
        fontFamily="'Inter', sans-serif"
        fontSize={fontSize * 0.34}
        letterSpacing="0.28em"
      >
        OPERATING SYSTEM
      </text>
    </>
  );
}

export function AltairLogo({
  variant = "primary",
  size = "md",
  showWordmark = true,
  className = "",
}: AltairLogoProps) {
  const rawId = useId().replace(/:/g, "");
  const platinumGradientId = `${rawId}-platinum`;
  const goldGradientId = `${rawId}-gold`;
  const dimensions = SIZE_MAP[size];
  const resolvedVariant: AltairBrandVariant = variant === "icon" ? "primary" : variant;
  const useGradients = resolvedVariant !== "white";
  const { platinumFill, goldFill } = resolveMarkFills(
    resolvedVariant,
    platinumGradientId,
    goldGradientId,
  );
  const includeWordmark = variant !== "icon" && showWordmark;
  const includePrimaryBackground = resolvedVariant === "primary" && includeWordmark;

  const width = includeWordmark ? dimensions.wordmark : dimensions.icon;
  const height = includeWordmark
    ? Math.round(dimensions.wordmark * WORDMARK_ASPECT)
    : dimensions.icon;
  const wordmarkFontSize = size === "sm" ? 54 : size === "md" ? 60 : 66;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={includeWordmark ? "0 0 640 200" : "0 0 200 200"}
      width={width}
      height={height}
      role="img"
      aria-label="Altair"
      className={`shrink-0 ${className}`.trim()}
    >
      {includePrimaryBackground ? (
        <rect width="640" height="200" rx="18" fill={ALTAIR_BRAND_COLORS.black} />
      ) : null}
      <AltairMark
        platinumFill={platinumFill}
        goldFill={goldFill}
        showGradients={useGradients}
        platinumGradientId={platinumGradientId}
        goldGradientId={goldGradientId}
      />
      {includeWordmark ? (
        <AltairWordmark fill={platinumFill} subFill={goldFill} fontSize={wordmarkFontSize} />
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
