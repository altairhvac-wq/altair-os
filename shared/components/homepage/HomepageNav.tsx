"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import {
  SITE_MENU,
  SITE_MENU_PRICING,
  siteMenuGroupForPath,
  type SiteMenuGroup,
  type SiteMenuLink,
} from "@/shared/lib/site/site-menu";

/**
 * The top bar on every public page.
 *
 * ============ MENUS, NOT SIX WORDS (2026-11-21) ============
 * It used to be six short links, and every other page was only in the
 * footer; below 1280 px the links hid behind the menu button. The owner:
 * "we can't find any of the other pages from it." Now four menus (Software,
 * Free tools, Learn, Company) and Pricing open a panel naming every page with
 * one line on what it is for (shared/lib/site/site-menu.ts), from 1024 px up.
 * On phones the menu button opens the same groups, all visible.
 *
 * A menu opens on click, Enter or Space, and on mouse hover; Escape, a click
 * outside, or moving to another page closes it. It is a disclosure (a button
 * with aria-expanded and a panel of ordinary links), not an ARIA menu, so
 * screen readers and the Tab key treat the links as links.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f0b]";

function isHomepagePath(pathname: string) {
  return pathname === "/" || pathname === "/welcome";
}

/** Links in menu order, gathered under their job heading; one untitled set when a group has none. */
function linkSections(group: SiteMenuGroup) {
  const sections: { title: string | null; links: SiteMenuLink[] }[] = [];
  for (const link of group.links) {
    const title = link.section ?? null;
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.links.push(link);
    else sections.push({ title, links: [link] });
  }
  return sections;
}

function PanelLink({
  link,
  groupId,
  onNavigate,
}: {
  readonly link: SiteMenuLink;
  readonly groupId: SiteMenuGroup["id"];
  readonly onNavigate: () => void;
}) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      data-track={`menu-${groupId}`}
      className={`group block rounded-xl px-3.5 py-3 transition-colors hover:bg-white/[0.05] ${focusRing}`}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#fff9ea]">
        {link.label}
        <ArrowRight
          aria-hidden="true"
          className="h-3.5 w-3.5 -translate-x-1 text-[#c2a05a] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
        />
      </span>
      <span className="mt-0.5 block text-[13px] leading-snug text-[#a89c88]">{link.text}</span>
    </Link>
  );
}

