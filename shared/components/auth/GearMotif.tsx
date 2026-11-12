/**
 * The faint gear drawn behind the sign-in and hero panels.
 *
 * Inline SVG on purpose: it used to be a CSS background image, and a large
 * background image is a "largest contentful paint" candidate, so this
 * 6%-opacity decoration was being timed as the homepage's main content.
 * Browsers do not count inline SVG shapes, so the headline is measured
 * instead. Same drawing as before (480x480, 24 ticks, three rings).
 */
const TICKS: readonly (readonly [number, number, number, number])[] = [
  [440.0, 240.0, 454.0, 240.0],
  [433.2, 291.8, 446.7, 295.4],
  [413.2, 340.0, 425.3, 347.0],
  [381.4, 381.4, 391.3, 391.3],
  [340.0, 413.2, 347.0, 425.3],
  [291.8, 433.2, 295.4, 446.7],
  [240.0, 440.0, 240.0, 454.0],
  [188.2, 433.2, 184.6, 446.7],
  [140.0, 413.2, 133.0, 425.3],
  [98.6, 381.4, 88.7, 391.3],
  [66.8, 340.0, 54.7, 347.0],
  [46.8, 291.8, 33.3, 295.4],
  [40.0, 240.0, 26.0, 240.0],
  [46.8, 188.2, 33.3, 184.6],
  [66.8, 140.0, 54.7, 133.0],
  [98.6, 98.6, 88.7, 88.7],
  [140.0, 66.8, 133.0, 54.7],
  [188.2, 46.8, 184.6, 33.3],
  [240.0, 40.0, 240.0, 26.0],
  [291.8, 46.8, 295.4, 33.3],
  [340.0, 66.8, 347.0, 54.7],
  [381.4, 98.6, 391.3, 88.7],
  [413.2, 140.0, 425.3, 133.0],
  [433.2, 188.2, 446.7, 184.6],
];

export function GearMotif({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 480"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none ${className}`}
      fill="none"
      stroke="#C8CDD3"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <circle cx={240} cy={240} r={200} />
      <circle cx={240} cy={240} r={178} strokeWidth={1} opacity={0.6} />
      <circle cx={240} cy={240} r={138} strokeWidth={1} opacity={0.35} />
      {TICKS.map(([x1, y1, x2, y2]) => (
        <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
    </svg>
  );
}
