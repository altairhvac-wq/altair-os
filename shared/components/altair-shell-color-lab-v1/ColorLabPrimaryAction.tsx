"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { usePaletteTokens } from "./palette-context";

type ColorLabPrimaryActionProps = {
  topPriority: PriorityAction;
  primaryFocus: string;
  primaryImpact: string;
};

export function ColorLabPrimaryAction({
  topPriority,
  primaryFocus,
  primaryImpact,
}: ColorLabPrimaryActionProps) {
  const t = usePaletteTokens();

  return (
    <Link href={topPriority.href} className={t.primaryAction}>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={t.accentBadge}>Do this first</span>
            <span className={t.primaryActionSubtext}>Right now</span>
          </div>
          <p className={`mt-2 ${t.primaryActionTitle}`}>{topPriority.label}</p>
          {topPriority.metric ? (
            <p className={t.primaryActionMetric}>{topPriority.metric}</p>
          ) : null}
          <p className={`mt-2 ${t.primaryActionBody}`}>{primaryFocus}</p>
          <p className={`mt-1 ${t.metaDark}`}>{primaryImpact}</p>
        </div>
        <span className={t.accentCta}>
          Start now
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
