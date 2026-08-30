"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";

const NAV_LINKS = [
  { href: "/#features", label: "Product", id: "features" },
  { href: "/#onboarding", label: "Onboarding", id: "onboarding" },
  { href: "/pricing", label: "Pricing", id: "pricing" },
  { href: "/#about", label: "About", id: "about" },
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f0b]";

function isHomepagePath(pathname: string) {
  return pathname === "/" || pathname === "/welcome";
}

export function HomepageNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const onHomepage = isHomepagePath(pathname);
  const forceSolid = !onHomepage;
  const solid = scrolled || forceSolid;
  const pricingActive = pathname === "/pricing";

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
        "ah-nav ah-hero-fade ah-hero-fade-0 fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-500 ease-out motion-reduce:transition-none",
        solid
          ? "border-b border-[rgba(251,247,239,0.08)] bg-[rgba(8,9,7,0.92)] shadow-[0_1px_0_rgba(251,247,239,0.04)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="relative mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-5 sm:h-[4.25rem] sm:px-8 lg:px-12 xl:px-16">
        <Link
          href="/"
          className={`relative z-10 shrink-0 rounded-sm ${focusRing}`}
          aria-label="Altair home"
        >
          <AltairLogo
            variant="white"
            size="md"
            showWordmark
            className="origin-left scale-[1.06]"
          />
        </Link>

        <nav
          aria-label="Primary"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 lg:flex xl:gap-10"
        >
          {NAV_LINKS.map((link) => {
            const active = link.id === "pricing" && pricingActive;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-sm text-[13px] font-medium tracking-wide transition-colors duration-200 motion-reduce:transition-none",
                  active
                    ? "text-[#fff9ea]"
                    : "text-[#f3ebdd]/78 hover:text-[#fff9ea]",
                  focusRing,
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={`rounded-sm px-2 py-1.5 text-[13px] font-medium text-[#f3ebdd]/72 transition-colors duration-200 hover:text-[#fff9ea] motion-reduce:transition-none ${focusRing}`}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className={`inline-flex min-h-10 items-center justify-center rounded-lg bg-[#a4823a] px-4 py-2.5 text-[13px] font-semibold text-[#080907] transition-colors duration-200 hover:bg-[#c2a05a] motion-reduce:transition-none ${focusRing}`}
          >
            Start Your 14-Day Free Trial
          </Link>
        </div>

        <button
          type="button"
          className={`relative z-10 inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[rgba(251,247,239,0.14)] bg-[rgba(8,9,7,0.35)] p-2 text-[#fbf7ef] lg:hidden ${focusRing}`}
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
          className="border-t border-[rgba(251,247,239,0.08)] bg-[rgba(8,9,7,0.94)] backdrop-blur-xl lg:hidden"
        >
          <nav
            aria-label="Mobile"
            className="mx-auto flex max-w-[90rem] flex-col gap-1 px-5 py-4"
          >
            {NAV_LINKS.map((link) => {
              const active = link.id === "pricing" && pricingActive;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    "rounded-lg px-3 py-3 text-base font-medium hover:bg-[rgba(24,28,22,0.85)]",
                    active ? "text-[#fff9ea]" : "text-[#fbf7ef]",
                    focusRing,
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg px-3 py-3 text-base font-medium text-[#c9bfae] hover:bg-[rgba(24,28,22,0.85)] ${focusRing}`}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className={`mt-2 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-4 py-3 text-sm font-semibold text-[#080907] hover:bg-[#c2a05a] ${focusRing}`}
            >
              Start Your 14-Day Free Trial
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
