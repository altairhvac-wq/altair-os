"use client";

import { useMemo } from "react";
import { Bell, Search } from "lucide-react";
import {
  ADMIN_NAV_GROUP_DEFINITIONS,
  adminNavItems,
  type NavItem,
} from "@/shared/components/admin/nav-items";
import { MissionControlV2View } from "@/shared/components/dashboard/mission-control-v2/MissionControlV2View";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import type { DesignLabCanvasSelection } from "@/shared/components/platform-admin/design-lab/design-lab-canvas-selection";
import { designLabFixtureDashboardData } from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-fixture";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { designLabPreviewVars } from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";
import {
  designLabFillStyle,
  type DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";
import { DesignLabTokenAnchor } from "@/shared/components/platform-admin/design-lab/DesignLabSpotlight";
import { DesignLabSurfaceProvider } from "@/shared/components/platform-admin/design-lab/DesignLabSurfaceContext";
import type { DashboardSurfaceId } from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import type { DashboardSurfaceOverrides } from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import { StatusPill } from "@/shared/design-system/components";
import {
  adminNavLinkActiveClass,
  adminNavLinkClass,
  northStarSidebarClass,
  northStarSidebarGroupLabelClass,
  northStarSidebarLinkActiveClass,
  northStarSidebarLinkClass,
} from "@/shared/design-system/shell/tokens";

type DesignLabDashboardShellCloneProps = {
  colors: DesignLabColors;
  shines?: DesignLabShineMap;
  surfaceOverrides: DashboardSurfaceOverrides;
  selection: DesignLabCanvasSelection | null;
  onSelectGlobal: (id: DesignLabEditTargetId) => void;
  onSelectSurface: (surfaceId: DashboardSurfaceId) => void;
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

function DesignLabStaticTopbar({
  selectedTargetId,
  onSelectTarget,
}: {
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  return (
    <DesignLabTokenAnchor tokenKey="northStarTopbar" className="block">
    <DesignLabEditableTarget
      targetId="topbar-shell"
      selectedTargetId={selectedTargetId}
      onSelectTarget={onSelectTarget}
      as="header"
      className="admin-premium-header relative z-40 flex w-full max-w-full shrink-0 items-center justify-between gap-2 border-b px-3 sm:gap-2.5 sm:px-5 md:h-[3.75rem] md:min-h-[3.75rem] md:pt-0"
      style={{
        ...designLabFillStyle("--north-star-topbar"),
        borderColor: "var(--north-star-brass-ring)",
        color: "var(--north-star-text-light)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <p
            className="truncate text-sm font-bold tracking-tight sm:text-base"
            style={{ color: "var(--north-star-text-light)" }}
          >
            Good morning, Altair HVAC
          </p>
          <p
            className="mt-0.5 truncate text-xs leading-none sm:text-[13px]"
            style={{ color: "var(--north-star-text-light-muted)" }}
          >
            Tuesday, August 4
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <span
          className="north-star-header-search hidden rounded-none p-2 sm:inline-flex"
          style={{ color: "var(--north-star-text-light-muted)" }}
          aria-hidden="true"
        >
          <Search className="h-5 w-5" />
        </span>
        <span
          className="north-star-header-bell relative rounded-none p-2"
          style={{ color: "var(--north-star-text-light-muted)" }}
          aria-hidden="true"
        >
          <Bell className="h-5 w-5" />
          <span className="north-star-header-bell-badge absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
            3
          </span>
        </span>
        <div className="north-star-header-divider flex items-center gap-2 border-l pl-2 sm:ml-2 sm:gap-3 sm:pl-4">
          <div className="north-star-company-switcher hidden md:block">
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--north-star-text-light)" }}
            >
              Altair HVAC
            </p>
            <p
              className="text-[10px]"
              style={{ color: "var(--north-star-text-light-muted)" }}
            >
              Sample workspace
            </p>
          </div>
          {/* Trial pill lives in header chrome — same placement as live SubscriptionBillingBanner */}
          <StatusPill tone="info" size="sm" className="max-w-[9.5rem] truncate sm:max-w-[14rem]">
            Trial ends Aug 18, 2026
          </StatusPill>
          <DesignLabTokenAnchor tokenKey="northStarGold" as="span">
            <DesignLabEditableTarget
              targetId="brass-ladder"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              className="north-star-header-avatar flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-2 ring-[var(--north-star-brass-ring)]"
              aria-label="Edit brass ladder · avatar"
              style={{
                backgroundImage:
                  "var(--north-star-gold--shine, linear-gradient(180deg, var(--north-star-gold) 0%, var(--north-star-bronze) 100%))",
                backgroundColor: "var(--north-star-gold)",
                color: "var(--north-star-text-dark)",
              }}
            >
              JF
            </DesignLabEditableTarget>
          </DesignLabTokenAnchor>
        </div>
      </div>
    </DesignLabEditableTarget>
    </DesignLabTokenAnchor>
  );
}

function DesignLabStaticSidebar({
  groups,
  selectedTargetId,
  onSelectTarget,
}: {
  groups: StaticNavGroup[];
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  return (
    <DesignLabTokenAnchor tokenKey="northStarSidebar" className="hidden md:block">
    <DesignLabEditableTarget
      targetId="sidebar-shell"
      selectedTargetId={selectedTargetId}
      onSelectTarget={onSelectTarget}
      as="aside"
      aria-label="Desktop navigation"
      className={`${northStarSidebarClass} flex h-full w-[14.5rem] shrink-0 flex-col self-stretch border-r`}
      style={{
        ...designLabFillStyle("--north-star-sidebar"),
        borderColor: "var(--north-star-border)",
        color: "var(--north-star-sidebar-link)",
      }}
    >
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-7">
          {groups.map((group) => (
            <li key={group.id}>
              <DesignLabTokenAnchor tokenKey="northStarSidebarLabel" as="span">
                <DesignLabEditableTarget
                  targetId="sidebar-states"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  as="p"
                  className={`${northStarSidebarGroupLabelClass} mb-2.5 px-2.5`}
                  style={{ color: "var(--north-star-sidebar-label)" }}
                >
                  {group.label}
                </DesignLabEditableTarget>
              </DesignLabTokenAnchor>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === "/";

                  return (
                    <li key={item.href}>
                      {isActive ? (
                        <DesignLabEditableTarget
                          targetId="sidebar-states"
                          selectedTargetId={selectedTargetId}
                          onSelectTarget={onSelectTarget}
                          className={`${adminNavLinkClass} ${adminNavLinkActiveClass} ${northStarSidebarLinkClass} ${northStarSidebarLinkActiveClass} group relative flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium`}
                          style={{ color: "var(--north-star-sidebar-link-active)" }}
                        >
                          <DesignLabTokenAnchor
                            tokenKey="northStarBrassRail"
                            as="span"
                            className="admin-north-star-sidebar-rail"
                            style={designLabFillStyle("--north-star-brass-rail")}
                          >
                            <span className="sr-only">Brass rail</span>
                          </DesignLabTokenAnchor>
                          <Icon
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                            style={{ color: "var(--north-star-sidebar-icon-active)" }}
                          />
                          <span className="truncate">{item.label}</span>
                        </DesignLabEditableTarget>
                      ) : (
                        <span
                          className={`${adminNavLinkClass} ${northStarSidebarLinkClass} group relative flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium`}
                          style={{ color: "var(--north-star-sidebar-link)" }}
                        >
                          <Icon
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                            style={{ color: "var(--north-star-sidebar-icon)" }}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </DesignLabEditableTarget>
    </DesignLabTokenAnchor>
  );
}

export function DesignLabDashboardShellClone({
  colors,
  shines = {},
  surfaceOverrides,
  selection,
  onSelectGlobal,
  onSelectSurface,
}: DesignLabDashboardShellCloneProps) {
  const navGroups = useMemo(() => buildStaticNavGroups(), []);
  const selectedTargetId =
    selection?.kind === "global" ? selection.targetId : null;

  return (
    <DesignLabSurfaceProvider
      colors={colors}
      overrides={surfaceOverrides}
      selection={selection}
      onSelectSurface={onSelectSurface}
    >
      <DesignLabTokenAnchor tokenKey="northStarRoot" className="block min-h-full">
      <DesignLabEditableTarget
        targetId="chrome-shell"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectGlobal}
        className="admin-canvas admin-shell-canvas admin-north-star-shell flex min-h-full w-full min-w-0 flex-col md:flex-row"
        style={{
          /* Inline preview vars must sit on .admin-north-star-shell itself —
             that class redefines chrome tokens in globals.css and would otherwise
             wipe inherited design-lab-preview values (same pattern as live AdminShell). */
          ...designLabPreviewVars(colors, shines),
          ...designLabFillStyle("--north-star-root"),
        }}
      >
        <DesignLabStaticSidebar
          groups={navGroups}
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectGlobal}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="admin-top-shell shrink-0">
            <DesignLabStaticTopbar
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectGlobal}
            />
          </div>

          <DesignLabTokenAnchor
            tokenKey="northStarContentWell"
            className="block min-h-0 flex-1"
          >
          <DesignLabEditableTarget
            targetId="chrome-two-tone"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectGlobal}
            className="admin-shell-main min-h-0 flex-1 bg-[var(--north-star-content-well)] px-2.5 pt-2.5 sm:px-4 sm:pt-4 lg:p-5"
            style={designLabFillStyle("--north-star-content-well")}
          >
            {/* Pass 1: real MC body + static fixture. Click-to-edit / token
                anchors / surface targets stay on shell chrome only for now. */}
            <MissionControlV2View data={designLabFixtureDashboardData} />
          </DesignLabEditableTarget>
          </DesignLabTokenAnchor>
        </div>
      </DesignLabEditableTarget>
      </DesignLabTokenAnchor>
    </DesignLabSurfaceProvider>
  );
}
