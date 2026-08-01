/**
 * Compact inline sparkline used by Mission Control KPI strip and Reports
 * Tier 1 stat cards. Expects pre-bucketed series values (daily/weekly/monthly).
 */

function buildSparklinePath(values: number[]): string | null {
  if (values.length === 0) {
    return null;
  }

  const width = 120;
  const height = 40;
  const padY = 4;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y =
        height - padY - ((value - min) / range) * (height - padY * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

type KpiSparklineProps = {
  values: number[];
  className?: string;
};

export function KpiSparkline({ values, className }: KpiSparklineProps) {
  const path = buildSparklinePath(values);
  const hasSignal = values.some((value) => value > 0);

  return (
    <div
      className={
        className ??
        "mt-3 h-10 w-full rounded-md border border-altair-border bg-altair-paper-subtle/60"
      }
      aria-hidden="true"
    >
      {path && hasSignal ? (
        <svg
          viewBox="0 0 120 40"
          className="h-full w-full text-altair-brass"
          preserveAspectRatio="none"
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        </svg>
      ) : null}
    </div>
  );
}
