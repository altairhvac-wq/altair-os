import type { MissionControlGreetingContent } from "@/shared/lib/dashboard-mission-control";

type MissionControlGreetingProps = {
  content: MissionControlGreetingContent;
};

export function MissionControlGreeting({ content }: MissionControlGreetingProps) {
  return (
    <header className="rounded-xl border border-slate-200/70 bg-white px-4 py-2.5 shadow-sm sm:px-5 sm:py-3">
      <p className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
        {content.greeting}
      </p>
      <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
        <span>{content.dateLabel}</span>
        {content.briefingItems.map((item) => (
          <span key={item}>
            <span aria-hidden="true" className="mx-1.5 text-slate-300">
              ·
            </span>
            <span
              className={
                item === content.briefingItems[0] && content.attentionCount > 0
                  ? "font-semibold text-amber-800"
                  : "font-medium text-slate-700"
              }
            >
              {item}
            </span>
          </span>
        ))}
      </p>
    </header>
  );
}
