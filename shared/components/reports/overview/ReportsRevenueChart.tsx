import { formatCurrency } from "@/shared/types/customer";
import type { ReportTrendPoint } from "@/shared/types/reports-page";

/**
 * The one chart on the Reports page: money collected per bucket of the
 * selected period (a day, a week or a month, as the server decided).
 *
 * Bars, because each bucket is a separate total and a reader compares
 * heights. The line it replaced joined the buckets and ended by diving to
 * zero on a day that simply was not over yet. The axis starts at zero and is
 * labelled, so the height of a bar means its amount.
 */

const WIDTH = 720;
const HEIGHT = 240;
const PAD_LEFT = 58;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const BASELINE = 196;
const LABEL_Y = 220;
const MAX_X_LABELS = 8;
/**
 * The drawing scales with its card, so on a phone it is shown at under half
 * size. Axis text is set larger there (in drawing units) so it still reads
 * at about 10px on the screen.
 */
const AXIS_TEXT_CLASS = "fill-altair-ink-on-paper-secondary text-[11px] max-sm:text-[21px]";

function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function compactMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `$${Math.round(value)}`;
}

export function ReportsRevenueChart({ points }: { points: ReportTrendPoint[] }) {
  const total = points.reduce((sum, point) => sum + point.value, 0);

  if (points.length === 0 || total <= 0) {
    return (
      <p className="px-2 py-10 text-center text-sm text-altair-ink-on-paper-secondary sm:px-3">
        No payments were recorded in this period.
      </p>
    );
  }

  const ceiling = niceCeiling(Math.max(...points.map((point) => point.value)));
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = BASELINE - PAD_TOP;
  const slot = plotWidth / points.length;
  const barWidth = Math.max(2, Math.min(34, slot * 0.68));
  const labelEvery = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  const best = points.reduce((top, point) => (point.value > top.value ? point : top), points[0]);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Money collected: ${formatCurrency(total)} in total. The largest was ${formatCurrency(best.value)} on ${best.label}.`}
        className="h-auto w-full"
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = BASELINE - plotHeight * fraction;
          return (
            <g key={fraction}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-altair-border, #d9d4c8)"
                strokeOpacity={fraction === 0 ? 0.9 : 0.45}
                strokeDasharray={fraction === 0 ? undefined : "3 4"}
              />
              <text
                x={PAD_LEFT - 8}
                y={y + 4}
                textAnchor="end"
                className={AXIS_TEXT_CLASS}
              >
                {compactMoney(ceiling * fraction)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const height = (point.value / ceiling) * plotHeight;
          const x = PAD_LEFT + slot * index + (slot - barWidth) / 2;
          const showLabel = index % labelEvery === 0;
          return (
            <g key={`${point.label}-${index}`}>
              {point.value > 0 ? (
                <rect
                  x={x}
                  y={BASELINE - Math.max(1.5, height)}
                  width={barWidth}
                  height={Math.max(1.5, height)}
                  rx={Math.min(3, barWidth / 2)}
                  fill="var(--chart-1)"
                >
                  <title>{`${point.label}: ${formatCurrency(point.value)}`}</title>
                </rect>
              ) : null}
              {showLabel ? (
                <text
                  x={PAD_LEFT + slot * index + slot / 2}
                  y={LABEL_Y}
                  textAnchor="middle"
                  className={AXIS_TEXT_CLASS}
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="px-2 pb-1 text-xs text-altair-ink-on-paper-secondary sm:px-3">
        Largest: {formatCurrency(best.value)} on {best.label}.
        <span className="max-sm:hidden"> Hover a bar for its amount.</span>
      </figcaption>
    </figure>
  );
}
