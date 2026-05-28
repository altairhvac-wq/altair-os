"use client";

import Link from "next/link";
import { memo, useCallback, useState } from "react";
import type { MobileDashboardSnapshotItem } from "@/shared/lib/mobile-dashboard-snapshot";

export type MobileDashboardTabId =
  | "overview"
  | "dispatch"
  | "money"
  | "alerts"
  | "more";

type MobileDashboardTab = {
  id: MobileDashboardTabId;
  label: string;
  content: React.ReactNode;
};

type MobileDashboardShellProps = {
  snapshot: MobileDashboardSnapshotItem[];
  tabs: MobileDashboardTab[];
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

function MobileDashboardTabBar({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: MobileDashboardTab[];
  activeTab: MobileDashboardTabId;
  onSelect: (tabId: MobileDashboardTabId) => void;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div
        className="flex w-max min-w-full gap-2"
        role="tablist"
        aria-label="Dashboard sections"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`dashboard-panel-${tab.id}`}
              id={`dashboard-tab-${tab.id}`}
              onClick={() => onSelect(tab.id)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10"
                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200/80"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MobileDashboardShell({
  snapshot,
  tabs,
}: MobileDashboardShellProps) {
  const initialTabId = tabs[0]?.id ?? "overview";
  const [activeTab, setActiveTab] = useState<MobileDashboardTabId>(initialTabId);
  const [visitedTabs, setVisitedTabs] = useState<Set<MobileDashboardTabId>>(
    () => new Set([initialTabId]),
  );

  const handleSelectTab = useCallback((tabId: MobileDashboardTabId) => {
    setActiveTab(tabId);
    setVisitedTabs((current) => {
      if (current.has(tabId)) {
        return current;
      }

      const next = new Set(current);
      next.add(tabId);
      return next;
    });
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <MobileDashboardSnapshot items={snapshot} />

      {tabs.length > 0 ? (
        <>
          <MobileDashboardTabBar
            tabs={tabs}
            activeTab={activeTab}
            onSelect={handleSelectTab}
          />

          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            if (!visitedTabs.has(tab.id)) {
              return null;
            }

            return (
              <div
                key={tab.id}
                id={`dashboard-panel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={`dashboard-tab-${tab.id}`}
                hidden={!isActive}
                className={
                  isActive ? "flex min-w-0 flex-col gap-3" : "hidden"
                }
              >
                {tab.content}
              </div>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
