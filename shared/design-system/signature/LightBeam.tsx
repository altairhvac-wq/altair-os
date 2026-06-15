export type LightBeamPosition = "center" | "left" | "right";

export type LightBeamTone = "neutral" | "cyan" | "warm";

export type LightBeamProps = {
  position?: LightBeamPosition;
  tone?: LightBeamTone;
  className?: string;
};

const positionStyles: Record<LightBeamPosition, string> = {
  center: "left-1/2 -translate-x-1/2",
  left: "left-[20%] sm:left-[25%]",
  right: "right-[20%] sm:right-[25%]",
};

const beamStyles: Record<LightBeamTone, { vertical: string; horizon: string }> = {
  neutral: {
    vertical:
      "bg-[linear-gradient(to_bottom,rgba(148,163,184,0.12)_0%,rgba(148,163,184,0.04)_40%,transparent_85%)]",
    horizon:
      "bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgba(148,163,184,0.10),transparent_70%)]",
  },
  cyan: {
    vertical:
      "bg-[linear-gradient(to_bottom,rgba(34,211,238,0.14)_0%,rgba(14,165,233,0.05)_35%,transparent_80%)]",
    horizon:
      "bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgba(34,211,238,0.12),transparent_70%)]",
  },
  warm: {
    vertical:
      "bg-[linear-gradient(to_bottom,rgba(251,191,36,0.10)_0%,rgba(244,114,182,0.04)_40%,transparent_85%)]",
    horizon:
      "bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgba(251,191,36,0.08),transparent_70%)]",
  },
};

export function LightBeam({
  position = "center",
  tone = "cyan",
  className = "",
}: LightBeamProps) {
  const beam = beamStyles[tone];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Vertical light column */}
      <div
        className={`absolute top-0 h-full w-24 sm:w-32 md:w-40 ${positionStyles[position]} ${beam.vertical}`}
      />
      {/* Horizon glow anchor */}
      <div
        className={`absolute inset-x-0 bottom-0 h-16 sm:h-20 md:h-24 ${beam.horizon}`}
      />
    </div>
  );
}
