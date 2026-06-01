"use client";

import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Info,
} from "lucide-react";

export const MOBILE_ACTION_SEVERITY_STYLES = {
  critical: {
    row: "border-slate-200/90 bg-white border-l-[3px] border-l-rose-500",
    tile: "border-rose-200/70 bg-white shadow-sm ring-1 ring-rose-100/60",
    count: "text-rose-700",
    badge: "bg-rose-100 text-rose-800",
    icon: AlertTriangle,
    iconClass: "text-rose-600",
  },
  warning: {
    row: "border-slate-200/90 bg-white border-l-[3px] border-l-amber-400",
    tile: "border-amber-200/60 bg-white shadow-sm ring-1 ring-amber-100/50",
    count: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    icon: AlertCircle,
    iconClass: "text-amber-600",
  },
  info: {
    row: "border-slate-200/80 bg-white",
    tile: "border-slate-200/70 bg-white shadow-sm",
    count: "text-slate-800",
    badge: "bg-slate-100 text-slate-600",
    icon: Info,
    iconClass: "text-slate-400",
  },
} as const;

export const MOBILE_ACTION_QUIET_TILE =
  "border-slate-100 bg-slate-50/70 shadow-none ring-0";

export function MobileActionCardChevron() {
  return (
    <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
  );
}
