import Link from "next/link";
import { swipeItem, swipeRow } from "@/shared/components/marketing/phone/phone-classes";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CalendarRange,
  Clock3,
  FileSpreadsheet,
  FileText,
  Gauge,
  PiggyBank,
  ReceiptText,
  DoorOpen,
  ListChecks,
  Repeat2,
  Truck,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type { HubTool, ToolPreview } from "@/shared/lib/resources/tool-hub";

/**
 * Cards for the free tools: a mini preview of what the tool gives you (its
 * own worked example, computed in shared/lib/resources/tool-hub.ts), what it
 * solves, how long it takes and a way in. Used by the /resources hub (light)
 * and the homepage and /how-it-works tool strips (dark).
 *
 * Server components; the previews are drawn with plain elements, no chart
 * library and no client JavaScript.
 */

export type CardTone = "light" | "dark";

const ICONS: Record<string, LucideIcon> = {
  "labor-workspace": Calculator,
  "labor-rate": Gauge,
  "maintenance-agreement": CalendarRange,
  "technician-pay": Users,
  "callback-cost": Repeat2,
  "service-call-fee": DoorOpen,
  "hiring-a-technician": UserPlus,
  "truck-cost": Truck,
  "flat-rate-price-list": ListChecks,
  "invoice-builder": ReceiptText,
  templates: FileSpreadsheet,
  "break-even": BarChart3,
  "job-profitability": PiggyBank,
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

const TONE = {
  light: {
    card: "border-stone-200 bg-white shadow-sm hover:border-[#c2a05a] hover:shadow-md",
    ring: "focus-visible:ring-offset-white",
    preview: "bg-stone-50 ring-1 ring-inset ring-stone-200",
    label: "text-stone-500",
    figure: "text-[#0A0A0A]",
    detail: "text-stone-600",
    track: "bg-stone-200/80",
    barMuted: "bg-stone-400",
    barBrass: "bg-[#a4823a]",
    barProfit: "bg-emerald-600",
    barNeutral: "bg-stone-300",
    title: "text-[#0A0A0A]",
    solves: "text-stone-700",
    meta: "text-stone-500",
    cta: "text-[#77591B]",
    chip: "bg-stone-900 text-[#e8d9ac]",
    badge: "bg-amber-50 text-[#77591B] ring-1 ring-inset ring-[#C2A05A]/40",
    paper: "bg-white ring-1 ring-stone-200",
    paperRule: "border-stone-200",
    file: "bg-white text-stone-700 ring-1 ring-inset ring-stone-200",
  },
  dark: {
    card: "border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)] hover:border-[#c2a05a]/60",
    ring: "focus-visible:ring-offset-[#080907]",
    preview: "bg-[rgba(8,9,7,0.55)] ring-1 ring-inset ring-[rgba(230,227,220,0.08)]",
    label: "text-[#8e826f]",
    figure: "text-[#fff9ea]",
    detail: "text-[#c9bfae]",
    track: "bg-[rgba(230,227,220,0.08)]",
    barMuted: "bg-[#6f675a]",
    barBrass: "bg-[#c2a05a]",
    barProfit: "bg-emerald-500",
    barNeutral: "bg-[#4a463e]",
    title: "text-[#fff9ea]",
    solves: "text-[#c9bfae]",
    meta: "text-[#8e826f]",
    cta: "text-[#c2a05a]",
    chip: "bg-[#a4823a]/15 text-[#e8d9ac] ring-1 ring-inset ring-[#c2a05a]/30",
    badge: "bg-[#a4823a]/15 text-[#e8d9ac] ring-1 ring-inset ring-[#c2a05a]/30",
    paper: "bg-[#f8f5ee] ring-1 ring-black/10",
    paperRule: "border-stone-300",
    file: "bg-[rgba(230,227,220,0.06)] text-[#c9bfae] ring-1 ring-inset ring-[rgba(230,227,220,0.1)]",
  },
} as const;

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** A small, honest picture of the tool's own worked example. */
export function ToolPreviewView({ preview, tone }: { readonly preview: ToolPreview; readonly tone: CardTone }) {
  const t = TONE[tone];
  switch (preview.kind) {
    case "rate": {
      const max = preview.rate * 1.12;
      return (
        <div>
          <p className={`flex items-baseline gap-1.5 ${t.figure}`}>
            <span className="text-[1.75rem] font-semibold leading-none tabular-nums">${preview.rounded}</span>
            <span className={`text-xs ${t.detail}`}>per billable hour</span>
          </p>
          <ul className="mt-3 space-y-2 text-[11px]">
            {[
              { label: "Break-even", value: preview.breakEven, bar: t.barMuted },
              { label: "At 20% margin", value: preview.rate, bar: t.barBrass },
            ].map((row) => (
              <li key={row.label}>
                <div className="flex justify-between gap-2">
                  <span className={t.label}>{row.label}</span>
                  <span className={`font-semibold tabular-nums ${t.figure}`}>{usd(row.value)}</span>
                </div>
                <div className={`mt-1 h-1.5 overflow-hidden rounded-full ${t.track}`} aria-hidden="true">
                  <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${(row.value / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "figure":
      return (
        <div>
          <p className={`flex flex-wrap items-baseline gap-x-1.5 ${t.figure}`}>
            <span className="text-[1.75rem] font-semibold leading-none tabular-nums">{preview.figure}</span>
            <span className={`text-xs ${t.detail}`}>{preview.unit}</span>
          </p>
          <p className={`mt-2 text-xs ${t.detail}`}>{preview.detail}</p>
        </div>
      );
    case "bars": {
      const max = Math.max(...preview.bars.map((bar) => bar.value)) || 1;
      return (
        <div>
        <ul className="space-y-2 text-[11px]">
          {preview.bars.map((bar) => (
            <li key={bar.label} className="grid grid-cols-[4.75rem_minmax(0,1fr)_3.25rem] items-center gap-2">
              <span className={t.label}>{bar.label}</span>
              <div className={`h-2 overflow-hidden rounded-full ${t.track}`} aria-hidden="true">
                <div
                  className={`h-full rounded-full ${bar.value === max ? t.barBrass : t.barMuted}`}
                  style={{ width: `${(bar.value / max) * 100}%` }}
                />
              </div>
              <span className={`text-right font-semibold tabular-nums ${t.figure}`}>{bar.display}</span>
            </li>
          ))}
          </ul>
          <p className={`pt-2 text-[11px] ${t.detail}`}>Same week, three pay plans</p>
        </div>
      );
    }
    case "split": {
      const total = preview.parts.reduce((sum, part) => sum + Math.max(0, part.value), 0) || 1;
      const color = (tone2: "cost" | "profit" | "neutral") =>
        tone2 === "profit" ? t.barProfit : tone2 === "cost" ? t.barMuted : t.barNeutral;
      return (
        <div>
          <p className={`text-[1.4rem] font-semibold leading-none tabular-nums ${t.figure}`}>{preview.total}</p>
          <div className={`mt-3 flex h-2 overflow-hidden rounded-full ${t.track}`} aria-hidden="true">
            {preview.parts.map((part) => (
              <div key={part.label} className={color(part.tone)} style={{ width: `${(Math.max(0, part.value) / total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {preview.parts.map((part) => (
              <li key={part.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${color(part.tone)}`} />
                <span className={t.label}>{part.label}</span>
                <span className={`font-semibold tabular-nums ${t.figure}`}>{part.display}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "invoice":
      return (
        <div className={`rounded-md px-3 py-2.5 text-[10.5px] leading-tight text-stone-700 shadow-sm ${t.paper}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold tracking-[0.18em] text-stone-900">INVOICE</span>
            <span className="text-stone-500">Sample</span>
          </div>
          <ul className={`mt-1.5 space-y-1 border-t pt-1.5 ${t.paperRule}`}>
            {preview.lines.map((line) => (
              <li key={line.description} className="flex justify-between gap-3">
                <span className="truncate">{line.description}</span>
                <span className="shrink-0 tabular-nums">{line.amount}</span>
              </li>
            ))}
            <li className="text-stone-400">…</li>
          </ul>
          <div className={`mt-1.5 flex justify-between border-t pt-1.5 font-semibold text-stone-900 ${t.paperRule}`}>
            <span>Total</span>
            <span className="tabular-nums">{preview.total}</span>
          </div>
        </div>
      );
    case "files":
      return (
        <ul className="grid grid-cols-2 gap-1.5 text-[11px]">
          {preview.files.map((file) => (
            <li key={file} className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 ${t.file}`}>
              <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">{file}</span>
            </li>
          ))}
        </ul>
      );
  }
}

/** One tool: preview on top, then what it solves, how long, and the way in. */
export function ToolCard({
  tool,
  tone = "light",
  featured = false,
  headingLevel = 3,
  needs,
}: {
  readonly tool: HubTool;
  readonly tone?: CardTone;
  readonly featured?: boolean;
  readonly headingLevel?: 2 | 3 | 4;
  /** What to have open before starting, shown under the question (the calculators list). */
  readonly needs?: string;
}) {
  const t = TONE[tone];
  const Icon = ICONS[tool.id] ?? Wrench;
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 3 ? "h3" : "h4";
  const action =
    tool.id === "templates" ? "See the templates" : tool.id === "flat-rate-price-list" ? "Open the builder" : tool.workspace ? "Open the workspace" : "Open the calculator";

  return (
    <Link
      href={tool.href}
      data-track={`next-tool-${tool.id}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border transition-[border-color,box-shadow] ${t.card} ${focusRing} ${t.ring}`}
    >
      {/* One height for every preview, so the titles below line up across a row. */}
      <div className={`m-2 min-h-[10.5rem] rounded-xl p-4 ${t.preview}`}>
        <p className={`mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] ${t.label}`}>
          <span>{tool.id === "templates" ? "What you get" : "Worked example"}</span>
          {tool.workspace ? <span className={`rounded-full px-2 py-0.5 normal-case tracking-normal ${t.badge}`}>Workspace</span> : null}
        </p>
        <ToolPreviewView preview={tool.preview} tone={tone} />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <Heading className={`text-[15px] font-semibold leading-snug ${t.title}`}>{tool.title}</Heading>
        </div>
        <p className={`mt-2.5 text-sm font-medium leading-relaxed ${t.solves}`}>{tool.solves}</p>
        {featured ? <p className={`mt-1.5 text-sm leading-relaxed ${t.meta}`}>{tool.youGet}</p> : null}
        {needs ? (
          <p className={`mt-2.5 text-[13px] leading-relaxed ${t.meta}`}>
            <span className={`font-semibold ${t.solves}`}>Have on hand: </span>
            {needs}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-4">
          <span className={`inline-flex items-center gap-1 text-[13px] font-semibold ${t.cta}`}>
            {action}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className={`inline-flex items-center gap-1 text-xs ${t.meta}`}>
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            {tool.id === "templates" ? "Instant download" : `About ${tool.minutes} min`}
            {tool.inputs ? ` · ${tool.inputs} inputs` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** A row of tool cards with a link to the hub: the homepage and /how-it-works strip. */
export function ToolStrip({
  tools,
  tone,
  eyebrow,
  heading,
  intro,
  hubLabel,
  id,
}: {
  readonly tools: readonly HubTool[];
  readonly tone: CardTone;
  readonly eyebrow: string;
  readonly heading: string;
  readonly intro?: string;
  readonly hubLabel: string;
  readonly id: string;
}) {
  const dark = tone === "dark";
  return (
    <section aria-labelledby={id}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${dark ? "text-[#c2a05a]" : "text-[#77591B]"}`}>
            {eyebrow}
          </p>
          <h2
            id={id}
            className={`mt-3 text-[1.4rem] font-semibold tracking-tight sm:text-[1.75rem] ${dark ? "text-[#fff9ea]" : "text-[#0A0A0A]"}`}
          >
            {heading}
          </h2>
          {intro ? (
            <p className={`mt-2 text-sm leading-relaxed sm:text-base ${dark ? "text-[#c9bfae]" : "text-stone-600"}`}>{intro}</p>
          ) : null}
        </div>
        <Link
          href="/resources"
          data-track="next-hub-free-tools"
          className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 self-start rounded-lg border px-4 text-[13px] font-semibold transition-colors sm:self-auto ${
            dark
              ? "border-[rgba(230,227,220,0.18)] text-[#fbf7ef] hover:border-[#c2a05a]/60"
              : "border-stone-300 text-stone-800 hover:border-[#c2a05a]"
          } ${focusRing} ${dark ? "focus-visible:ring-offset-[#080907]" : ""}`}
        >
          {hubLabel}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className={`mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${swipeRow}`}>
        {tools.map((tool) => (
          <li key={tool.id} className={`min-w-0 ${swipeItem}`}>
            <ToolCard tool={tool} tone={tone} />
          </li>
        ))}
      </ul>
    </section>
  );
}
