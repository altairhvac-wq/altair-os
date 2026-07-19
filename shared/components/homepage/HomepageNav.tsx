"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#one-operating-system", label: "How It Works" },
  { href: "#why-altair", label: "Why Altair" },
  { href: "/pricing", label: "Pricing" },
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e12]";

export function HomepageNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={[
        "mc-nav fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300",
        scrolled
          ? "border-b border-[rgba(222,228,236,0.08)] bg-[rgba(8,9,12,0.84)] shadow-[0_1px_0_rgba(222,228,236,0.04)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(to_right,transparent,rgba(222,228,236,0.2),transparent)]"
        aria-hidden="true"
      />
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-5 sm:h-[4.25rem] sm:px-8 lg:px-10">
        <Link
          href="/"
          className={`shrink-0 rounded-sm ${focusRing}`}
          aria-label="Altair OS home"
        >
          <AltairLogo variant="white" size="md" showWordmark className="origin-left scale-[1.06]" />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 xl:gap-9 lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[13px] font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing} rounded-sm`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/install"
            className={`inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing}`}
          >
            Resources
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
          </Link>
        </nav>

        <div className="hidden items-center gap-3.5 md:flex">
          <Link
            href="/login"
            className={`rounded-sm px-2 py-1.5 text-[13px] font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing}`}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className={`mc-cta-primary inline-flex items-center justify-center rounded-lg bg-[#b88a2e] px-4 py-2.5 text-[13px] font-semibold text-[#08090c] transition-colors hover:bg-[#c9a44d] ${focusRing}`}
          >
            Request Closed Beta Access
            <span className="ml-1 opacity-70" aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-lg border border-[rgba(222,228,236,0.12)] bg-[rgba(18,21,27,0.8)] p-2 text-[#f3ebdd] md:hidden ${focusRing}`}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {menuOpen ? (
        <div
          id={menuId}
          className="border-t border-[rgba(222,228,236,0.08)] bg-[rgba(8,9,12,0.96)] backdrop-blur-xl md:hidden"
        >
          <nav
            aria-label="Mobile"
            className="mx-auto flex max-w-[90rem] flex-col gap-1 px-5 py-4"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-3 text-base font-medium text-[#f3ebdd] hover:bg-[rgba(23,27,34,0.85)] ${focusRing}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg px-3 py-3 text-base font-medium text-[#c9bfae] hover:bg-[rgba(23,27,34,0.85)] ${focusRing}`}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className={`mt-2 inline-flex items-center justify-center rounded-lg bg-[#b88a2e] px-4 py-3 text-sm font-semibold text-[#08090c] hover:bg-[#c9a44d] ${focusRing}`}
            >
              Request Closed Beta Access
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
