import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import type { AnalyticsInsight } from "@/shared/types/analytics";

type AnalyticsInsightCardsProps = {
  insights: AnalyticsInsight[];
};

const toneStyles = {
  positive: {
    border: "border-emerald-100",
    icon: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
    Icon: TrendingUp,
  },
  neutral: {
    border: "border-slate-200",
    icon: "bg-slate-100 text-slate-600",
    badge: "bg-slate-100 text-slate-700",
    Icon: Lightbulb,
  },
  warning: {
    border: "border-amber-100",
    icon: "bg-amber-50 text-amber-600",
    badge: "bg-amber-50 text-amber-700",
    Icon: AlertTriangle,
  },
  critical: {
    border: "border-rose-100",
    icon: "bg-rose-50 text-rose-600",
    badge: "bg-rose-50 text-rose-700",
    Icon: AlertTriangle,
  },
};

export function AnalyticsInsightCards({ insights }: AnalyticsInsightCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {insights.map((insight) => {
        const style = toneStyles[insight.tone];
        const ToneIcon = style.Icon;
        const TrendIcon =
          insight.tone === "positive" ? ArrowUpRight : ArrowDownRight;

        return (
          <article
            key={insight.id}
            className={`rounded-2xl border bg-white p-4 shadow-sm ${style.border}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.icon}`}
              >
                <ToneIcon className="h-4 w-4" />
              </div>
              {insight.metric ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${style.badge}`}
                >
                  {insight.tone === "positive" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : insight.tone === "warning" ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <TrendIcon className="h-3 w-3" />
                  )}
                  {insight.metric}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              {insight.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {insight.description}
            </p>
          </article>
        );
      })}
    </div>
  );
}
