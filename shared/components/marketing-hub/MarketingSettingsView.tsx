"use client";

import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { StatusPill } from "@/shared/design-system/components";
import { MarketingConnectedAccountsCard } from "./MarketingConnectedAccountsCard";
import type { MarketingAutomationHealth } from "@/shared/types/marketing-workspace-state";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";

/**
 * The five things a founder sets, and nothing else.
 *
 * ==================== THE LIST IS THE POINT ====================
 * Daily automation on or off. What time it generates. The Facebook
 * connection. The Instagram connection. Brand and goals. That is the whole
 * surface. Anything else that looked like a setting — schedule rows, agent
 * tool grants, missed-run policies, bridge configuration — is either a
 * diagnostic (Advanced) or not a setting at all.
 *
 * ==================== WHY THERE IS NO TOGGLE HERE ====================
 * The daily schedule lives in the Agent Platform's own store, in another
 * process, on the machine that renders video. Altair OS has no table, no
 * migration and no server action that could change it, and this milestone is
 * explicitly a UI consolidation — no new automation logic.
 *
 * So this card shows the REAL state, from the platform's own report, and says
 * plainly where it is changed. A switch wired to nothing would have been the
 * exact failure mode this workspace was rebuilt to remove: a control that
 * looks like it works, flips, and changes nothing.
 *
 * ==================== AND WHY THE TIME IS A READING, NOT A FIELD ====================
 * "Generation time" is not stored anywhere in this repository either. What
 * exists is the next run the platform reported. That is shown, in the
 * company's time zone, with its cadence — and when nothing is scheduled the
 * card says so rather than showing a default someone might mistake for a
 * setting they had made.
 */

type MarketingSettingsViewProps = {
  automationHealth: MarketingAutomationHealth;
  connectedAccounts: MarketingConnectedAccount[];
  canManageConnectedAccounts: boolean;
  connectedAccountsFlash: { tone: "success" | "error"; message: string } | null;
  /** Brand & goals lives behind platform-admin. Do not offer a 403. */
  canOpenMarketingHq: boolean;
};

const CARD =
  "rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6";

export function MarketingSettingsView({
  automationHealth,
  connectedAccounts,
  canManageConnectedAccounts,
  connectedAccountsFlash,
  canOpenMarketingHq,
}: MarketingSettingsViewProps) {
  const timeZone = useCompanyTimezone();
  const nextRun = automationHealth.nextRunAtIso
    ? formatDateTimeInTimeZone(automationHealth.nextRunAtIso, timeZone, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const tone =
    automationHealth.state === "ON"
      ? "success"
      : automationHealth.state === "ONCE"
        ? "info"
        : automationHealth.state === "OFF"
          ? "neutral"
          : "warning";

  return (
    <div className="space-y-6">
      <section className={CARD}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-altair-ink">
            Daily video automation
          </h2>
          <StatusPill tone={tone} size="sm">
            {automationHealth.label}
          </StatusPill>
        </div>
        <p className="mt-2 text-sm text-altair-ink-muted">
          {automationHealth.detail}
        </p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-altair-ink-muted">
              Generation time
            </dt>
            <dd className="mt-0.5 text-sm text-altair-ink">
              {/* No default, no placeholder that could be read as a choice
                  somebody made. Either the platform reported a next run or
                  there is nothing to report. */}
              {nextRun ?? "Not scheduled"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-altair-ink-muted">
              Where it is changed
            </dt>
            <dd className="mt-0.5 text-sm text-altair-ink">
              The Agent Platform, on the machine that renders video. This
              workspace reads the schedule; it does not set it.
            </dd>
          </div>
        </dl>

        {automationHealth.attention.length > 0 ? (
          <ul className="mt-4 space-y-1 border-t border-[var(--north-star-plate-border)] pt-3">
            {automationHealth.attention.map((reason) => (
              <li key={reason} className="text-xs text-altair-danger">
                {reason}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Facebook and Instagram, both of them, once. This card is the single
          home for connected accounts in this product; the embedded hub view
          used to render a second copy of it inside Advanced. */}
      <MarketingConnectedAccountsCard
        accounts={connectedAccounts}
        northStar
        canManageConnectedAccounts={canManageConnectedAccounts}
        flashMessage={connectedAccountsFlash}
      />

      <section className={CARD}>
        <h2 className="text-lg font-semibold text-altair-ink">Brand &amp; goals</h2>
        <p className="mt-1 text-sm text-altair-ink-muted">
          Mission, audience, positioning, current goals, voice and tone,
          banned claims and the industry profile the AI writes from.
        </p>
        {canOpenMarketingHq ? (
          <a
            className="mt-3 inline-block text-sm font-medium text-altair-ink underline"
            href="/marketing/hq"
          >
            Edit in Marketing HQ →
          </a>
        ) : (
          // The route is platform-admin only. Linking everyone to a page that
          // rejects them is worse than saying who can open it.
          <p className="mt-3 text-sm text-altair-ink-muted italic">
            Editing brand and goals is limited to platform administrators.
          </p>
        )}
      </section>
    </div>
  );
}
