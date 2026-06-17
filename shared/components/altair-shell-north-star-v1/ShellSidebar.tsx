"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shellConceptRoute, shellNavGroups } from "./nav-groups";

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === shellConceptRoute) {
    return pathname === shellConceptRoute;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ShellSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Altair shell navigation"
      className="hidden w-[15.5rem] shrink-0 flex-col border-r border-slate-800/60 bg-gradient-to-b from-[#070b12] via-slate-950 to-[#0a0f18] lg:flex"
    >
      <div className="border-b border-slate-800/60 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-500 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.25)]">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">Altair</p>
            <p className="truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Operating shell
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-6">
          {shellNavGroups.map((group) => (
            <li key={group.id}>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                          active
                            ? "bg-slate-900/90 text-white ring-1 ring-cyan-500/25"
                            : "text-slate-500 hover:bg-slate-900/50 hover:text-slate-300"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate font-medium">{item.label}</span>
                        {active ? (
                          <span
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400"
                            aria-hidden="true"
                          />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-800/60 px-4 py-4">
        <p className="text-[10px] leading-relaxed text-slate-600">
          Concept shell — grouped left nav prototype. Production routes unchanged.
        </p>
      </div>
    </aside>
  );
}
