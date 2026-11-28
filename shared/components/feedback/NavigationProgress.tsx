"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A thin gold bar across the top of the window that starts the moment an
 * internal link is clicked and finishes when the new page commits.
 *
 * Why: route-level `loading.tsx` states only appear once the router starts
 * the transition, and on a slow phone that first beat is where people tap
 * twice. Feedback on the click itself makes navigation feel immediate.
 *
 * Starts on: a primary-button click on a same-origin <a href> that changes
 * the path or query (not hash-only, not new-tab/modifier clicks, not
 * download/target links). Finishes on: the pathname or search params
 * changing, or after 10 s as a safety net. Programmatic router.push calls do
 * not start it; their screens have their own loading states.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "running" | "finishing">("idle");
  const safety = useRef<number | null>(null);
  const location = `${pathname}?${searchParams.toString()}`;
  const lastLocation = useRef(location);

  // The route committed: finish the bar.
  useEffect(() => {
    if (lastLocation.current === location) return;
    lastLocation.current = location;
    if (safety.current) window.clearTimeout(safety.current);
    setState((current) => (current === "idle" ? "idle" : "finishing"));
    const done = window.setTimeout(() => setState("idle"), 320);
    return () => window.clearTimeout(done);
  }, [location]);

  // Start on internal link clicks.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      let next: URL;
      try {
        next = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin) return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      setState("running");
      if (safety.current) window.clearTimeout(safety.current);
      safety.current = window.setTimeout(() => setState("idle"), 10000);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]" aria-hidden="true">
      <div className={`altair-nav-progress h-full ${state === "finishing" ? "is-finishing" : ""}`} />
    </div>
  );
}
