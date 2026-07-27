"use client";

import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  QuickNavigationDrawer,
  type QuickNavDrawerGroup,
} from "@/shared/components/mobile/QuickNavigationDrawer";
import {
  getGroupedAdminNavItems,
  isAdminNavItemActive,
} from "./nav-items";

type AdminQuickNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  companyContext: ActiveCompanyContext;
  showPlatformAdminNav?: boolean;
};

export function AdminQuickNavDrawer({
  open,
  onClose,
  companyContext,
  showPlatformAdminNav = false,
}: AdminQuickNavDrawerProps) {
  const pathname = usePathname();
  const navGroups = getGroupedAdminNavItems(companyContext, {
    includePlatformAdmin: showPlatformAdminNav,
  });

  const groups: QuickNavDrawerGroup[] = navGroups.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => ({
      id: item.href,
      label: item.label,
      href: item.href,
      icon: item.icon,
      active: isAdminNavItemActive(pathname, item.href),
    })),
  }));

  return (
    <QuickNavigationDrawer
      open={open}
      onClose={onClose}
      companyName={companyContext.company.name}
      groups={groups}
    />
  );
}
