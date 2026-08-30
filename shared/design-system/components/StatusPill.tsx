import type { ReactNode } from "react";
import { STATUS_TONE_CLASS, type StatusTone } from "./status-tone";

/** Alias kept for call-site compatibility; the vocabulary lives in status-tone.ts. */
export type StatusPillTone = StatusTone;
export type StatusPillSize = "sm" | "md";

export type StatusPillProps = {
  children: ReactNode;
  tone?: StatusPillTone;
  size?: StatusPillSize;
  className?: string;
};

const baseStyles =
  "inline-flex items-center rounded-full font-semibold leading-tight ring-1 ring-inset";

const sizeStyles: Record<StatusPillSize, string> = {
  sm: "px-2 py-0.5 text-[10px] sm:text-[11px]",
  md: "px-2.5 py-0.5 text-[11px] sm:text-xs",
};

/* The tone table lives in status-tone.ts so StatusPill and the operational
   status maps cannot drift apart again. */
const toneStyles = STATUS_TONE_CLASS;

export function StatusPill({
  children,
  tone = "neutral",
  size = "md",
  className = "",
}: StatusPillProps) {
  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${toneStyles[tone]} ${className}`}>
      {children}
    </span>
  );
}
