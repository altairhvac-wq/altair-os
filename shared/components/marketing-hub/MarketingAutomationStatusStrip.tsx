import { StatusPill } from "@/shared/design-system/components";
import type { MarketingAutomationHealth } from "@/shared/types/marketing-workspace-state";

/**
 * Three facts about the automation, in one line, above today's decision.
 *
 * ==================== WHAT THIS REPLACED ====================
 * The founder-facing view used to answer "is this thing running?" with a list
 * of every schedule the platform owns — names, job ids, cadences, next-run
 * timestamps, missed-run policies, due flags — and left the reader to work out
 * which of the rows was theirs. That list is real and it is still available;
 * it is now in Advanced, where a list of schedules belongs.
 *
 * What a founder needs before deciding on a video is whether tomorrow's video
 * is coming, when, and whether anything is broken. That is exactly three
 * facts, and they are what this renders.
 *
 * ==================== IT MAKES NO JUDGEMENTS OF ITS OWN ====================
 * Every string here comes from `deriveMarketingAutomationHealth`, which is
 * pure and tested. This component chooses a colour and a layout. If it ever
 * starts computing a status, the honesty guarantees move out of the tested
 * module and into JSX, which is where they stop being checked.
 */

type MarketingAutomationStatusStripProps = {
  health: MarketingAutomationHealth;
  /** Injected so the strip is a pure function of its props. */
  nextRunLabel: string | null;
};

export function MarketingAutomationStatusStrip({
  health,
  nextRunLabel,
}: MarketingAutomationStatusStripProps) {
  const tone =
    health.state === "ON"
      ? "success"
      : health.state === "ONCE"
        ? "info"
        : health.state === "OFF"
          ? "neutral"
          : "warning";

  return (
    <section className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 text-sm text-altair-ink">
          <span className="text-altair-ink-muted">Daily content:</span>
          <StatusPill tone={tone} size="sm">
            {health.label}
          </StatusPill>
        </span>

        {/* Shown only when a run is genuinely scheduled. An em dash next to
            "Next run" would read as a value; its absence reads as nothing to
            say, which is the truth when nothing is scheduled. */}
        {nextRunLabel ? (
          <span className="text-sm text-altair-ink">
            <span className="text-altair-ink-muted">Next run:</span>{" "}
            {nextRunLabel}
          </span>
        ) : null}

        {health.attention.length > 0 ? (
          <StatusPill tone="danger" size="sm">
            Needs attention
          </StatusPill>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-altair-ink-muted">{health.detail}</p>

      {health.attention.length > 0 ? (
        // Named, not counted. "3 issues" sends the reader to Advanced to find
        // out what they are; the sentences say it here.
        <ul className="mt-2 space-y-1">
          {health.attention.map((reason) => (
            <li key={reason} className="text-xs text-altair-danger">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