function Panel({ group, onNavigate }: { readonly group: SiteMenuGroup; readonly onNavigate: () => void }) {
  const wide = group.links.length > 4;
  const sections = linkSections(group);
  const titled = sections.some((section) => section.title);
  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[rgba(230,227,220,0.14)] bg-[#0f120e] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)]">
      <div className={`grid gap-0 ${group.feature ? "lg:grid-cols-[minmax(0,1fr)_17rem]" : ""}`}>
        <div className="p-4 sm:p-5">
          {titled ? (
            <div className="grid gap-x-2 gap-y-4 sm:grid-cols-2">
              {sections.map((section) => (
                <section key={section.title} aria-label={section.title ?? undefined}>
                  <h3 className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
                    {section.title}
                  </h3>
                  <ul className="grid gap-0.5">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <PanelLink link={link} groupId={group.id} onNavigate={onNavigate} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className={`grid gap-1 ${wide ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {group.links.map((link) => (
                <li key={link.href}>
                  <PanelLink link={link} groupId={group.id} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          )}
          {group.more?.length ? (
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-[rgba(230,227,220,0.08)] px-3.5 pt-3">
              {group.more.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  data-track={`menu-${group.id}`}
                  className={`inline-flex min-h-9 items-center gap-1 rounded-sm text-[13px] font-semibold text-[#c2a05a] hover:text-[#e8d9ac] ${focusRing}`}
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        {group.feature ? (
          <Link
            href={group.feature.href}
            onClick={onNavigate}
            data-track={`menu-${group.id}-feature`}
            className={`flex flex-col justify-end border-t border-[rgba(230,227,220,0.1)] bg-[linear-gradient(160deg,rgba(164,130,58,0.24)_0%,rgba(15,18,14,0.95)_75%)] p-5 transition-colors hover:bg-[linear-gradient(160deg,rgba(164,130,58,0.34)_0%,rgba(15,18,14,0.95)_75%)] lg:border-l lg:border-t-0 ${focusRing}`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
              {group.feature.eyebrow}
            </span>
            <span className="mt-2 text-base font-semibold text-[#fff9ea]">{group.feature.title}</span>
            <span className="mt-1.5 text-[13px] leading-relaxed text-[#c9bfae]">{group.feature.text}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#e8d9ac]">
              Open
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function HomepageNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<SiteMenuGroup["id"] | null>(null);
  // Phone menu: which group is unfolded. Opening the menu unfolds the group this page is in.
  const [phoneGroup, setPhoneGroup] = useState<SiteMenuGroup["id"] | null>(null);
  const menuId = useId();
  const panelId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const triggers = useRef<Partial<Record<SiteMenuGroup["id"], HTMLButtonElement | null>>>({});
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHomepage = isHomepagePath(pathname);
  const activeGroup = siteMenuGroupForPath(pathname);
  const solid = scrolled || !onHomepage || openGroup !== null || menuOpen;

  // A new page closes whatever was open (adjusted during render, not in an effect).
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpenGroup(null);
    setMenuOpen(false);
  }

  const closeAll = useCallback(() => {
    // A hover that was about to open a menu must not reopen it after a click.
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpenGroup(null);
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen && openGroup === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openGroup) triggers.current[openGroup]?.focus();
      closeAll();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (headerRef.current && event.target instanceof Node && !headerRef.current.contains(event.target)) closeAll();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen, openGroup, closeAll]);

  const hover = (id: SiteMenuGroup["id"] | null, delay: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenGroup(id), delay);
  };

  const openPanel = SITE_MENU.find((group) => group.id === openGroup) ?? null;

  const topLink = (active: boolean) =>
    [
      "inline-flex min-h-10 items-center gap-1 rounded-md px-3 text-[14px] font-medium transition-colors duration-200 motion-reduce:transition-none",
      active ? "text-[#fff9ea]" : "text-[#f3ebdd]/85 hover:text-[#fff9ea]",
      focusRing,
    ].join(" ");

  return (
    <header
      ref={headerRef}
      className={[
        // One solid color, no fade-in and no see-through (owner, 2026-11-23: on a phone the
        // top of the screen looked faded and the bar was hard to read). Only a computer
        // still gets the clear bar over the homepage hero until it scrolls.
        "ah-nav fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ease-out motion-reduce:transition-none",
        solid
          ? "border-b border-[rgba(251,247,239,0.08)] bg-[#080907] shadow-[0_1px_0_rgba(251,247,239,0.04)]"
          : "border-b border-[rgba(251,247,239,0.08)] bg-[#080907] lg:border-transparent lg:bg-transparent",
      ].join(" ")}
      /* Installed on an iPhone (standalone, viewport-fit=cover) the page runs
         under the status bar, so a bar fixed at top:0 sat behind the clock
         and signal icons and its first row could not be tapped. Pad it by
         the safe-area inset; in a normal browser tab the inset is 0. */
      style={{ paddingTop: "var(--safe-area-top)" }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") hover(null, 180);
      }}
    >
      <div className="relative mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-5 sm:h-[4.25rem] sm:px-8 lg:px-10 xl:px-16">
        <Link href="/" className={`relative z-10 shrink-0 rounded-sm ${focusRing}`} aria-label="Altair home">
          <AltairLogo variant="white" size="md" showWordmark className="origin-left scale-[1.06]" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex xl:gap-1.5">
          {SITE_MENU.map((group, index) => {
            const open = openGroup === group.id;
            const button = (
              <button
                key={group.id}
                ref={(node) => {
                  triggers.current[group.id] = node;
                }}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenGroup(open ? null : group.id)}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") hover(group.id, openGroup ? 0 : 90);
                }}
                className={topLink(open || activeGroup === group.id)}
              >
                {group.label}
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 opacity-70 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                />
              </button>
            );
            // Pricing sits after Learn, before Company.
            if (index === 3) {
              return [
                <Link
                  key="pricing"
                  href={SITE_MENU_PRICING.href}
                  aria-current={pathname === SITE_MENU_PRICING.href ? "page" : undefined}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") hover(null, 90);
                  }}
                  className={topLink(pathname === SITE_MENU_PRICING.href)}
                >
                  {SITE_MENU_PRICING.label}
                </Link>,
                button,
              ];
            }
            return button;
          })}
        </nav>

        <div className="relative z-10 hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={`rounded-sm px-2 py-1.5 text-[14px] font-medium text-[#f3ebdd]/80 transition-colors duration-200 hover:text-[#fff9ea] motion-reduce:transition-none ${focusRing}`}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            data-cta="nav"
            className={`inline-flex min-h-10 items-center justify-center rounded-lg bg-[#a4823a] px-4 py-2.5 text-[13px] font-semibold text-[#080907] transition-colors duration-200 hover:bg-[#c2a05a] motion-reduce:transition-none ${focusRing}`}
          >
            <span className="xl:hidden">Free 14-Day Trial</span>
            <span className="hidden xl:inline">Start Your 14-Day Free Trial</span>
          </Link>
        </div>

        <button
          type="button"
          className={`relative z-10 inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-[rgba(251,247,239,0.14)] bg-[rgba(8,9,7,0.35)] px-2.5 text-[#fbf7ef] lg:hidden ${focusRing}`}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => {
            setPhoneGroup(activeGroup);
            setMenuOpen((open) => !open);
          }}
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          <span className="text-sm font-medium" aria-hidden="true">
            Menu
          </span>
        </button>
      </div>

      {/* Desktop panel: one at a time, under the bar. */}
      <div id={panelId} className={`absolute inset-x-0 top-full hidden px-5 pt-2 lg:px-10 ${openPanel ? "lg:block" : ""}`}>
        {openPanel ? (
          <div
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") hover(openPanel.id, 0);
            }}
          >
            <Panel group={openPanel} onNavigate={closeAll} />
          </div>
        ) : null}
      </div>

      {/* Phone and tablet: the four groups on one screen; a tap unfolds one. */}
      {menuOpen ? (
        <div
          id={menuId}
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-[rgba(251,247,239,0.08)] bg-[rgba(8,9,7,0.97)] backdrop-blur-xl lg:hidden"
        >
          <nav aria-label="Mobile" className="mx-auto max-w-3xl px-5 pb-8 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/signup"
                data-cta="nav-mobile"
                onClick={closeAll}
                className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a4823a] px-3 text-sm font-semibold text-[#080907] hover:bg-[#c2a05a] ${focusRing}`}
              >
                Free 14-Day Trial
              </Link>
              <Link
                href="/login"
                onClick={closeAll}
                className={`inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(251,247,239,0.16)] px-3 text-sm font-semibold text-[#fbf7ef] ${focusRing}`}
              >
                Sign In
              </Link>
            </div>
            <Link
              href={SITE_MENU_PRICING.href}
              onClick={closeAll}
              className={`mt-4 flex min-h-12 items-center justify-between rounded-xl border border-[rgba(230,227,220,0.12)] bg-[rgba(24,28,22,0.6)] px-4 text-base font-semibold text-[#fff9ea] ${focusRing}`}
            >
              Pricing
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-[#c2a05a]" />
            </Link>
            <ul className="mt-3 grid gap-2">
              {SITE_MENU.map((group) => {
                const open = phoneGroup === group.id;
                const sectionId = `${menuId}-${group.id}`;
                return (
                  <li
                    key={group.id}
                    className={`overflow-hidden rounded-xl border ${open ? "border-[#c2a05a]/45 bg-[rgba(24,28,22,0.75)]" : "border-[rgba(230,227,220,0.12)] bg-[rgba(24,28,22,0.6)]"}`}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={sectionId}
                      onClick={() => setPhoneGroup(open ? null : group.id)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${focusRing}`}
                    >
                      <span>
                        <span className="block text-base font-semibold text-[#fff9ea]">{group.label}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-[#a89c88]">{group.summary}</span>
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-5 w-5 shrink-0 text-[#c2a05a] transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open ? (
                      <div id={sectionId} className="border-t border-[rgba(230,227,220,0.1)] px-1.5 pb-2 pt-1">
                        {linkSections(group).map((section) => (
                          <div key={section.title ?? group.id}>
                            {section.title ? (
                              <p className="px-2.5 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
                                {section.title}
                              </p>
                            ) : null}
                            <ul className="grid sm:grid-cols-2">
                              {section.links.map((link) => (
                                <li key={link.href}>
                                  <Link
                                    href={link.href}
                                    onClick={closeAll}
                                    data-track={`menu-${group.id}`}
                                    aria-current={pathname === link.href ? "page" : undefined}
                                    className={`block rounded-lg px-2.5 py-2.5 hover:bg-[rgba(8,9,7,0.6)] aria-[current=page]:bg-[rgba(164,130,58,0.14)] ${focusRing}`}
                                  >
                                    <span className="block text-[15px] font-semibold text-[#fbf7ef]">{link.label}</span>
                                    <span className="mt-0.5 block text-[13px] leading-snug text-[#a89c88]">{link.text}</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {group.more?.length ? (
                          <p className="mt-1 flex flex-wrap gap-x-5 border-t border-[rgba(230,227,220,0.08)] px-2.5 pt-1">
                            {group.more.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeAll}
                                className={`inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[#c2a05a] ${focusRing}`}
                              >
                                {link.label}
                                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                              </Link>
                            ))}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
