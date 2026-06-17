"use client";

import { colorLabPalettes, type PaletteId } from "./palette-tokens";

type ColorLabPaletteTabsProps = {
  activeId: PaletteId;
  onChange: (id: PaletteId) => void;
};

export function ColorLabPaletteTabs({ activeId, onChange }: ColorLabPaletteTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Color palette variants"
      className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/95 px-4 py-3 backdrop-blur-xl sm:px-6"
    >
      <div className="mx-auto flex max-w-[92rem] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Altair Shell Color Lab
          </p>
          <p className="mt-0.5 text-sm text-slate-300">
            Same layout · same data · palette comparison only
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {colorLabPalettes.map((palette) => {
            const isActive = palette.id === activeId;
            return (
              <button
                key={palette.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(palette.id)}
                className={`rounded-lg px-3 py-2 text-left transition-all ${
                  isActive
                    ? "bg-white/10 text-white ring-1 ring-white/20"
                    : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                }`}
              >
                <span className="block text-xs font-semibold">{palette.label}</span>
                <span className="mt-0.5 hidden text-[10px] leading-snug text-slate-400 sm:block">
                  {palette.intent.slice(0, 72)}
                  {palette.intent.length > 72 ? "…" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
