"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { splitAdminNavItemsForMobile, type NavItem } from "./nav-items";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type MobileNavLinkProps = {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
};

function MobileNavLink({ item, active, onNavigate }: MobileNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 transition-colors ${
        active
          ? "bg-cyan-500/12 text-cyan-800 ring-1 ring-cyan-500/15"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? "stroke-[2.5] text-cyan-700" : ""}`} />
      <span className="w-full truncate text-center text-[11px] font-semibold leading-tight">
        {item.label}
      </span>
    </Link>
  );
}

type MobileNavProps = {
  companyContext: ActiveCompanyContext;
};

export function MobileNav({ companyContext }: MobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { primary, secondary } = splitAdminNavItemsForMobile(companyContext);
  const moreActive = secondary.some((item) => isActivePath(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [moreOpen]);

  return (
    <nav
      ref={navRef}
      aria-label="Mobile navigation"
      className={`relative w-full max-w-full shrink-0 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-sm md:hidden ${
        moreOpen ? "z-50" : "z-30"
      }`}
    >
      <ul className="flex w-full items-stretch gap-0.5 px-1 py-1.5">
        {primary.map((item) => (
          <li key={item.href} className="flex min-w-0 flex-1">
            <MobileNavLink
              item={item}
              active={isActivePath(pathname, item.href)}
            />
          </li>
        ))}

        {secondary.length > 0 ? (
          <li className="flex min-w-0 flex-1">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="More navigation"
              onClick={() => setMoreOpen((open) => !open)}
              className={`flex min-h-14 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 transition-colors ${
                moreActive || moreOpen
                  ? "bg-cyan-500/12 text-cyan-800 ring-1 ring-cyan-500/15"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <MoreHorizontal
                className={`h-5 w-5 shrink-0 ${moreActive || moreOpen ? "stroke-[2.5] text-cyan-700" : ""}`}
              />
              <span className="w-full truncate text-center text-[11px] font-semibold leading-tight">
                More
              </span>
            </button>
          </li>
        ) : null}
      </ul>

      {moreOpen && secondary.length > 0 ? (
        <>
          <button
            type="button"
            aria-label="Close more navigation menu"
            className="fixed inset-0 z-[1] bg-slate-900/20"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="menu"
            aria-label="More navigation"
            className="absolute inset-x-0 top-full z-[2] border-b border-slate-200 bg-white shadow-lg"
          >
            <ul className="max-h-[min(60vh,24rem)] overflow-y-auto py-2">
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                        active
                          ? "bg-cyan-500/10 text-cyan-800"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${active ? "text-cyan-700" : "text-slate-500"}`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}
    </nav>
  );
}
