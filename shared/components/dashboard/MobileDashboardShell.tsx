"use client";

import Link from "next/link";
import { memo } from "react";
import type { MobileDashboardSnapshotItem } from "@/shared/lib/mobile-dashboard-snapshot";

type MobileDashboardShellProps = {
  snapshot: MobileDashboardSnapshotItem[];
  children: React.ReactNode;
};

const SNAPSHOT_TONE_STYLES: Record<
  MobileDashboardSnapshotItem["tone"],
  { card: string; value: string }
> = {
  neutral: {
    card: "border-slate-200 bg-white",
    value: "text-slate-900",
  },
  success: {
    card: "border-emerald-200 bg-emerald-50/50",
    value: "text-emerald-900",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/50",
    value: "text-amber-900",
  },
  critical: {
    card: "border-rose-200 bg-rose-50/50",
    value: "text-rose-900",
  },
};

const MobileDashboardSnapshot = memo(function MobileDashboardSnapshot({
  items,
}: {
  items: MobileDashboardSnapshotItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Operations snapshot"
      className="admin-command-surface overflow-hidden p-3"
    >
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
          Snapshot
        </p>
        <h2 className="mt-0.5 text-base font-black tracking-tight text-white">
          Today at a glance
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => {
          const styles = SNAPSHOT_TONE_STYLES[item.tone];
          const body = (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p
                className={`mt-0.5 text-lg font-black tabular-nums leading-none tracking-tight ${styles.value}`}
              >
                {item.value}
              </p>
              {item.detail ? (
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
                  {item.detail}
                </p>
              ) : null}
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`min-w-0 rounded-lg border p-2.5 shadow-sm transition-colors hover:bg-white ${styles.card}`}
              >
                {body}
              </Link>
            );
          }

          return (
            <div
              key={item.id}
              className={`min-w-0 rounded-lg border p-2.5 shadow-sm ${styles.card}`}
            >
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
});

export function MobileDashboardShell({
  snapshot,
  children,
}: MobileDashboardShellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <MobileDashboardSnapshot items={snapshot} />
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}
