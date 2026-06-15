import type { ReactNode } from "react";

export type AtmosphereTone = "neutral" | "cyan" | "warm" | "success";

export type AtmosphereIntensity = "subtle" | "medium";

export type AtmosphereBackgroundProps = {
  tone?: AtmosphereTone;
  intensity?: AtmosphereIntensity;
  className?: string;
  children?: ReactNode;
};

const glowStyles: Record<AtmosphereTone, { primary: string; secondary: string }> = {
  neutral: {
    primary: "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(148,163,184,0.18),transparent_70%)]",
    secondary: "bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,rgba(203,213,225,0.12),transparent_65%)]",
  },
  cyan: {
    primary: "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(34,211,238,0.14),transparent_70%)]",
    secondary: "bg-[radial-gradient(ellipse_55%_45%_at_15%_30%,rgba(14,165,233,0.10),transparent_65%)]",
  },
  warm: {
    primary: "bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(251,191,36,0.10),transparent_70%)]",
    secondary: "bg-[radial-gradient(ellipse_50%_40%_at_85%_25%,rgba(244,114,182,0.08),transparent_65%)]",
  },
  success: {
    primary: "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(52,211,153,0.12),transparent_70%)]",
    secondary: "bg-[radial-gradient(ellipse_55%_45%_at_20%_25%,rgba(16,185,129,0.08),transparent_65%)]",
  },
};

const intensityOpacity: Record<AtmosphereIntensity, string> = {
  subtle: "opacity-70",
  medium: "opacity-100",
};

export function AtmosphereBackground({
  tone = "neutral",
  intensity = "subtle",
  className = "",
  children,
}: AtmosphereBackgroundProps) {
  const glow = glowStyles[tone];
  const opacity = intensityOpacity[intensity];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${opacity}`}
      >
        <div className={`absolute inset-0 ${glow.primary}`} />
        <div className={`absolute inset-0 ${glow.secondary}`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_100%,rgba(248,250,252,0.85),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-50/40 to-transparent" />
      </div>

      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
}
