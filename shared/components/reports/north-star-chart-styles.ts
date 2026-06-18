/**
 * North Star report chart presentation tokens — visual only.
 * Consumed when ReportSurfaceVariant is "northStar"; legacy paths stay unchanged.
 */

export const nsReportChart = {
  gridLine: "border-t border-[rgba(138,99,36,0.07)]",
  track: "overflow-hidden rounded-md bg-[#EDE3C8]",
  trackSegmented: "flex gap-0.5 overflow-hidden rounded-md bg-[#EDE3C8] p-0.5",
  axisLabel: "text-[10px] font-medium tabular-nums leading-none text-[#6B6255]",
  chartFrame:
    "relative overflow-hidden rounded-lg border border-[rgba(138,99,36,0.08)] bg-gradient-to-b from-[#FFF9EA]/70 to-[#FBF7EF]",
  chartPlot: "absolute inset-x-3 inset-y-2 sm:inset-x-4 sm:inset-y-3",

  revenue: {
    line: "#8A6324",
    lineWidth: 0.55,
    areaTop: "rgba(184, 138, 46, 0.16)",
    areaBottom: "rgba(184, 138, 46, 0.02)",
    point: "#B88A2E",
    pointPeak: "#8A6324",
    pointRadius: 0.75,
    pointPeakRadius: 1.05,
  },

  cashHealth: {
    paid: { bar: "bg-[#5C7A5F]", dot: "bg-[#5C7A5F]", text: "text-[#3D5A40]" },
    outstanding: {
      bar: "bg-[#B88A2E]",
      dot: "bg-[#B88A2E]",
      text: "text-[#8A6324]",
    },
    overdue: { bar: "bg-[#9E5555]", dot: "bg-[#9E5555]", text: "text-[#7A3D3D]" },
  },

  funnelStages: [
    "bg-[#8A6324]",
    "bg-[#5C7A5F]",
    "bg-[#A68942]",
    "bg-[#4F4638]",
  ] as const,

  funnelBar: "h-2.5 rounded-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
  funnelBarFill:
    "h-full rounded-sm shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] transition-[width] duration-300 ease-out",

  techBar: "h-2 rounded-sm",
  techBarFill:
    "h-full rounded-sm shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)] transition-[width] duration-300 ease-out",
  techProfitBar: "bg-[#5C7A5F]",
  techRevenueBar: "bg-[#8A6324]/85",

  table: {
    row: "px-3 py-3 transition-colors hover:bg-[#FFF9EA]/55 sm:px-4",
    header:
      "text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B6255]",
  },
} as const;
