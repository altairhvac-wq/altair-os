import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import {
  v3BrassBadgeClass,
  v3BrassCtaClass,
  v3MetaDarkClass,
  v3PrimaryActionClass,
} from "./v3-tokens";

type PrimaryActionPanelProps = {
  topPriority: PriorityAction;
  primaryFocus: string;
  primaryImpact: string;
};

export function PrimaryActionPanel({
  topPriority,
  primaryFocus,
  primaryImpact,
}: PrimaryActionPanelProps) {
  return (
    <Link href={topPriority.href} className={v3PrimaryActionClass}>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={v3BrassBadgeClass}>Do this first</span>
            <span className="text-[11px] font-medium text-slate-400">Right now</span>
          </div>
          <p className="mt-2 text-xl font-semibold leading-snug text-white sm:text-2xl">
            {topPriority.label}
          </p>
          {topPriority.metric ? (
            <p className="mt-1.5 text-base font-medium tabular-nums text-[#E8DDC2]">
              {topPriority.metric}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-medium text-slate-200">{primaryFocus}</p>
          <p className={`mt-1 ${v3MetaDarkClass}`}>{primaryImpact}</p>
        </div>
        <span className={v3BrassCtaClass}>
          Start now
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
