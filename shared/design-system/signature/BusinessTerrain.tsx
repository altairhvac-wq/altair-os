export type BusinessTerrainVariant = "mountains" | "rolling" | "minimal";

export type BusinessTerrainProps = {
  variant?: BusinessTerrainVariant;
  className?: string;
};

const variantStyles: Record<BusinessTerrainVariant, string> = {
  mountains: "h-24 sm:h-32 md:h-36",
  rolling: "h-20 sm:h-28 md:h-32",
  minimal: "h-12 sm:h-16 md:h-20",
};

export function BusinessTerrain({
  variant = "mountains",
  className = "",
}: BusinessTerrainProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative w-full overflow-hidden ${variantStyles[variant]} ${className}`}
    >
      {variant === "mountains" ? <MountainSilhouette /> : null}
      {variant === "rolling" ? <RollingTerrain /> : null}
      {variant === "minimal" ? <MinimalHorizon /> : null}
    </div>
  );
}

function MountainSilhouette() {
  return (
    <>
      {/* Back ridge — farthest depth */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%] bg-slate-200/35"
        style={{
          clipPath:
            "polygon(0% 100%, 0% 72%, 8% 58%, 18% 68%, 28% 42%, 38% 55%, 48% 35%, 58% 50%, 68% 38%, 78% 52%, 88% 40%, 96% 58%, 100% 48%, 100% 100%)",
        }}
      />
      {/* Mid ridge */}
      <div
        className="absolute inset-x-0 bottom-0 h-[70%] bg-slate-300/40"
        style={{
          clipPath:
            "polygon(0% 100%, 0% 78%, 12% 62%, 22% 72%, 34% 48%, 46% 60%, 56% 44%, 66% 58%, 76% 46%, 86% 62%, 94% 52%, 100% 65%, 100% 100%)",
        }}
      />
      {/* Front ridge — nearest depth */}
      <div
        className="absolute inset-x-0 bottom-0 h-[85%] bg-slate-400/30"
        style={{
          clipPath:
            "polygon(0% 100%, 0% 82%, 10% 70%, 20% 78%, 32% 58%, 44% 68%, 54% 55%, 64% 66%, 74% 56%, 84% 70%, 92% 62%, 100% 74%, 100% 100%)",
        }}
      />
      {/* Horizon fade */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-50/60 to-transparent" />
    </>
  );
}

function RollingTerrain() {
  return (
    <>
      {/* Back hills */}
      <div
        className="absolute inset-x-0 bottom-0 h-[60%] rounded-t-[50%] bg-slate-200/30"
        style={{ transform: "scaleX(1.4) translateY(15%)" }}
      />
      {/* Mid hills */}
      <div
        className="absolute inset-x-[-10%] bottom-0 h-[55%] rounded-t-[45%] bg-slate-300/35"
        style={{ transform: "scaleX(1.2) translateY(10%)" }}
      />
      {/* Front hills */}
      <div
        className="absolute inset-x-[-5%] bottom-0 h-[45%] rounded-t-[40%] bg-slate-400/25"
        style={{ transform: "scaleX(1.1)" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-50/50 to-transparent" />
    </>
  );
}

function MinimalHorizon() {
  return (
    <>
      <div
        className="absolute inset-x-0 bottom-0 h-[70%] bg-slate-300/25"
        style={{
          clipPath: "polygon(0% 100%, 0% 75%, 25% 68%, 50% 72%, 75% 65%, 100% 70%, 100% 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-50/40 to-transparent" />
    </>
  );
}
