"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  getTechnicianNavItemForPath,
  getTechnicianNavItems,
} from "./nav-items";

type TechnicianBottomNavProps = {
  companyContext: ActiveCompanyContext;
};

export function TechnicianBottomNav({
  companyContext,
}: TechnicianBottomNavProps) {
  const pathname = usePathname();
  const navItems = getTechnicianNavItems(companyContext);
  const activeItem = getTechnicianNavItemForPath(pathname, companyContext);

  return (
    <nav
      aria-label="Technician navigation"
      className="tech-bottom-nav fixed inset-x-0 bottom-0 z-30"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] pt-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItem.id;

          if (!item.enabled) {
            return (
              <span
                key={item.id}
                aria-disabled="true"
                title="Coming soon"
                className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-slate-300"
              >
                <Icon className="h-5 w-5" />
                <span className="truncate text-xs font-semibold">
                  {item.label}
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex min-h-[3.25rem] min-w-11 touch-manipulation flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 transition-colors ${
                isActive
                  ? "text-cyan-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="truncate text-xs font-semibold">
                {item.label}
              </span>
              {isActive ? (
                <span className="absolute bottom-0.5 h-0.5 w-7 rounded-full bg-cyan-700" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
