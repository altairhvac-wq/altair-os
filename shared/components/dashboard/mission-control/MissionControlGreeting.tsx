import type { MissionControlGreetingContent } from "@/shared/lib/dashboard-mission-control";
import { altairSemanticValueClass } from "@/shared/design-system/foundation";

type MissionControlGreetingProps = {
  content: MissionControlGreetingContent;
};

/**
 * Lightweight orientation — no hero banner, no Surface chrome.
 * Keeps attention summary above the fold without pushing briefing content down.
 */
export function MissionControlGreeting({ content }: MissionControlGreetingProps) {
  return (
    <header className="min-w-0 px-0.5">
      <p className="text-lg font-semibold tracking-tight text-altair-ink-on-paper sm:text-xl">
        {content.greeting}
      </p>
      <p
        className={
          content.attentionCount > 0
            ? `mt-1 text-sm font-medium sm:text-[0.9375rem] ${altairSemanticValueClass.warning}`
            : "mt-1 text-sm text-altair-ink-on-paper-secondary sm:text-[0.9375rem]"
        }
      >
        {content.attentionSummary}
      </p>
      <p className="mt-1 text-xs text-altair-ink-on-paper-muted">
        {content.dateLabel}
      </p>
    </header>
  );
}
