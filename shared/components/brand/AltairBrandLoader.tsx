import { AltairBrandMark } from "@/shared/components/brand/AltairBrandMark";

type AltairBrandLoaderProps = {
  /** Full-viewport splash for auth/setup transitions. */
  variant?: "splash" | "inline";
  label?: string;
  className?: string;
};

/**
 * Branded loading mark — approved concept-v1 primary lockup with subtle motion.
 * Use on auth, setup, and other brand-forward loading surfaces only.
 */
export function AltairBrandLoader({
  variant = "inline",
  label = "Loading Altair",
  className = "",
}: AltairBrandLoaderProps) {
  if (variant === "splash") {
    return (
      <div
        className={`brand-surface-dark relative flex min-h-dvh flex-col items-center justify-center overflow-hidden ${className}`.trim()}
        role="status"
        aria-busy="true"
        aria-label={label}
      >
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="auth-glow-primary pointer-events-none absolute -left-24 -top-20 h-80 w-80" />
        <div className="auth-glow-secondary pointer-events-none absolute -bottom-24 -right-16 h-64 w-64" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="brand-loader-pulse">
            <AltairBrandMark presentation="loader" className="w-[220px]" priority />
          </div>
          <div className="flex flex-col items-center gap-2.5">
            <div className="auth-gold-rule h-px w-24" />
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">
              {label}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-3 py-2 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <div className="brand-loader-pulse">
        <AltairBrandMark presentation="loader" className="w-[180px] sm:w-[200px]" />
      </div>
      <div className="auth-gold-rule brand-loader-shimmer h-px w-16" />
    </div>
  );
}
