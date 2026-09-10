"use client";

import {
  Captions,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Library,
  Music,
  Sparkles,
  Type,
  Wand2,
} from "lucide-react";

/**
 * Vertical tool navigation. Icon + micro-label, because an icon-only rail in a
 * tool nobody uses daily is a memory test.
 */

export const TOOL_TABS = [
  { id: "media", label: "Media", icon: Film },
  { id: "library", label: "Library", icon: Library },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "audio", label: "Audio", icon: Music },
  { id: "text", label: "Text", icon: Type },
  { id: "captions", label: "Captions", icon: Captions },
  { id: "transitions", label: "Transit", icon: Sparkles },
  { id: "effects", label: "Effects", icon: Wand2 },
  { id: "animations", label: "Animate", icon: Clapperboard },
] as const;

export type ToolTabId = (typeof TOOL_TABS)[number]["id"];

export function ToolRail({
  active,
  onSelect,
}: {
  readonly active: ToolTabId;
  readonly onSelect: (id: ToolTabId) => void;
}) {
  return (
    <nav
      aria-label="Editor tools"
      className="flex w-[62px] shrink-0 flex-col overflow-y-auto py-1"
      style={{
        background: "var(--ve-bg)",
        borderRight: "1px solid var(--ve-line-strong)",
      }}
    >
      {TOOL_TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(tab.id)}
            className="flex flex-col items-center gap-0.5 py-2"
            style={{
              background: selected ? "var(--ve-panel)" : "transparent",
              color: selected ? "var(--ve-accent)" : "var(--ve-text-faint)",
              boxShadow: selected
                ? "inset 2px 0 0 var(--ve-accent)"
                : undefined,
            }}
          >
            <Icon className="size-[18px]" />
            <span className="text-[9px] leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
