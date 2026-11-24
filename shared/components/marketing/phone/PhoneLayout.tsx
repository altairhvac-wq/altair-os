"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * The phone pieces that need a little JavaScript (see phone-classes.ts for
 * the CSS-only ones). Each one changes nothing from `sm` up.
 */

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/60";

/**
 * Wraps a list. On a phone, the list (given a `showFirst[n]` class) shows its
 * first items and this adds "Show N more"; from `sm` up everything shows.
 */
export function ShowMore({
  children,
  hidden,
  noun = "more",
  tone = "light",
}: {
  readonly children: ReactNode;
  /** How many items the phone hides at first; no button when 0. */
  readonly hidden: number;
  readonly noun?: string;
  readonly tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div data-open={open ? "true" : "false"} className="group/more">
      {children}
      {hidden > 0 && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold sm:hidden ${ring} ${
            tone === "dark" ? "border-white/15 bg-white/[0.04] text-[#f3ebdd]" : "border-stone-300 bg-white text-stone-800"
          }`}
        >
          Show {hidden} {noun}
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * "On this page" links that stay under the site header on a phone, with the
 * section in view underlined. Plain anchors: the page works without it.
 */
export function PhoneJumpBar({
  items,
  className = "",
}: {
  readonly items: readonly { readonly id: string; readonly label: string }[];
  /** Placement only (e.g. negative margins inside a padded page); it must stay a direct child of the long page so it can stick. */
  readonly className?: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targets = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    // Keep the underlined link in view inside the sideways-scrolling bar.
    // Only the bar scrolls: scrollIntoView() would also scroll the PAGE to the
    // sticky bar's resting place, throwing a phone back to the top while the
    // reader scrolls down (owner, 2026-11-23, on /pricing).
    const container = bar.current;
    const link = container?.querySelector<HTMLElement>(`[data-jump="${active}"]`);
    if (container && link) {
      const left = link.offsetLeft - (container.clientWidth - link.offsetWidth) / 2;
      container.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav aria-label="On this page" className={`sticky top-[calc(4rem+env(safe-area-inset-top))] z-40 border-b border-white/10 bg-[#080907] sm:hidden ${className}`}>
      <div ref={bar} className="flex gap-1 overflow-x-auto px-3 [scrollbar-width:none]">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            data-jump={item.id}
            aria-current={active === item.id ? "true" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-2.5 text-[13px] font-semibold ${ring} ${
              active === item.id ? "border-[#c2a05a] text-[#fff9ea]" : "border-transparent text-[#a89c88]"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/** A footer column: a tap-to-open row on a phone, an ordinary column from `sm` up. */
export function FooterColumn({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-w-0 max-sm:border-b max-sm:border-white/10">
      <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8e826f] sm:block">{title}</p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-12 w-full items-center justify-between text-[12px] font-semibold uppercase tracking-[0.16em] text-[#a89c88] sm:hidden ${ring}`}
      >
        {title}
        <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`${open ? "" : "max-sm:hidden"} max-sm:pb-3`}>{children}</div>
    </div>
  );
}

/**
 * A guide section that folds on a phone: the numbered title is a tap target
 * and the body opens under it. From `sm` up the body always shows and the
 * title is ordinary text. The body stays in the page either way (search
 * engines and in-page links still reach it).
 */
export function PhoneFold({
  headingId,
  n,
  title,
  defaultOpen = false,
  children,
}: {
  readonly headingId: string;
  readonly n: number;
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    // An in-page link to this section ("#example") opens it.
    const sectionId = headingId.replace(/-title$/, "");
    const check = () => {
      if (window.location.hash === `#${sectionId}`) setOpen(true);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [headingId]);

  return (
    <>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-xs font-semibold text-white">{n}</span>
        <h2 id={headingId} className="min-w-0 flex-1 text-xl font-semibold leading-snug tracking-tight text-[#0A0A0A] sm:text-[1.45rem]">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={`flex w-full items-start justify-between gap-3 text-left sm:pointer-events-none ${ring}`}
          >
            <span>{title}</span>
            <ChevronDown aria-hidden="true" className={`mt-1 h-5 w-5 shrink-0 text-stone-400 transition-transform sm:hidden ${open ? "rotate-180" : ""}`} />
          </button>
        </h2>
      </div>
      <div className={open ? "" : "max-sm:hidden"}>{children}</div>
    </>
  );
}
