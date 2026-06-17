import type { AttentionRail } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { NotificationItem, OfficeQueueItem } from "./sample-data";
import { shellEyebrowClass, shellInsetClass, shellZoneClass } from "./shell-tokens";

const urgencyStyles = {
  now: {
    dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.45)]",
    chip: "bg-red-950/60 text-red-200 ring-red-500/30",
    label: "Now",
  },
  today: { dot: "bg-cyan-400/90", chip: "bg-cyan-950/50 text-cyan-200 ring-cyan-500/30", label: "Today" },
  soon: { dot: "bg-slate-500", chip: "bg-slate-800/80 text-slate-300 ring-slate-600/40", label: "Soon" },
} as const;

const queueTypeStyles = {
  estimate: "text-cyan-300/90",
  invoice: "text-emerald-300/90",
  job: "text-sky-300/90",
  lead: "text-indigo-300/90",
} as const;

type AttentionSystemPanelProps = {
  rails: AttentionRail[];
  officeQueue: OfficeQueueItem[];
  notifications: NotificationItem[];
};

export function AttentionSystemPanel({
  rails,
  officeQueue,
  notifications,
}: AttentionSystemPanelProps) {
  const signalCount = rails.reduce((sum, rail) => sum + rail.items.length, 0);
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <section aria-label="Attention system" className={shellZoneClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-indigo-500/5 blur-3xl"
      />

      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`${shellEyebrowClass} text-amber-400/60`}>Attention radar</p>
          <p className="mt-1 text-base font-semibold tracking-tight text-slate-100">
            What is blocking the company
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-700/40">
            {signalCount} signals
          </span>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 ring-1 ring-cyan-500/20">
              {unreadCount} unread
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative flex flex-col gap-4">
        <div className={shellInsetClass}>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Blockers by domain
          </p>
          <div className="flex flex-col gap-5">
            {rails.map((rail, railIndex) => (
              <div key={rail.id} className="relative">
                {railIndex > 0 ? (
                  <div
                    aria-hidden="true"
                    className="absolute -top-2.5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-800/80 to-transparent"
                  />
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
                  <div className="flex shrink-0 items-center gap-2 sm:w-28 sm:flex-col sm:items-start sm:gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {rail.label}
                    </span>
                  </div>

                  <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {rail.items.map((item) => {
                      const urgency = urgencyStyles[item.urgency];
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="group inline-flex max-w-full items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-left ring-1 ring-slate-800/50 transition-all hover:bg-slate-900 hover:ring-slate-700/60"
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${urgency.dot}`} aria-hidden="true" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-100">
                                {item.title}
                              </span>
                              <span className="block truncate text-[11px] text-slate-500">{item.meta}</span>
                            </span>
                            <span
                              className={`ml-1 hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ring-1 sm:inline ${urgency.chip}`}
                            >
                              {urgency.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={shellInsetClass}>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Office review queue
            </p>
            <ul className="flex flex-col gap-2">
              {officeQueue.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg bg-slate-900/40 px-3 py-2.5 text-left ring-1 ring-slate-800/40 transition-colors hover:bg-slate-900/70"
                  >
                    <p className="line-clamp-2 text-sm font-medium text-slate-200">{item.title}</p>
                    <p className={`mt-0.5 text-[11px] ${queueTypeStyles[item.type]}`}>{item.meta}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={shellInsetClass}>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Notifications
            </p>
            <ul className="flex flex-col gap-2">
              {notifications.map((item) => (
                <li key={item.id}>
                  <div className="flex items-start gap-2 rounded-lg px-1 py-1">
                    {item.unread ? (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
                    ) : (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-transparent" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className={`truncate text-sm ${item.unread ? "font-medium text-slate-100" : "text-slate-500"}`}>
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-600">{item.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
