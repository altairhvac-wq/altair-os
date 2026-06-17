"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colorLabConceptRoute, colorLabNavGroups } from "./nav-groups";
import { usePaletteTokens } from "./palette-context";

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === colorLabConceptRoute) {
    return pathname === colorLabConceptRoute;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ColorLabSidebar() {
  const pathname = usePathname();
  const t = usePaletteTokens();

  return (
    <aside aria-label="Altair navigation" className={t.sidebar}>
      <div className="border-b border-white/[0.08] px-5 py-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a2230] to-[#0F141B] text-sm font-bold text-slate-200 shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] ${t.sidebarLogoRing}`}
          >
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">Altair OS</p>
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Operating Center
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-7">
          {colorLabNavGroups.map((group) => (
            <li key={group.id}>
              <p className="mb-2.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                {group.label}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                          active
                            ? `bg-white/[0.06] text-white ${t.sidebarActiveRing}`
                            : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                        }`}
                      >
                        {active ? <span aria-hidden="true" className={t.navActiveRail} /> : null}
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? t.sidebarActiveIcon : "text-slate-500 group-hover:text-slate-400"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/[0.08] p-4">
        <div className="rounded-xl bg-white/[0.04] p-3.5 ring-1 ring-white/[0.08]">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${t.sidebarFooterAccent}`}>
            Color Lab · v1
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            Frozen layout · palette comparison only. Not linked in production nav.
          </p>
        </div>
      </div>
    </aside>
  );
}
