"use client";

import type { ReactNode } from "react";

/**
 * AsyncSection — the standard wrapper for any widget that loads
 * asynchronously after its page shell has rendered.
 *
 * Why this exists
 * ---------------
 * Automation (the demo-video pipeline, founder screenshot scripts, future
 * E2E tests) needs a reliable, uniform way to know whether an async widget
 * is *actually done*, not just mounted. The Dispatch map bug and the
 * skeleton-frames-in-the-demo-video bug were the same failure twice: a
 * page-level testid appears (shell rendered), automation captures, but a
 * widget inside is still loading. The first fix was hand-adding
 * `data-testid="dispatch-map-panel-loading"` / `"...-ready"` — this
 * component makes that pattern automatic instead of remembered.
 *
 * What it emits, given `feature="dispatch-map-panel"`:
 *   while loading : <section data-testid="dispatch-map-panel-loading" aria-busy="true">
 *   when ready    : <section data-testid="dispatch-map-panel-ready">
 *
 * The `aria-busy` attribute is load-bearing, not decorative: the demo
 * pipeline's stale-frame detector (detectLoadingIndicators, signal 3)
 * treats visible `[aria-busy="true"]` elements as loading indicators, so
 * any widget wrapped in AsyncSection is automatically protected against
 * appearing half-loaded in a captured frame — no per-page wait logic
 * required. It is also the correct a11y semantic for a busy region.
 *
 * Usage
 * -----
 *   <AsyncSection
 *     feature="dispatch-map-panel"
 *     isLoading={geocodeState !== "ready"}
 *     fallback={<MapPanelSkeleton />}
 *   >
 *     <DispatchMap jobs={jobs} />
 *   </AsyncSection>
 *
 * Rules (see docs/product/ASYNC_SECTION_STANDARD.md):
 * - `feature` is kebab-case, unique per page, and NEVER renamed casually —
 *   automation scripts key off it (renaming is an API break; grep the
 *   AltairDemoTool scripts and scripts/capture-founder-marketing-*.mjs).
 * - Wrap the async widget, not the whole page — page shells already have
 *   their own page-level testids.
 * - `fallback` should be the widget's skeleton; AsyncSection does not
 *   invent one, it only standardizes the state contract around yours.
 */
export function AsyncSection({
  feature,
  isLoading,
  fallback,
  children,
  className,
}: {
  /** Kebab-case widget identity, e.g. "dispatch-map-panel". */
  feature: string;
  /** The widget's real async state — hand it whatever you already track. */
  isLoading: boolean;
  /** Skeleton/placeholder shown while loading. */
  fallback?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  if (isLoading) {
    return (
      <section
        data-testid={`${feature}-loading`}
        aria-busy="true"
        className={className}
      >
        {fallback ?? null}
      </section>
    );
  }
  return (
    <section data-testid={`${feature}-ready`} className={className}>
      {children}
    </section>
  );
}
