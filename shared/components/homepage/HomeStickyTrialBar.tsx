"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Phones only (2026-11-24, owner picked the film-first phone hero): once the
 * hero's trial button has scrolled out of view, a slim bar at the bottom keeps
 * "Start your free trial" one tap away. It hides again while the hero button
 * or the closing band's button is on screen, so there is never a second copy
 * of the same button in view.
 *
 * The ids it watches are set in HomeLandingPage. If either is missing (the
 * page changed), the bar simply never shows.
 */
export function HomeStickyTrialBar({ trialDays, watchIds }: { trialDays: number; watchIds: readonly string[] }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = watchIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length !== watchIds.length || typeof IntersectionObserver === "undefined") return;

    const visible = new Map<Element, boolean>();
    // The hero button starts on screen; the bar waits until it has been scrolled past.
    let heroSeen = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) visible.set(entry.target, entry.isIntersecting);
      const hero = targets[0];
      if (visible.get(hero)) heroSeen = true;
      const heroAbove = heroSeen && !visible.get(hero) && hero.getBoundingClientRect().bottom < 0;
      const anyCtaVisible = targets.some((t) => visible.get(t));
      setShow(heroAbove && !anyCtaVisible);
    });
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [watchIds]);

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(194,160,90,0.3)] bg-[#0b0e0a]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur transition-transform duration-300 sm:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <Link
        href="/signup"
        data-cta="home-sticky"
        tabIndex={show ? 0 : -1}
        className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[#a4823a] px-6 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8d9ac]"
      >
        Start Your {trialDays}-Day Free Trial
      </Link>
      <p className="mt-1.5 text-center text-[11px] text-[#8e826f]">No credit card to start</p>
    </div>
  );
}
