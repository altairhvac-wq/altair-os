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
  neutral: "bg-slate-100/95 text-slate-700 ring-slate-400/15",
  success: "bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  warning: "bg-amber-50/95 text-amber-800 ring-amber-500/15",
  danger: "bg-rose-50/95 text-rose-800 ring-rose-500/15",
  info: "bg-sky-50/95 text-sky-800 ring-sky-500/15",
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
