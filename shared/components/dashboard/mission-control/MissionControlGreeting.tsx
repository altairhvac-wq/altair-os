import type { MissionControlGreetingContent } from "@/shared/lib/dashboard-mission-control";

type MissionControlGreetingProps = {
  content: MissionControlGreetingContent;
};

export function MissionControlGreeting({ content }: MissionControlGreetingProps) {
  return (
    <header className="rounded-xl border border-slate-200/70 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <p className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
        {content.greeting}
      </p>
      <p className="mt-1 text-sm text-slate-600">{content.dateLabel}</p>
      <p
        className={`mt-2 text-sm font-semibold ${
          content.attentionCount > 0 ? "text-amber-800" : "text-emerald-700"
        }`}
      >
        {content.attentionSummary}
      </p>
    </header>
  );
}
