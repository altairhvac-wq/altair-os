"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { repricePriceBookAction } from "@/app/actions/business-numbers";
import type { RatePricedItem } from "@/lib/database/queries/business-setup";
import { SettingsWorkspaceSection } from "@/shared/components/settings/SettingsWorkspacePage";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { formatCount, formatDollarsShort } from "@/shared/lib/business-numbers/format";

/**
 * Shown on Settings > Numbers when price book items the setup priced no
 * longer match the company's numbers: the labor rate has changed since, or
 * a job's own hours, part cost or markup has.
 *
 * ============ NOTHING CHANGES BEHIND THE OWNER'S BACK ============
 * Every item is listed, all of them, with the price it has now and the
 * price the numbers give, and nothing is touched until the owner presses
 * the button. The new prices are worked out again on the server from the
 * stored numbers; what this card shows is sent along only so the server can
 * refuse if the list has changed since (another tab saved a different
 * rate). Jobs the owner priced by hand are never listed, and estimates and
 * invoices already written keep the price they were written with (their
 * lines hold their own prices).
 */

/** The DOM id of this card, so the page can bring it on screen and link to it. */
export const PRICE_BOOK_REPRICE_ID = "price-book";

type PriceBookRepriceCardProps = {
  readonly companyId: string;
  readonly items: readonly RatePricedItem[];
  /** Called with what is out of date after an attempt, and how many prices were changed. */
  readonly onUpdated: (remaining: RatePricedItem[], updated: number) => void;
};

export function PriceBookRepriceCard({ companyId, items, onUpdated }: PriceBookRepriceCardProps) {
  const [problem, setProblem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) return null;

  const count = items.length;
  const jobs = `${formatCount(count)} ${count === 1 ? "item" : "items"}`;

  function update() {
    if (isPending) return;
    startTransition(async () => {
      try {
        const result = await repricePriceBookAction(
          companyId,
          items.map((item) => ({ id: item.id, newPrice: item.newPrice })),
        );
        if (result.changedSince) {
          setProblem("Your numbers changed after this list was made, so nothing was updated. The list below is how things stand now. Check it, then press the button again.");
          onUpdated(result.outOfDate ?? [], 0);
          return;
        }
        if (result.error) {
          setProblem(result.updated ? `${result.error} ${result.updated} of the prices were updated before that; the list below shows what is left.` : result.error);
          if (result.outOfDate) onUpdated(result.outOfDate, 0);
          return;
        }
        setProblem(null);
        onUpdated(result.outOfDate ?? [], result.updated ?? 0);
      } catch {
        // The request went out but no answer came back, so it is not known whether the prices changed.
        setProblem("No answer came back, so it is not certain whether the prices were updated. Reload this page to see where things stand.");
      }
    });
  }

  return (
    <SettingsWorkspaceSection
      id={PRICE_BOOK_REPRICE_ID}
      title={`${jobs} in your price book no longer ${count === 1 ? "matches" : "match"} your numbers`}
      description="These are priced from your labor rate. Since they were priced, your rate has changed, or a job's own hours or part cost has. Every one is listed here with its price now and the price your numbers give. Nothing changes until you press the button. Jobs you priced by hand are not on this list, and estimates and invoices you have already written keep their prices."
      className="border-[rgba(180,120,20,0.3)]"
    >
      <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-altair-border">
        <table className="w-full text-sm">
          <caption className="sr-only">Price book items that no longer match your numbers, with each one&apos;s price now and its new price</caption>
          <thead className="sticky top-0 bg-altair-paper-subtle text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-altair-ink-on-paper-muted">
            <tr>
              <th scope="col" className="px-3 py-2">
                Item
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Now
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                New
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-altair-border">
            {items.map((item) => (
              <tr key={item.id}>
                <th scope="row" className="min-w-0 px-3 py-2 text-left font-normal text-altair-ink-on-paper">
                  {item.name}
                </th>
                <td className="px-3 py-2 text-right tabular-nums text-altair-ink-on-paper-secondary">{formatDollarsShort(item.currentPrice)}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-altair-ink-on-paper">{formatDollarsShort(item.newPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" disabled={isPending} onClick={update} className={buttonClassName("primary", "md", "w-full sm:w-auto")}>
          {isPending ? "Updating…" : `Update ${count === 1 ? "this price" : `these ${formatCount(count)} prices`}`}
        </button>
        <Link href="/price-book" className="flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline sm:min-h-0">
          Open your price book
        </Link>
      </div>
      {problem ? (
        <p role="alert" className="mt-2 text-[13px] leading-snug text-[#991B1B]">
          {problem}
        </p>
      ) : null}
    </SettingsWorkspaceSection>
  );
}
