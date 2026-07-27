"use client";

import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  QuickNavigationDrawer,
  type QuickNavDrawerGroup,
} from "@/shared/components/mobile/QuickNavigationDrawer";
import {
  getTechnicianNavItemForPath,
  getTechnicianNavItems,
} from "./nav-items";

type TechnicianQuickNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  companyContext: ActiveCompanyContext;
};

export function TechnicianQuickNavDrawer({
  open,
  onClose,
  companyContext,
}: TechnicianQuickNavDrawerProps) {
  const pathname = usePathname();
  const navItems = getTechnicianNavItems(companyContext);
  const activeItem = getTechnicianNavItemForPath(pathname, companyContext);

  const groups: QuickNavDrawerGroup[] = [
    {
      id: "field",
      label: "Field",
      items: navItems.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        active: item.id === activeItem.id,
      })),
    },
  ];

  return (
    <QuickNavigationDrawer
      open={open}
      onClose={onClose}
      companyName={companyContext.company.name}
      groups={groups}
    />
  );
}
