/**
 * Donut chart arc geometry for the Reports chart cards.
 *
 * ==================== WHY THIS EXISTS ====================
 * Three chart cards (Cash Health, Receivables Aging, Top Revenue Sources) each
 * drew their donut by declaring `let cumulative = 0` in the component body and
 * reassigning it from inside the `items.map()` callback that produced the SVG
 * arcs. That is a mutation performed during render, which the React Compiler
 * correctly rejects (`react-hooks/immutability`): the callback is not
 * guaranteed to run exactly once per render, and a discarded render still
 * advances the accumulator.
 *
 * The arithmetic was identical in all three, so it moves here as a pure
 * function that takes the values and returns finished geometry. Render becomes
 * a plain read of an array.
 *
 * ==================== BEHAVIOR IS UNCHANGED ====================
 * Same constants, same order, same skip rule (non-positive value, or a
 * non-positive total, contributes nothing and advances nothing), same
 * stroke-dash math. A segment that is skipped still occupies its index so
 * callers can zip the result back onto their own typed segment list.
 */

export const DONUT_SIZE = 148;
export const DONUT_STROKE = 18;
export const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
export const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export type DonutArc = {
  /** Length of the drawn stroke, in user units. */
  dash: number;
  /** Length of the gap that closes the circle. */
  gap: number;
  /** Negative offset that rotates this arc to follow the previous one. */
  offset: number;
};

/**
 * Arc geometry for each value, in order. A value at or below zero — or any
 * value when `total` is at or below zero — yields `null` at that index and
 * does not advance the accumulator, matching the previous inline behavior.
 */
export function buildDonutArcs(
  values: readonly number[],
  total: number,
): (DonutArc | null)[] {
  let cumulative = 0;

  return values.map((value) => {
    if (value <= 0 || total <= 0) {
      return null;
    }

    const fraction = value / total;
    const dash = fraction * DONUT_CIRCUMFERENCE;
    const arc: DonutArc = {
      dash,
      gap: DONUT_CIRCUMFERENCE - dash,
      offset: -cumulative * DONUT_CIRCUMFERENCE,
    };

    cumulative += fraction;
    return arc;
  });
}
