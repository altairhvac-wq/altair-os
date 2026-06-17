import { ChevronRight } from "lucide-react";
import { HorizonDivider } from "@/shared/design-system/signature";
import type { AttentionGroup } from "./sample-data";

const urgencyLabel = {
  now: "Now",
  today: "Today",
  soon: "This week",
} as const;

type AttentionQueueSectionProps = {
  groups: AttentionGroup[];
};

export function AttentionQueueSection({ groups }: AttentionQueueSectionProps) {
  return (
    <section aria-labelledby="attention-queue-heading" className="flex flex-col gap-8 lg:gap-10">
      <div className="flex flex-col gap-1.5">
        <h2
          id="attention-queue-heading"
          className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
        >
          Attention queue
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Grouped by what blocks revenue, schedule, and customer follow-up — not
          by dashboard widget.
        </p>
      </div>

      <div className="flex flex-col gap-10 lg:gap-12">
        {groups.map((group, groupIndex) => (
          <div key={group.id} className="flex flex-col gap-4">
            {groupIndex > 0 ? <HorizonDivider variant="fade" className="mb-2 opacity-50" /> : null}
            <p className="text-sm font-medium text-slate-700">{group.question}</p>
            <ul className="flex flex-col">
              {group.items.map((item, itemIndex) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="group flex w-full items-start gap-4 rounded-xl px-1 py-4 text-left transition-colors hover:bg-slate-50/80 sm:gap-5 sm:px-2"
                  >
                    <div className="mt-1 flex flex-col items-center gap-1">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${
                          item.urgency === "now"
                            ? "bg-amber-500/90"
                            : item.urgency === "today"
                              ? "bg-slate-400"
                              : "bg-slate-300"
                        }`}
                      />
                      {itemIndex < group.items.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className="hidden h-10 w-px bg-slate-200/80 sm:block"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="text-base font-semibold text-slate-900 sm:text-[1.05rem]">
                          {item.title}
                        </p>
                        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                          {urgencyLabel[item.urgency]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {item.context}
                      </p>
                      {item.meta ? (
                        <p className="mt-1.5 text-xs text-slate-400">{item.meta}</p>
                      ) : null}
                    </div>
                    <ChevronRight
                      className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
                      aria-hidden="true"
                    />
                  </button>
                  {itemIndex < group.items.length - 1 ? (
                    <div className="ml-3 border-b border-slate-100 sm:ml-4" />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Sample actions only — links point to existing production pages for context.
      </p>
    </section>
  );
}
