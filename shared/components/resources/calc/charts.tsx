"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Plain SVG/CSS charts for the calculators: no chart library, nothing loaded
 * from anywhere. Colors are the site's stone/brass neutrals; green is kept
 * for profit and red for loss, never decoration.
 */

const exact = "[print-color-adjust:exact] [-webkit-print-color-adjust:exact]";

export const CHART = {
  ink: "#1c1917",
  stone: "#78716c",
  light: "#a8a29e",
  brass: "#A4823A",
  brassLight: "#d8bf86",
  brassDark: "#77591B",
  profit: "#059669",
  loss: "#dc2626",
} as const;

/** 1, 2, 2.5, 5 x 10^n steps for an axis from 0 (or below) to max. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = Math.max(1e-9, max - min);
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => span / s <= count) ?? 10 * power;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/* ---------------------------------------------------------------- bars */

export type BarRow = {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly display: string;
  readonly sub?: string;
  readonly highlight?: boolean;
  readonly color?: string;
};

/** Horizontal bars on one scale, with the value at the end of each. */
export function HBars({ rows, ariaLabel }: { readonly rows: readonly BarRow[]; readonly ariaLabel: string }) {
  const max = Math.max(1e-9, ...rows.map((row) => Math.abs(row.value)));
  return (
    <ul className="mt-4 space-y-3" aria-label={ariaLabel}>
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className={`min-w-0 truncate ${row.highlight ? "font-semibold text-stone-900" : "text-stone-700"}`}>{row.label}</span>
            <span className={`shrink-0 tabular-nums ${row.highlight ? "font-semibold text-stone-900" : "text-stone-800"}`}>
              {row.display}
              {row.sub ? <span className="ml-1.5 text-xs font-normal text-stone-500">{row.sub}</span> : null}
            </span>
          </div>
          <div className={`mt-1.5 h-3 overflow-hidden rounded-full bg-stone-100 ${exact}`}>
            <div
              className={`h-full rounded-full ${exact}`}
              style={{
                width: `${Math.max(0, (Math.abs(row.value) / max) * 100)}%`,
                backgroundColor: row.color ?? (row.highlight ? CHART.brass : CHART.light),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------- stacked bar */

export type Slice = { readonly key: string; readonly label: string; readonly value: number; readonly color: string };

/** One stacked bar and its legend: what a price or a cost is made of. */
export function SplitBar({ slices, ariaLabel, format, showShare = true }: {
  readonly slices: readonly Slice[];
  readonly ariaLabel: string;
  readonly format: (value: number) => string;
  readonly showShare?: boolean;
}) {
  const shown = slices.filter((slice) => slice.value > 0.004);
  const total = shown.reduce((sum, slice) => sum + slice.value, 0);
  return (
    <div className="mt-3">
      <div className={`flex h-3.5 overflow-hidden rounded-full bg-stone-100 ${exact}`} role="img" aria-label={ariaLabel}>
        {total > 0
          ? shown.map((slice) => (
              <span key={slice.key} style={{ width: `${(slice.value / total) * 100}%`, backgroundColor: slice.color }} className={`h-full border-r border-white last:border-r-0 ${exact}`} />
            ))
          : null}
      </div>
      <ul className="mt-3 space-y-1.5 text-[12.5px]">
        {shown.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-stone-700">
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-sm ${exact}`} style={{ backgroundColor: slice.color }} />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-stone-900">
              {format(slice.value)}
              {showShare ? <span className="ml-1.5 inline-block w-9 text-right text-xs text-stone-500">{total > 0 ? `${Math.round((slice.value / total) * 100)}%` : ""}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------- waterfall */

export type WaterfallStep = {
  readonly key: string;
  readonly label: string;
  /** Total bars stand on zero; "less" bars hang from the running total. */
  readonly kind: "total" | "less";
  readonly value: number;
  readonly display: string;
};

/** Where each bar starts and ends: totals stand on zero, costs hang from the running total. */
function stackWaterfall(steps: readonly WaterfallStep[]) {
  const out: (WaterfallStep & { from: number; to: number })[] = [];
  let running = 0;
  for (const step of steps) {
    if (step.kind === "total") {
      running = step.value;
      out.push({ ...step, from: Math.min(0, step.value), to: Math.max(0, step.value) });
    } else {
      const top = running;
      running -= step.value;
      out.push({ ...step, from: Math.min(top, running), to: Math.max(top, running) });
    }
  }
  return out;
}

/** Revenue stepping down to profit, one cost at a time. */
export function Waterfall({ steps, ariaLabel }: { readonly steps: readonly WaterfallStep[]; readonly ariaLabel: string }) {
  const bars = stackWaterfall(steps);
  const min = Math.min(0, ...bars.map((b) => b.from));
  const max = Math.max(1e-9, ...bars.map((b) => b.to));
  const span = max - min;
  const pos = (v: number) => ((v - min) / span) * 100;
  return (
    <ul className="mt-4 space-y-2" aria-label={ariaLabel}>
      {bars.map((bar, index) => {
        const isLast = index === bars.length - 1;
        const color =
          bar.kind === "less" ? CHART.light : isLast ? (bar.value < 0 ? CHART.loss : CHART.profit) : index === 0 ? CHART.ink : CHART.brass;
        return (
          <li key={bar.key} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
            <span className={`truncate text-[12.5px] ${bar.kind === "total" ? "font-semibold text-stone-900" : "text-stone-600"}`}>{bar.label}</span>
            <div className="relative h-7">
              <div className="absolute inset-y-0 rounded bg-stone-50" style={{ left: 0, right: 0 }} />
              {min < 0 ? <div className="absolute inset-y-0 w-px bg-stone-300" style={{ left: `${pos(0)}%` }} /> : null}
              <div
                className={`absolute inset-y-1 rounded ${exact}`}
                style={{ left: `${pos(bar.from)}%`, width: `${Math.max(0.6, pos(bar.to) - pos(bar.from))}%`, backgroundColor: color }}
              />
              <span
                className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 text-[11.5px] font-semibold tabular-nums ${bar.kind === "less" ? "text-stone-600" : "text-stone-900"}`}
                style={pos(bar.to) > 62 ? { right: `${100 - pos(bar.from)}%` } : { left: `${pos(bar.to)}%` }}
              >
                {bar.kind === "less" ? `− ${bar.display}` : bar.display}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------- line chart */

export type LineSeries = {
  readonly key: string;
  readonly label: string;
  readonly color: string;
  readonly points: readonly (readonly [number, number])[];
  readonly dashed?: boolean;
};

/**
 * Where a point's label starts: to the right of the point, else to its left,
 * else pinned inside the plot, so it is never cut off on a narrow phone.
 */
function labelX(x: number, width: number, min: number, max: number): number {
  if (x + 10 + width <= max) return x + 10;
  if (x - 10 - width >= min) return x - 10 - width;
  return Math.max(min, max - width);
}

export type ChartMarker ={ readonly key: string; readonly x: number; readonly y: number; readonly label: string; readonly tone: "strong" | "muted" };

/**
 * Lines over a shared x axis, with optional shaded areas (profit and loss),
 * marked points and labelled vertical guides. The legend is HTML under the
 * chart so it stays readable on a phone.
 */
export function LineChart({
  ariaLabel,
  xMax,
  xLabel,
  formatX,
  formatY,
  series,
  areas = [],
  markers = [],
  guides = [],
}: {
  readonly ariaLabel: string;
  readonly xMax: number;
  readonly xLabel: string;
  readonly formatX: (value: number) => string;
  readonly formatY: (value: number) => string;
  readonly series: readonly LineSeries[];
  readonly areas?: readonly { readonly key: string; readonly color: string; readonly points: readonly (readonly [number, number])[] }[];
  readonly markers?: readonly ChartMarker[];
  readonly guides?: readonly { readonly key: string; readonly x: number; readonly label: string }[];
}) {
  // Drawn at the container's own pixel width, so the labels stay 12px on a
  // phone and on a wide desktop card alike.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => setW(Math.max(280, Math.round(element.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const H = W < 480 ? 240 : 300;
  const pad = { l: 58, r: 16, t: 20, b: 40 };
  const ys = series.flatMap((s) => s.points.map((p) => p[1]));
  const yTicks = niceTicks(Math.min(0, ...ys), Math.max(1, ...ys), 5);
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const xTicks = niceTicks(0, xMax, 6).filter((t) => t <= xMax + 1e-9);
  const sx = (x: number) => pad.l + (x / xMax) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const path = (points: readonly (readonly [number, number])[]) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ");

  return (
    <div className="mt-4" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full ${exact}`} role="img" aria-label={ariaLabel}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke={t === 0 ? "#a8a29e" : "#e7e5e4"} strokeWidth={1} />
            <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="12" fill="#78716c">
              {formatY(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={H - pad.b + 18} textAnchor="middle" fontSize="12" fill="#78716c">
            {formatX(t)}
          </text>
        ))}
        <text x={(pad.l + W - pad.r) / 2} y={H - 4} textAnchor="middle" fontSize="12" fill="#57534e">
          {xLabel}
        </text>
        {areas.map((area) => (
          <polygon key={area.key} points={area.points.map((p) => `${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ")} fill={area.color} opacity={0.14} />
        ))}
        {guides.map((guide, index) =>
          guide.x >= 0 && guide.x <= xMax ? (
            <g key={guide.key}>
              <line x1={sx(guide.x)} x2={sx(guide.x)} y1={pad.t} y2={H - pad.b} stroke="#57534e" strokeDasharray="3 4" strokeWidth={1} />
              <text
                x={Math.min(W - pad.r - 4, Math.max(pad.l + 4, sx(guide.x)))}
                y={pad.t - 5 + (index % 2) * 16}
                paintOrder="stroke"
                stroke="#fff"
                strokeWidth={4} textAnchor={sx(guide.x) > W - 90 ? "end" : sx(guide.x) < pad.l + 60 ? "start" : "middle"} fontSize="11.5" fontWeight="600" fill="#44403c">
                {guide.label}
              </text>
            </g>
          ) : null,
        )}
        {series.map((s) => (
          <path key={s.key} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? "6 5" : undefined} strokeLinejoin="round" />
        ))}
        {markers.map((m, index) =>
          m.x >= 0 && m.x <= xMax ? (
            <g key={m.key}>
              <circle cx={sx(m.x)} cy={sy(m.y)} r={m.tone === "strong" ? 6 : 4.5} fill={m.tone === "strong" ? "#0d0f0c" : "#fff"} stroke="#0d0f0c" strokeWidth={2} />
              <text
                x={labelX(sx(m.x), m.label.length * 6.8, pad.l + 4, W - pad.r)}
                y={index % 2 === 0 ? sy(m.y) - 10 : sy(m.y) + 20}
                textAnchor="start"
                fontSize="12"
                fontWeight="600"
                fill="#1c1917"
                paintOrder="stroke"
                stroke="#fff"
                strokeWidth={4}
              >
                {m.label}
              </text>
            </g>
          ) : null,
        )}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-stone-600">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <svg aria-hidden="true" width="22" height="8" className={exact}>
              <line x1="1" x2="21" y1="4" y2="4" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? "5 4" : undefined} />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
