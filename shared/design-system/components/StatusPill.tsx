import type { ReactNode } from "react";

export type StatusPillTone = "neutral" | "success" | "warning" | "danger" | "info";
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

const toneStyles: Record<StatusPillTone, string> = {
  neutral: "bg-altair-paper-subtle text-altair-ink-secondary ring-altair-border",
  success: "bg-altair-success-surface text-altair-success-foreground ring-altair-success/15",
  warning: "bg-altair-warning-surface text-altair-warning-foreground ring-altair-warning/15",
  danger: "bg-altair-danger-surface text-altair-danger-foreground ring-altair-danger/15",
  info: "bg-altair-information-surface text-altair-information-foreground ring-altair-information/15",
};

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
