/**
 * The Altair loading mark: the brand gear (ring + 24 ticks) turning around a
 * still gold "A", with a gold arc sweeping the ring. Pure SVG + CSS, no JavaScript, so
 * it can render from a server `loading.tsx` before anything hydrates.
 * Reduced-motion visitors get a gentle pulse instead of rotation
 * (`altair-gear-spin` / `altair-gear-arc` in globals.css).
 */
const TICKS = Array.from({ length: 24 }, (_, index) => {
  const angle = (index / 24) * Math.PI * 2;
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    x1: round(240 + Math.cos(angle) * 200),
    y1: round(240 + Math.sin(angle) * 200),
    x2: round(240 + Math.cos(angle) * 214),
    y2: round(240 + Math.sin(angle) * 214),
  };
});

export function GearSpinner({
  size = 40,
  label = "Loading",
  tone = "dark",
  className = "",
}: {
  size?: number;
  /** Announced to screen readers; pass "" when the surrounding UI already says it. */
  label?: string;
  /** `dark` = for light backgrounds (graphite gear), `light` = for dark backgrounds. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const stroke = tone === "dark" ? "#5b6157" : "#c8cdd3";
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={`inline-flex ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 480 480" width={size} height={size} fill="none" focusable="false" aria-hidden="true">
        <g className="altair-gear-spin" stroke={stroke} strokeLinecap="round" style={{ transformOrigin: "240px 240px" }}>
          <circle cx={240} cy={240} r={200} strokeWidth={22} opacity={0.35} />
          {TICKS.map((tick) => (
            <line key={`${tick.x1}-${tick.y1}`} {...tick} strokeWidth={22} opacity={0.5} />
          ))}
        </g>
        {/* The Altair "A", still while the gear turns around it (logo geometry, 200-unit box). */}
        <g transform="translate(240 240) scale(2.05) translate(-100 -97)" fill={tone === "dark" ? "#a4823a" : "#c2a05a"}>
          <path d="M 90.19,29.02 L 109.81,38.98 L 45.81,164.98 L 26.19,155.02 Z" />
          <path d="M 90.19,38.98 L 109.81,29.02 L 173.81,155.02 L 154.19,164.98 Z" />
          <path d="M 44.22,120 L 155.78,120 L 163.91,136 L 36.09,136 Z" />
        </g>
        <circle
          className="altair-gear-arc"
          cx={240}
          cy={240}
          r={200}
          stroke="#c2a05a"
          strokeWidth={26}
          strokeLinecap="round"
          strokeDasharray="300 1257"
          style={{ transformOrigin: "240px 240px" }}
        />
      </svg>
    </span>
  );
}

/** A centred gear with a short line underneath, for whole-page loading states. */
export function PageLoadingMark({
  tone = "dark",
  text = "Loading",
}: {
  tone?: "dark" | "light";
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10" aria-busy="true">
      <GearSpinner size={44} tone={tone} label={text} />
      <p className={`text-xs font-medium tracking-[0.14em] uppercase ${tone === "dark" ? "text-stone-500" : "text-[#8e826f]"}`}>
        {text}
      </p>
    </div>
  );
}
