"use client";

import { useMemo } from "react";
import { Bell, Search } from "lucide-react";
import {
  ADMIN_NAV_GROUP_DEFINITIONS,
  adminNavItems,
  type NavItem,
} from "@/shared/components/admin/nav-items";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import type { DesignLabCanvasSelection } from "@/shared/components/platform-admin/design-lab/design-lab-canvas-selection";
import { DesignLabMissionControlAdapter } from "@/shared/components/platform-admin/design-lab/DesignLabMissionControlAdapter";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
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
  dimensions?: DesignLabDimensions;
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
        color: "var(--north-star-topbar-heading)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <DesignLabEditableTarget
            targetId="topbar-heading"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="p"
            className="truncate text-sm font-bold tracking-tight sm:text-base"
            style={{ color: "var(--north-star-topbar-heading)" }}
            aria-label="Edit topbar heading"
          >
            Good morning, Altair HVAC
          </DesignLabEditableTarget>
          <DesignLabEditableTarget
            targetId="topbar-subcopy"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="p"
            className="mt-0.5 truncate text-xs leading-none sm:text-[13px]"
            style={{ color: "var(--north-star-topbar-subcopy)" }}
            aria-label="Edit topbar subcopy"
          >
            Tuesday, August 4
          </DesignLabEditableTarget>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <DesignLabEditableTarget
          targetId="topbar-icon"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="span"
          className="north-star-header-search hidden rounded-none p-2 sm:inline-flex"
          style={{ color: "var(--north-star-topbar-icon)" }}
          aria-label="Edit topbar icon"
        >
          <Search className="h-5 w-5" />
        </DesignLabEditableTarget>
        <DesignLabEditableTarget
          targetId="topbar-icon"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="span"
          className="north-star-header-bell relative rounded-none p-2"
          style={{ color: "var(--north-star-topbar-icon)" }}
          aria-label="Edit topbar icon · bell"
        >
          <Bell className="h-5 w-5" />
          <span className="north-star-header-bell-badge absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
            3
          </span>
        </DesignLabEditableTarget>
        <div className="north-star-header-divider flex items-center gap-2 border-l pl-2 sm:ml-2 sm:gap-3 sm:pl-4">
          <div className="north-star-company-switcher hidden md:block">
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--north-star-topbar-heading)" }}
            >
              Altair HVAC
            </p>
            <p
              className="text-[10px]"
              style={{ color: "var(--north-star-topbar-subcopy)" }}
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
      className={`${northStarSidebarClass} flex h-full w-[14.5rem] shrink-0 flex-col self-stretch`}
      style={{
        ...designLabFillStyle("--north-star-sidebar"),
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
  dimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
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
      {/*
        Flat sibling editable targets (sidebar / border / topbar / content-well) —
        same pattern as DesignLabFullPageCanvas. Do not wrap them in chrome-shell:
        nesting makes the parent :hover outline bleed across child regions.
        Preview vars stay on .admin-north-star-shell so globals.css shell tokens
        do not wipe lab edits (same as live AdminShell).
      */}
      <DesignLabTokenAnchor tokenKey="northStarRoot" className="block min-h-full">
        <div
          className="admin-canvas admin-shell-canvas admin-north-star-shell flex min-h-full w-full min-w-0 flex-col md:flex-row"
          style={{
            ...designLabPreviewVars(colors, shines, dimensions),
            ...designLabFillStyle("--north-star-root"),
          }}
        >
          <DesignLabTokenAnchor
            tokenKey="northStarRoot"
            className="hidden w-1.5 shrink-0 self-stretch md:block"
          >
            <DesignLabEditableTarget
              targetId="chrome-shell"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectGlobal}
              className="h-full w-full"
              style={designLabFillStyle("--north-star-root")}
              aria-label="Page canvas"
            />
          </DesignLabTokenAnchor>

          <DesignLabStaticSidebar
            groups={navGroups}
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectGlobal}
          />

          <DesignLabTokenAnchor
            tokenKey="northStarBorder"
            className="hidden w-1 shrink-0 self-stretch md:block"
          >
            <DesignLabEditableTarget
              targetId="chrome-border"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectGlobal}
              className="h-full w-full min-w-px"
              style={designLabFillStyle("--north-star-border")}
              aria-label="Chrome border"
            />
          </DesignLabTokenAnchor>

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
                targetId="content-well"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectGlobal}
                className="admin-shell-main min-h-0 flex-1 bg-[var(--north-star-content-well)] px-2.5 pt-2.5 sm:px-4 sm:pt-4 lg:p-5"
                style={designLabFillStyle("--north-star-content-well")}
              >
                {/* Real MC section exports wrapped by lab adapter (compose-only
                    pieces; selection chrome stays outside production MC). */}
                <DesignLabMissionControlAdapter
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectGlobal}
                />
              </DesignLabEditableTarget>
            </DesignLabTokenAnchor>
          </div>
        </div>
      </DesignLabTokenAnchor>
    </DesignLabSurfaceProvider>
  );
}
