"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";

/**
 * The article's contents list, sticky beside the text on wide screens, with
 * the section being read highlighted, and a thin reading-progress bar along
 * the top of the window. Both are progressive: the links are ordinary
 * in-page anchors in the server HTML, and the highlight and the bar only
 * appear once the script runs. Nothing is stored or sent.
 */

export type TocItem = { readonly id: string; readonly label: string; readonly tool?: boolean };

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

export function ArticleToc({ items, minutes }: { readonly items: readonly TocItem[]; readonly minutes: number }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;
    const onScroll = () => {
      // The last section whose top has passed a line a third of the way down.
      const line = window.innerHeight * 0.33;
      let current: string | null = null;
      for (const el of targets) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  return (
    <nav aria-label="In this article" className="sticky top-24">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">In this article</p>
      <ol className="mt-3 space-y-0.5 border-l border-stone-200 text-[13px]">
        {items.map((item) => {
          const on = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={on ? "location" : undefined}
                className={`-ml-px flex items-start gap-1.5 border-l-2 py-1.5 pl-3 pr-2 leading-snug transition-colors ${
                  on ? "border-[#A4823A] font-semibold text-stone-900" : "border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-900"
                } ${focusRing}`}
              >
                {item.tool ? <Calculator aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A4823A]" /> : null}
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 px-2 text-xs text-stone-500">{minutes} min read</p>
    </nav>
  );
}

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] print:hidden">
      <div className="h-full origin-left bg-[#A4823A] transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
