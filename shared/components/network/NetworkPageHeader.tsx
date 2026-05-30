"use client";

import { Shield } from "lucide-react";
import { NETWORK_TAB_OPTIONS, type NetworkTab } from "@/shared/types/network";

const tabDescriptions: Record<NetworkTab, string> = {
  "my-network": "Your private preferred partner network",
  "open-jobs": "Available work from trusted network connections",
  "sent-work": "Jobs you've subcontracted to partners",
  "received-work": "Work received from your network",
  "revenue-tracker": "Partner revenue, payouts, and earnings",
};

type NetworkPageHeaderProps = {
  activeTab: NetworkTab;
  onTabChange: (tab: NetworkTab) => void;
  showSectionTitle?: boolean;
};

export function NetworkPageHeader({
  activeTab,
  onTabChange,
  showSectionTitle = false,
}: NetworkPageHeaderProps) {
  return (
    <header className="min-w-0 shrink-0">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-slate-900">
            Subcontractor Network
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            A private preferred partner network — not a public marketplace.
            Save trusted companies, send and receive work, and track revenue
            together.
          </p>
        </div>
      </div>

      <nav
        className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
        aria-label="Network sections"
      >
        {NETWORK_TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.value
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {showSectionTitle ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            {NETWORK_TAB_OPTIONS.find((t) => t.value === activeTab)?.label}
          </h2>
          <p className="text-xs text-slate-500">{tabDescriptions[activeTab]}</p>
        </div>
      ) : null}
    </header>
  );
}

export function getNetworkTabDescription(tab: NetworkTab): string {
  return tabDescriptions[tab];
}
