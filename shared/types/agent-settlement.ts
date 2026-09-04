/**
 * What actually happened when the bridge tried to settle a queue row.
 *
 * ============ WHY "OK" WAS NOT ENOUGH ============
 * Every settle on this bridge is a guarded UPDATE — guarded so a terminal row
 * can never be rewritten. A guarded UPDATE that matches nothing is not an
 * error at the database level: it succeeds, having changed nothing. Reporting
 * that as success told the platform its outcome had landed when the row was
 * still queued, or did not exist at all. The bug it hid is the worst kind:
 * silent, one-sided, and only visible as work that quietly never finished.
 *
 * These three outcomes are the whole vocabulary, and they are distinct
 * because the caller must act differently on each:
 *
 *   settled          this call performed the transition. Done.
 *   already_settled  the row exists but was already terminal. A replay — the
 *                    delivery succeeded earlier, so the caller must STOP
 *                    retrying, exactly as it would on `settled`.
 *   not_found        no such row for this company. A correlation break: the
 *                    caller believes in a row the control plane does not
 *                    have. Retrying cannot fix it, so it must be surfaced
 *                    rather than swallowed.
 *
 * `already_settled` is deliberately NOT an error. Idempotent replay is the
 * pull protocol working as designed; treating it as failure would make every
 * recovered delivery look like a fault.
 */

export const SETTLEMENT_OUTCOMES = [
  "settled",
  "already_settled",
  "not_found",
] as const;

export type SettlementOutcome = (typeof SETTLEMENT_OUTCOMES)[number];

export function isSettlementOutcome(
  value: unknown,
): value is SettlementOutcome {
  return (
    typeof value === "string" &&
    (SETTLEMENT_OUTCOMES as readonly string[]).includes(value)
  );
}

/**
 * Whether the caller should consider the row delivered and stop retrying.
 *
 * True for both `settled` and `already_settled`: the row is terminal either
 * way. False only for `not_found`, which no amount of retrying will change
 * and which therefore has to reach a human.
 */
export function isDelivered(outcome: SettlementOutcome): boolean {
  return outcome === "settled" || outcome === "already_settled";
}

/** The HTTP status a bridge route answers with for each outcome. */
export function settlementHttpStatus(outcome: SettlementOutcome): number {
  return outcome === "not_found" ? 404 : 200;
}
