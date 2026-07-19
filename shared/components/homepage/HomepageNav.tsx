"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a44d]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1118]";

export function HomepageNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
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
        "mc-nav fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-[rgba(34,48,68,0.85)] bg-[rgba(11,17,24,0.88)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:h-[4.25rem] sm:px-8">
        <Link
          href="/"
          className={`shrink-0 rounded-sm ${focusRing}`}
          aria-label="Altair OS home"
        >
          <AltairLogo variant="white" size="sm" showWordmark />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing} rounded-sm`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={`rounded-sm px-2 py-1.5 text-sm font-medium text-[#c9bfae] transition-colors hover:text-[#f3ebdd] ${focusRing}`}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className={`mc-cta-primary inline-flex items-center justify-center rounded-lg bg-[#b88a2e] px-3.5 py-2 text-sm font-semibold text-[#070b10] transition-colors hover:bg-[#c9a44d] ${focusRing}`}
          >
            Request Closed Beta Access
          </Link>
        </div>

        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-lg border border-[#223044] bg-[#0e141d]/80 p-2 text-[#f3ebdd] md:hidden ${focusRing}`}
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
          className="border-t border-[#223044] bg-[rgba(11,17,24,0.96)] backdrop-blur-md md:hidden"
        >
          <nav
            aria-label="Mobile"
            className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-3 text-base font-medium text-[#f3ebdd] hover:bg-[#101a28] ${focusRing}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg px-3 py-3 text-base font-medium text-[#c9bfae] hover:bg-[#101a28] ${focusRing}`}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className={`mt-2 inline-flex items-center justify-center rounded-lg bg-[#b88a2e] px-4 py-3 text-sm font-semibold text-[#070b10] hover:bg-[#c9a44d] ${focusRing}`}
            >
              Request Closed Beta Access
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
