import {
  MARKET_RATE_BENCHMARK,
  MARKET_RATE_RANGE,
  type WorkspaceResult,
} from "@/shared/lib/resources/labor-workspace";

/** Plain SVG/CSS charts for the Labor Cost Workspace: no chart library. */

export const FICA_LABEL = "Social Security and Medicare, 7.65%";

export function formatMoney(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "–";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(fraction: number): string {
  if (!Number.isFinite(fraction)) return "–";
  const pct = fraction * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} hrs`;
}

type Slice = { key: string; label: string; value: number; color: string };

function slicesFor(result: WorkspaceResult): Slice[] {
  const s = result.slices;
  const advanced = result.burdenLines !== null;
  const all: Slice[] = [
    { key: "billed", label: "Wages for billed hours", value: s.billedWages, color: "#1c1917" },
    {
      key: "unbilled",
      label: advanced ? "Wages for unbilled hours and PTO" : "Wages for unbilled hours",
      value: s.unbilledWages,
      color: "#78716c",
    },
    {
      key: "taxes",
      label: advanced ? "Payroll taxes and workers' comp" : "Labor burden",
      value: s.taxes,
      color: "#A4823A",
    },
    { key: "benefits", label: "Health insurance", value: s.benefits, color: "#d8bf86" },
    { key: "vehicle", label: "Vehicle and tools", value: s.vehicle, color: "#77591B" },
    { key: "overhead", label: "Overhead", value: s.overhead, color: "#a8a29e" },
    { key: "profit", label: "Profit", value: s.profit, color: "#059669" },
  ];
  return all.filter((slice) => slice.value > 0.004);
}

export function RateDonut({ result }: { readonly result: WorkspaceResult }) {
  const slices = slicesFor(result);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="mt-4 flex flex-col items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]" role="img" aria-label="Breakdown of the recommended rate">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#f5f5f4" strokeWidth="18" />
        {total > 0
          ? slices.map((slice) => {
              const length = (slice.value / total) * circumference;
              const element = (
                <circle
                  key={slice.key}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="18"
                  strokeDasharray={`${Math.max(0, length - 1)} ${circumference}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                />
              );
              offset += length;
              return element;
            })
          : null}
        <text x="70" y="66" textAnchor="middle" className="fill-stone-900 text-[15px] font-semibold">
          {formatMoney(total)}
        </text>
        <text x="70" y="82" textAnchor="middle" className="fill-stone-500 text-[9px]">
          per billed hour
        </text>
      </svg>
      <ul className="w-full space-y-1.5 text-[13px]">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-stone-700">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm [print-color-adjust:exact] [-webkit-print-color-adjust:exact]" style={{ backgroundColor: slice.color }} />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-stone-900">
              {formatMoney(slice.value)}
              <span className="ml-1.5 inline-block w-10 text-right text-xs text-stone-500">{total > 0 ? `${Math.round((slice.value / total) * 100)}%` : ""}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Where the result sits against the published customer-rate range. */
export function MarketBand({ rate, breakEven }: { readonly rate: number; readonly breakEven: number }) {
  const max = Math.max(200, Math.ceil((Math.max(rate, breakEven) * 1.15) / 25) * 25);
  const pos = (value: number) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  const verdict =
    rate < MARKET_RATE_RANGE.low
      ? "below"
      : rate > MARKET_RATE_RANGE.high
        ? "above"
        : "inside";

  return (
    <div className="mt-4">
      <div className="relative mx-6 h-[88px]">
        <div className="absolute inset-x-0 top-7 h-2.5 rounded-full bg-stone-100" />
        <div
          className="absolute top-7 h-2.5 rounded-full bg-[#C2A05A]/45 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
          style={{ left: pos(MARKET_RATE_RANGE.low), width: `calc(${pos(MARKET_RATE_RANGE.high)} - ${pos(MARKET_RATE_RANGE.low)})` }}
        />
        <div className="absolute top-5 h-6 w-px bg-stone-500" style={{ left: pos(MARKET_RATE_BENCHMARK.value) }} title={MARKET_RATE_BENCHMARK.source} />
        <Marker left={pos(breakEven)} label="Break-even" tone="muted" />
        <Marker left={pos(rate)} label="You" tone="strong" />
      </div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-600">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-[#C2A05A]/45 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]" />
          $75 to $150 (HVAC.com)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-px bg-stone-500" />
          $140 (IBISWorld 2026)
        </li>
        <li className="tabular-nums text-stone-500">Scale $0 to ${max}</li>
      </ul>
      <p className="text-xs leading-relaxed text-stone-600">
        Your {formatMoney(rate)} is {verdict} the $75 to $150 an hour HVAC.com published for HVAC labor (2023). The
        tick is IBISWorld&apos;s 2026 benchmark of $140 per labor hour. Your costs set the floor, whatever the range.
      </p>
    </div>
  );
}

function Marker({ left, label, tone }: { readonly left: string; readonly label: string; readonly tone: "strong" | "muted" }) {
  if (tone === "muted") {
    return (
      <div className="absolute top-6 -translate-x-1/2" style={{ left }}>
        <span className="mx-auto block h-4 w-0.5 bg-stone-400" />
        <span className="mt-0.5 block whitespace-nowrap rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
          {label}
        </span>
      </div>
    );
  }
  return (
    <div className="absolute top-0 -translate-x-1/2" style={{ left }}>
      <span
        className={`block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold [print-color-adjust:exact] [-webkit-print-color-adjust:exact] ${
          tone === "strong" ? "bg-[#0d0f0c] text-[#fff9ea]" : "bg-stone-200 text-stone-700"
        }`}
      >
        {label}
      </span>
      <span className={`mx-auto mt-0.5 block h-4 w-0.5 ${tone === "strong" ? "bg-[#0d0f0c]" : "bg-stone-400"}`} />
    </div>
  );
}

/** A single stacked bar of the rate, for the results panel. */
export function RateBar({ result }: { readonly result: WorkspaceResult }) {
  const slices = slicesFor(result);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  return (
    <div className="mt-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-stone-100 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]" role="img" aria-label="Recommended rate split by cost">
        {total > 0
          ? slices.map((slice) => (
              <span key={slice.key} style={{ width: `${(slice.value / total) * 100}%`, backgroundColor: slice.color }} className="h-full border-r border-white last:border-r-0" />
            ))
          : null}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-2 lg:grid-cols-1">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-stone-600">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm [print-color-adjust:exact] [-webkit-print-color-adjust:exact]" style={{ backgroundColor: slice.color }} />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-stone-900">{formatMoney(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
