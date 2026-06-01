"use client";

import type { ReactNode } from "react";
import { MOBILE_ACTION_SEVERITY_STYLES } from "@/shared/components/dashboard/mobile-action-sheets/MobileActionSheet";
import type { OperationalResolutionQueueItem } from "@/shared/lib/operational-resolution-queue";

type OperationalResolutionQueueItemViewProps = {
  item: OperationalResolutionQueueItem;
  children: ReactNode;
  error?: string | null;
};

export function OperationalResolutionQueueItemView({
  item,
  children,
  error,
}: OperationalResolutionQueueItemViewProps) {
  const styles = MOBILE_ACTION_SEVERITY_STYLES[item.severity];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error ? (
        <p className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
          {error}
        </p>
      ) : null}

      <article
        className={`flex flex-1 flex-col rounded-2xl border px-4 py-5 shadow-sm ${styles.row}`}
      >
        <header className="min-w-0 flex-1">
          <p className="text-lg font-bold tracking-tight text-slate-900">
            {item.title}
          </p>
          {item.subtitle ? (
            <p className="mt-1 text-sm font-medium text-slate-600">
              {item.subtitle}
            </p>
          ) : null}
          {item.meta ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {item.meta}
            </p>
          ) : null}
        </header>

        <div className="mt-6 flex flex-col gap-2">{children}</div>
      </article>
    </div>
  );
}
