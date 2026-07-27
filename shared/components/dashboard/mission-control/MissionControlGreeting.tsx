import type { MissionControlGreetingContent } from "@/shared/lib/dashboard-mission-control";

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
      <p className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
        {content.greeting}
      </p>
      <p
        className={
          content.attentionCount > 0
            ? "mt-1 text-sm font-medium text-amber-800 sm:text-[0.9375rem]"
            : "mt-1 text-sm text-slate-600 sm:text-[0.9375rem]"
        }
      >
        {content.attentionSummary}
      </p>
      <p className="mt-1 text-xs text-slate-500">{content.dateLabel}</p>
    </header>
  );
}
