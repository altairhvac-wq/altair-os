import { Gift, TimerReset } from "lucide-react";
import type { PlatformTrialSignals } from "@/shared/types/platform-admin";

type PlatformTrialSignalsCardProps = {
  trials: PlatformTrialSignals;
  /** Which shell the card sits in; picks the matching surface classes. */
  variant: "legacy" | "north-star";
};

const STYLES = {
  legacy: {
    card: "admin-metric-card",
    label: "admin-metric-label",
    value: "admin-metric-value mt-1 sm:text-2xl",
    subValue: "text-lg font-bold tabular-nums text-slate-900 sm:text-xl",
    subLabel: "text-[11px] font-medium uppercase tracking-wide text-slate-500",
    hint: "mt-2 text-xs text-slate-500",
    icon: "admin-metric-icon admin-metric-icon-teal",
  },
  "north-star": {
    card:
      "rounded-xl border border-[rgba(119,89,27,0.16)] bg-[#FFFCF5] p-3 sm:p-3.5",
    label:
      "text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6E6252]",
    value: "mt-1 text-lg font-bold tabular-nums text-[#17130E] sm:text-xl",
    subValue: "text-lg font-bold tabular-nums text-[#17130E] sm:text-xl",
    subLabel:
      "text-[11px] font-medium uppercase tracking-wide text-[#8A7B64]",
    hint: "mt-2 text-xs text-[#6E6252]",
    icon: "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3EAD8] text-[#7A5A14]",
  },
} as const;

/**
 * Trial activity for the owner: a run of trial starts, or a run of repeat
 * sign-ups being turned away, is the first sign someone is farming free
 * trials. Numbers come from company_subscriptions via the overview service,
 * which runs behind requirePlatformAdmin.
 */
export function PlatformTrialSignalsCard({
  trials,
  variant,
}: PlatformTrialSignalsCardProps) {
  const styles = STYLES[variant];

  const windows = [
    { label: "24 h", value: trials.startedLast24h },
    { label: "7 d", value: trials.startedLast7d },
    { label: "30 d", value: trials.startedLast30d },
  ];

  return (
    <>
      <div className={`${styles.card} col-span-2`} data-testid="platform-trial-starts">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={styles.label}>Trials started</p>
            <dl className="mt-1 grid grid-cols-3 gap-3">
              {windows.map((window) => (
                <div key={window.label}>
                  <dd className={styles.subValue}>
                    {window.value.toLocaleString()}
                  </dd>
                  <dt className={styles.subLabel}>{window.label}</dt>
                </div>
              ))}
            </dl>
            <p className={styles.hint}>
              Rolling windows.{" "}
              {trials.withheldLast30d > 0
                ? `${trials.withheldLast30d.toLocaleString()} repeat sign-up${trials.withheldLast30d === 1 ? "" : "s"} started without a trial in the last 30 d.`
                : "No repeat sign-ups turned away in the last 30 d."}
            </p>
          </div>
          <div className={styles.icon}>
            <TimerReset className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className={styles.card} data-testid="platform-comped-companies">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={styles.label}>Comped companies</p>
            <p className={styles.value}>
              {trials.compedCompanies.toLocaleString()}
            </p>
          </div>
          <div className={styles.icon}>
            <Gift className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </div>
    </>
  );
}
