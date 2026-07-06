import type { PlatformReliabilitySnapshot } from "@/shared/types/platform-admin";
import { pt } from "@/shared/components/platform-admin/north-star-m13/platform-north-star-styles";

type PlatformReliabilityPulseProps = {
  reliability: PlatformReliabilitySnapshot;
  northStar?: boolean;
};

function pulseStatusClass(
  status: PlatformReliabilitySnapshot["pulse"][number]["status"],
  northStar: boolean,
): string {
  if (northStar) {
    switch (status) {
      case "healthy":
        return "bg-[rgba(22,101,52,0.1)] text-[#166534] ring-[rgba(22,101,52,0.16)]";
      case "warning":
        return "bg-[rgba(180,83,9,0.1)] text-[#9A3412] ring-[rgba(180,83,9,0.16)]";
      case "critical":
        return "bg-[rgba(185,28,28,0.1)] text-[#991B1B] ring-[rgba(185,28,28,0.16)]";
      case "deferred":
        return "bg-[rgba(100,116,139,0.08)] text-[#64748B] ring-[rgba(100,116,139,0.12)]";
      default:
        return "bg-[rgba(100,116,139,0.1)] text-[#475569] ring-[rgba(100,116,139,0.16)]";
    }
  }

  switch (status) {
    case "healthy":
      return "bg-emerald-50 text-emerald-800 ring-emerald-600/10";
    case "warning":
      return "bg-amber-50 text-amber-800 ring-amber-600/10";
    case "critical":
      return "bg-red-50 text-red-700 ring-red-600/10";
    case "deferred":
      return "bg-slate-100 text-slate-600 ring-slate-600/10";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-600/10";
  }
}

function pulseStatusLabel(
  status: PlatformReliabilitySnapshot["pulse"][number]["status"],
): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    case "deferred":
      return "Deferred";
    default:
      return "Unknown";
  }
}

function PulseItem({
  item,
  northStar,
}: {
  item: PlatformReliabilitySnapshot["pulse"][number];
  northStar: boolean;
}) {
  const badgeClass = pulseStatusClass(item.status, northStar);

  return (
    <div
      className={
        northStar
          ? "min-w-0 rounded-[0.875rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-3"
          : "min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={
            northStar
              ? "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6255]"
              : "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
          }
        >
          {item.label}
        </p>
        <span
          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeClass}`}
        >
          {pulseStatusLabel(item.status)}
        </span>
      </div>
      <p
        className={
          northStar
            ? "mt-1.5 text-xs leading-snug text-[#4F4638]"
            : "mt-1.5 text-xs leading-snug text-slate-600"
        }
      >
        {item.detail}
      </p>
      {item.founderAction?.status === "contacted" ? (
        <p
          className={
            northStar
              ? "mt-1 text-[10px] font-medium text-[#166534]"
              : "mt-1 text-[10px] font-medium text-emerald-700"
          }
        >
          Founder contacted
        </p>
      ) : null}
      {item.founderAction?.note ? (
        <p
          className={
            northStar
              ? "mt-0.5 text-[10px] leading-snug text-[#6B6255]"
              : "mt-0.5 text-[10px] leading-snug text-slate-500"
          }
        >
          {item.founderAction.note.length > 80
            ? `${item.founderAction.note.slice(0, 77).trimEnd()}…`
            : item.founderAction.note}
        </p>
      ) : null}
    </div>
  );
}

export function PlatformReliabilityPulse({
  reliability,
  northStar = false,
}: PlatformReliabilityPulseProps) {
  const headline = reliability.isReliabilityHealthy
    ? "Altair platform systems look healthy"
    : "Something important may be silently failing";

  if (northStar) {
    return (
      <section
        className={pt.sectionSurface}
        aria-label="Platform reliability"
        id="platform-reliability"
      >
        <div className={pt.panelHeader}>
          <p className={pt.sectionEyebrow}>Reliability pulse</p>
          <h2 className={`mt-0.5 ${pt.sectionTitle}`}>{headline}</h2>
          <p className={pt.sectionSubtitle}>
            Cron, payments, Stripe Connect, and platform configuration — no
            charts, just what needs fixing.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 lg:px-5">
          {reliability.pulse.map((item) => (
            <PulseItem key={item.id} item={item} northStar />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="admin-card admin-card-body"
      aria-label="Platform reliability"
      id="platform-reliability"
    >
      <h2 className="text-sm font-bold text-slate-900">{headline}</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Cron, payments, Stripe Connect, and platform configuration.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {reliability.pulse.map((item) => (
          <PulseItem key={item.id} item={item} northStar={false} />
        ))}
      </div>
    </section>
  );
}
