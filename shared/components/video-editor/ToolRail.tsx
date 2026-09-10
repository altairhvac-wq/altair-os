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

/**
 * `implemented: false` renders the tab visibly disabled rather than opening a
 * panel that explains itself. A control that looks live and does nothing is
 * the placeholder problem; a control that is plainly greyed out is an honest
 * statement about what exists.
 */
export const TOOL_TABS = [
  { id: "media", label: "Media", icon: Film, implemented: true },
  { id: "library", label: "Library", icon: Library, implemented: true },
  { id: "audio", label: "Audio", icon: Music, implemented: true },
  { id: "text", label: "Text", icon: Type, implemented: true },
  { id: "captions", label: "Captions", icon: Captions, implemented: true },
  { id: "transitions", label: "Transit", icon: Sparkles, implemented: true },
  { id: "images", label: "Images", icon: ImageIcon, implemented: false },
  { id: "effects", label: "Effects", icon: Wand2, implemented: false },
  { id: "animations", label: "Animate", icon: Clapperboard, implemented: false },
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
            disabled={!tab.implemented}
            title={tab.implemented ? tab.label : `${tab.label} — not built yet`}
            onClick={() => tab.implemented && onSelect(tab.id)}
            className="flex flex-col items-center gap-0.5 py-2 disabled:cursor-not-allowed disabled:opacity-35"
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
