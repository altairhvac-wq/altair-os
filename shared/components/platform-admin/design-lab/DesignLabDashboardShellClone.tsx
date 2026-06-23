"use client";

import { useMemo } from "react";
import { Bell, Database, Search } from "lucide-react";
import {
  ADMIN_NAV_GROUP_DEFINITIONS,
  adminNavItems,
  type NavItem,
} from "@/shared/components/admin/nav-items";
import { DesignLabDashboardReplica } from "@/shared/components/platform-admin/design-lab/DesignLabDashboardReplica";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import {
  northStarSidebarClass,
  northStarSidebarGroupLabelClass,
  northStarSidebarLinkActiveClass,
  northStarSidebarLinkClass,
} from "@/shared/design-system/shell/tokens";

type DesignLabDashboardShellCloneProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

type StaticNavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

function buildStaticNavGroups(): StaticNavGroup[] {
  const itemsByHref = new Map(adminNavItems.map((item) => [item.href, item]));
  const groups: StaticNavGroup[] = [];

  for (const group of ADMIN_NAV_GROUP_DEFINITIONS) {
    const items: NavItem[] = [];

    for (const href of group.hrefs) {
      if (href === "/platform") {
        continue;
      }

      const item = itemsByHref.get(href);
      if (item) {
        items.push(item);
      }
    }

    if (items.length > 0) {
      groups.push({ id: group.id, label: group.label, items });
    }
  }

  return groups;
}

function DesignLabDemoModeBanner() {
  return (
    <section
      aria-label="Demo data active"
      className="mb-2 min-w-0 max-w-full overflow-x-clip rounded-lg border border-violet-200/70 bg-violet-50/40 px-2.5 py-2"
    >
      <div className="flex min-w-0 items-start gap-2">
        <Database
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700/90">
                Demo mode
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-700">
                Sample records are active · loaded Jun 23, 2026. Tagged{" "}
                <span className="font-semibold text-slate-800">[Demo]</span>.
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-violet-200/80 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
              Clear
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DesignLabStaticTopbar() {
  return (
    <header className="admin-premium-header relative z-40 flex w-full max-w-full shrink-0 items-center justify-between gap-2 border-b px-3 sm:gap-2.5 sm:px-5 md:h-[3.75rem] md:min-h-[3.75rem] md:pt-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              Dashboard
            </h1>
            <span
              role="status"
              className="north-star-header-alpha inline-flex shrink-0 items-center rounded-full border border-[rgba(201,164,77,0.28)] bg-[rgba(201,164,77,0.12)] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-[#E6D092] sm:px-2 sm:text-[11px]"
            >
              Alpha
            </span>
          </div>
          <p className="hidden truncate text-sm sm:block">
            Altair HVAC · Design Lab preview shell
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <span
          className="north-star-header-search hidden rounded-lg p-2 sm:inline-flex"
          aria-hidden="true"
        >
          <Search className="h-5 w-5" />
        </span>
        <span className="north-star-header-bell relative rounded-lg p-2" aria-hidden="true">
          <Bell className="h-5 w-5" />
          <span className="north-star-header-bell-badge absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
            3
          </span>
        </span>
        <div className="north-star-header-divider flex items-center gap-2 border-l pl-2 sm:ml-2 sm:gap-3 sm:pl-4">
          <div className="north-star-company-switcher hidden md:block">
            <p className="text-xs font-semibold">Altair HVAC</p>
            <p className="text-[10px] text-slate-400">Demo workspace</p>
          </div>
          <div
            className="north-star-header-avatar flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-2"
            title="Jeremiah Founder"
          >
            JF
          </div>
          <span className="north-star-header-signout rounded-lg px-2 py-1 text-xs font-semibold">
            Sign out
          </span>
        </div>
      </div>
    </header>
  );
}

function DesignLabStaticSidebar({ groups }: { groups: StaticNavGroup[] }) {
  return (
    <aside
      aria-label="Desktop navigation"
      className={`${northStarSidebarClass} hidden shrink-0 flex-col md:flex`}
    >
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-7">
          {groups.map((group) => (
            <li key={group.id}>
              <p className={`mb-2.5 px-2.5 ${northStarSidebarGroupLabelClass}`}>
                {group.label}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === "/";

                  return (
                    <li key={item.href}>
                      <span
                        className={`${northStarSidebarLinkClass} group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                          isActive ? northStarSidebarLinkActiveClass : ""
                        }`}
                      >
                        {isActive ? (
                          <span
                            aria-hidden="true"
                            className="admin-north-star-sidebar-rail"
                          />
                        ) : null}
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export function DesignLabDashboardShellClone({
  selectedTargetId,
  onSelectTarget,
}: DesignLabDashboardShellCloneProps) {
  const navGroups = useMemo(() => buildStaticNavGroups(), []);

  return (
    <div className="admin-canvas admin-shell-canvas admin-north-star-shell flex w-full min-w-0 flex-col md:min-h-full md:flex-row">
      <DesignLabStaticSidebar groups={navGroups} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="admin-top-shell shrink-0">
          <DesignLabStaticTopbar />
        </div>

        <main className="admin-shell-main min-h-0 flex-1 px-2.5 pt-2.5 sm:px-4 sm:pt-4 lg:p-5">
          <DesignLabEditableTarget
            targetId="page-background"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="min-h-full"
            style={{ backgroundColor: "var(--dl-page-bg)" }}
          >
            <DesignLabDemoModeBanner />
            <DesignLabDashboardReplica
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
            />
          </DesignLabEditableTarget>
        </main>
      </div>
    </div>
  );
}
