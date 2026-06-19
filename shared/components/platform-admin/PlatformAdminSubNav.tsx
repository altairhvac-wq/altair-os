"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { pt } from "@/shared/components/platform-admin/north-star-m13/platform-north-star-styles";
import { Bug, LayoutDashboard } from "lucide-react";

const LINKS = [
  {
    href: "/platform",
    label: "Overview",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/platform",
  },
  {
    href: "/platform/bugs",
    label: "Bug reports",
    icon: Bug,
    match: (pathname: string) =>
      pathname === "/platform/bugs" || pathname.startsWith("/platform/bugs/"),
  },
] as const;

export function PlatformAdminSubNav() {
  const pathname = usePathname();
  const northStar = isNorthStarShellEnabled();

  if (northStar) {
    return (
      <nav
        aria-label="Platform admin"
        className={pt.subNavBand}
      >
        <div className={pt.subNavControl}>
          {LINKS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);

            return (
              <Link
                key={href}
                href={href}
                className={`${pt.subNavItem} ${
                  active ? pt.subNavItemActive : ""
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Platform admin"
      className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
    >
      {LINKS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);

        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-cyan-950 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
