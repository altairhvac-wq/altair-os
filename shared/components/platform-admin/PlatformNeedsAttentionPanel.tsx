import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { PlatformBrainSnapshot, PlatformPrioritySignal } from "@/shared/types/platform-admin";
import { pt } from "@/shared/components/platform-admin/north-star-m13/platform-north-star-styles";

type PlatformNeedsAttentionPanelProps = {
  brain: PlatformBrainSnapshot;
  northStar?: boolean;
};

function formatSeverityLabel(severity: PlatformPrioritySignal["severity"]): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function severityClass(severity: PlatformPrioritySignal["severity"], northStar: boolean): string {
  if (northStar) {
    switch (severity) {
      case "critical":
        return "bg-[rgba(185,28,28,0.1)] text-[#991B1B] ring-[rgba(185,28,28,0.16)]";
      case "high":
        return "bg-[rgba(180,83,9,0.1)] text-[#9A3412] ring-[rgba(180,83,9,0.16)]";
      case "medium":
        return "bg-[rgba(138,99,36,0.1)] text-[#8A6324] ring-[rgba(138,99,36,0.16)]";
      default:
        return "bg-[rgba(100,116,139,0.1)] text-[#475569] ring-[rgba(100,116,139,0.16)]";
    }
  }

  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-700 ring-red-600/10";
    case "high":
      return "bg-amber-50 text-amber-800 ring-amber-600/10";
    case "medium":
      return "bg-cyan-50 text-cyan-800 ring-cyan-600/10";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-600/10";
  }
}

function SignalRow({
  signal,
  rank,
  northStar,
}: {
  signal: PlatformPrioritySignal;
  rank: number;
  northStar: boolean;
}) {
  const badgeClass = severityClass(signal.severity, northStar);

  return (
    <li>
      <Link
        href={signal.href}
        className={
          northStar
            ? "group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#F3EBDD] sm:px-3"
            : "group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 sm:px-3"
        }
      >
        <span
          className={
            northStar
              ? "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFE4CB] text-[11px] font-bold text-[#8A6324]"
              : "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600"
          }
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={
                northStar
                  ? "text-sm font-semibold text-[#17130E]"
                  : "text-sm font-semibold text-slate-900"
              }
            >
              {signal.title}
            </p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeClass}`}
            >
              {formatSeverityLabel(signal.severity)}
            </span>
          </div>
          <p
            className={
              northStar
                ? "mt-0.5 text-xs leading-snug text-[#4F4638]"
                : "mt-0.5 text-xs leading-snug text-slate-600"
            }
          >
            {signal.description}
          </p>
          {signal.companyName ? (
            <p
              className={
                northStar
                  ? "mt-1 text-[11px] font-medium text-[#8A6324]"
                  : "mt-1 text-[11px] font-medium text-cyan-700"
              }
            >
              {signal.companyName}
            </p>
          ) : null}
        </div>
        <ChevronRight
          className={
            northStar
              ? "mt-1 h-4 w-4 shrink-0 text-[#8A6324] transition-transform group-hover:translate-x-0.5"
              : "mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
          }
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

export function PlatformNeedsAttentionPanel({
  brain,
  northStar = false,
}: PlatformNeedsAttentionPanelProps) {
  const signals = brain.topSignals;

  if (northStar) {
    return (
      <section className={pt.sectionSurface} aria-label="Needs attention">
        <div className={pt.panelHeader}>
          <p className={pt.sectionEyebrow}>Priority queue</p>
          <h2 className={`mt-0.5 ${pt.sectionTitle}`}>Needs attention</h2>
          <p className={pt.sectionSubtitle}>
            Ranked platform signals — action before analytics.
          </p>
        </div>
        <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
          {signals.length === 0 ? (
            <p className={pt.emptyCopy}>
              No platform signals right now — Altair looks healthy from this
              vantage point, including platform reliability checks.
            </p>
          ) : (
            <ul className={pt.listDivider}>
              {signals.map((signal, index) => (
                <SignalRow
                  key={signal.id}
                  signal={signal}
                  rank={index + 1}
                  northStar
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="admin-card admin-card-body" aria-label="Needs attention">
      <h2 className="text-sm font-bold text-slate-900">Needs attention</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Ranked platform signals — action before analytics.
      </p>
      {signals.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No platform signals right now — Altair looks healthy from this vantage
          point, including platform reliability checks.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {signals.map((signal, index) => (
            <SignalRow
              key={signal.id}
              signal={signal}
              rank={index + 1}
              northStar={false}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
