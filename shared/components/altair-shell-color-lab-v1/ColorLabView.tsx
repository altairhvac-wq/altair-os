"use client";

import { useState } from "react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { ColorLabPaletteTabs } from "./ColorLabPaletteTabs";
import { ColorLabShellPreview } from "./ColorLabShellPreview";
import { getPaletteById, type PaletteId } from "./palette-tokens";

type ColorLabViewProps = {
  companyContext: ActiveCompanyContext;
};

export function ColorLabView({ companyContext }: ColorLabViewProps) {
  const [activePaletteId, setActivePaletteId] = useState<PaletteId>("mission-control-refined");
  const activePalette = getPaletteById(activePaletteId);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ColorLabPaletteTabs activeId={activePaletteId} onChange={setActivePaletteId} />
      <div className="min-h-0 flex-1">
        <ColorLabShellPreview companyContext={companyContext} palette={activePalette} />
      </div>
    </div>
  );
}
