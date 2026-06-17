"use client";

import { usePaletteTokens } from "./palette-context";

export function ColorLabConceptBadge() {
  const t = usePaletteTokens();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={t.conceptMarker}>Color Lab</span>
      <span className={t.conceptMarkerText}>
        Altair Shell Color Lab · v1 · frozen layout · not production
      </span>
    </div>
  );
}
