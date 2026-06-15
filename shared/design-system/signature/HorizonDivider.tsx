export type HorizonDividerVariant = "fade" | "glow" | "line";

export type HorizonDividerProps = {
  variant?: HorizonDividerVariant;
  className?: string;
};

const variantStyles: Record<HorizonDividerVariant, string> = {
  fade: "h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent",
  glow: "h-8 sm:h-10 bg-gradient-to-b from-transparent via-slate-100/50 to-transparent",
  line: "h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent",
};

export function HorizonDivider({
  variant = "fade",
  className = "",
}: HorizonDividerProps) {
  return (
    <div
      role="separator"
      aria-hidden="true"
      className={`w-full ${variantStyles[variant]} ${className}`}
    />
  );
}
