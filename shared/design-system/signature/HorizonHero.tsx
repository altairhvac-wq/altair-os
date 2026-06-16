import type { ReactNode } from "react";
import { AtmosphereBackground, type AtmosphereTone } from "./AtmosphereBackground";
import { LightBeam, type LightBeamPosition, type LightBeamTone } from "./LightBeam";

export type HorizonHeroSize = "compact" | "standard" | "cockpit";

export type HorizonHeroProps = {
  children: ReactNode;
  tone?: AtmosphereTone;
  beamTone?: LightBeamTone;
  beamPosition?: LightBeamPosition;
  /** Compact collapses padding on mobile; standard is the default dashboard band. */
  size?: HorizonHeroSize;
  className?: string;
  contentClassName?: string;
};

const sizeStyles: Record<
  HorizonHeroSize,
  { shell: string; content: string }
> = {
  compact: {
    shell: "rounded-xl sm:rounded-2xl",
    content: "px-3 py-2.5 sm:px-4 sm:py-3",
  },
  standard: {
    shell: "rounded-2xl",
    content: "px-3 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5",
  },
  cockpit: {
    shell: "rounded-2xl",
    content: "px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5",
  },
};

/**
 * Production-safe signature hero band — atmosphere + light beam + content slot.
 * Decorative layers are aria-hidden via child primitives.
 */
export function HorizonHero({
  children,
  tone = "cyan",
  beamTone = "cyan",
  beamPosition = "center",
  size = "standard",
  className = "",
  contentClassName = "",
}: HorizonHeroProps) {
  const styles = sizeStyles[size];

  return (
    <section
      className={`relative min-w-0 overflow-hidden ${styles.shell} ${className}`}
    >
      <AtmosphereBackground tone={tone} intensity="subtle" className="h-full">
        <LightBeam position={beamPosition} tone={beamTone} />
        <div className={`relative ${styles.content} ${contentClassName}`}>
          {children}
        </div>
      </AtmosphereBackground>
    </section>
  );
}
