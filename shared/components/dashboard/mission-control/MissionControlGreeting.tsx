import type { MissionControlGreetingContent } from "@/shared/lib/dashboard-mission-control";
import {
  altairCanvasInkClass,
  altairCanvasInkMutedClass,
  altairCanvasInkSecondaryClass,
  altairSemanticValueClass,
} from "@/shared/design-system/foundation";

type MissionControlGreetingProps = {
  content: MissionControlGreetingContent;
};

/**
 * Lightweight orientation — no hero banner, no Surface chrome.
 * Keeps attention summary above the fold without pushing briefing content down.
 * Canvas-level ink flips to light on North Star desktop graphite via CSS.
 */
export function MissionControlGreeting({ content }: MissionControlGreetingProps) {
  return (
    <header className="min-w-0 px-0.5">
      <p
        className={`text-lg font-semibold tracking-tight sm:text-xl ${altairCanvasInkClass}`}
      >
        {content.greeting}
      </p>
      <p
        className={
          content.attentionCount > 0
            ? `mt-1 text-sm font-medium sm:text-[0.9375rem] ${altairSemanticValueClass.warning}`
            : `mt-1 text-sm sm:text-[0.9375rem] ${altairCanvasInkSecondaryClass}`
        }
      >
        {content.attentionSummary}
      </p>
      <p className={`mt-1 text-xs ${altairCanvasInkMutedClass}`}>
        {content.dateLabel}
      </p>
    </header>
  );
}
