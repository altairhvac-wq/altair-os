"use client";

import Link from "next/link";
import { ArrowRight, Check, ListChecks, RotateCcw } from "lucide-react";
import { Toast, focusRing } from "@/shared/components/resources/tools/ToolControls";
import { INVOICE_BUILDER_PATH } from "@/shared/lib/resources/tool-hub";
import { useArticleTool } from "@/shared/components/site/article/useArticleTool";

/**
 * The checklist built into /insights/what-to-put-on-an-hvac-invoice: the
 * article's own list, item by item, to tick against the invoice you send
 * today. Every item restates a line of the article; nothing is added.
 * Nothing is stored or sent; the only signal is "tool used" with this
 * tool's id.
 */

const GROUPS: readonly { readonly id: string; readonly title: string; readonly items: readonly { readonly id: string; readonly text: string }[] }[] = [
  {
    id: "basics",
    title: "The basics",
    items: [
      { id: "company", text: "Your company name, address, phone number and email" },
      { id: "number", text: "The word \"Invoice\" and an invoice number, in order" },
      { id: "dates", text: "The invoice date and a due date" },
      { id: "customer", text: "Customer name, billing address and service address" },
      { id: "license", text: "Your contractor license number, if your state requires it" },
    ],
  },
  {
    id: "work",
    title: "The work and the equipment",
    items: [
      { id: "story", text: "The complaint, the cause and the fix, in plain words" },
      { id: "unit", text: "Make, model and serial of the unit, and where it is" },
      { id: "refrigerant", text: "Refrigerant type and amount, when refrigerant was involved" },
      { id: "parts", text: "Parts installed, with part numbers when you have them" },
    ],
  },
  {
    id: "lines",
    title: "Lines and totals",
    items: [
      { id: "labor", text: "Labor as hours times a rate, or a flat-rate task price" },
      { id: "materials", text: "Each part on its own line, with a quantity and a price" },
      { id: "fees", text: "Trip, diagnostic or after-hours charges, named as what they are" },
      { id: "discounts", text: "Discounts, such as a member discount, as their own line" },
      { id: "tax", text: "Which lines are taxable" },
      { id: "totals", text: "Subtotal, tax, total, payments made and the balance due" },
    ],
  },
  {
    id: "paying",
    title: "Getting paid",
    items: [
      { id: "how", text: "Exactly how to pay: a payment link, card, check payee or ACH" },
      { id: "terms", text: "Payment terms, and what happens after the due date" },
      { id: "warranty", text: "Your labor warranty and the parts warranty, with how long each lasts" },
      { id: "permit", text: "Permit numbers, when the job needed one" },
    ],
  },
];

const TOTAL = GROUPS.reduce((sum, group) => sum + group.items.length, 0);

export function InvoiceChecklistTool() {
  const tool = useArticleTool<readonly string[]>("invoice-checklist", []);
  const checked = new Set(tool.values);
  const count = checked.size;
  const share = count / TOTAL;
  const toggle = (id: string) => {
    tool.markInteracted();
    tool.setValues((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };
  const status =
    count === 0
      ? "Tick what your invoice shows today."
      : count === TOTAL
        ? "Every item from the checklist is on it."
        : `${TOTAL - count} item${TOTAL - count === 1 ? "" : "s"} missing. Each one is a question a customer may call to ask.`;

  return (
    <div onPointerDownCapture={tool.markInteracted} onKeyDownCapture={tool.markInteracted}>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_30px_80px_-55px_rgba(28,25,23,0.6)]">
        <div className="flex items-center justify-between gap-3 bg-[#0d0f0c] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30">
              <ListChecks aria-hidden="true" className="h-4.5 w-4.5 text-[#e8d9ac]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#fff9ea]">Invoice Checklist</p>
              <p className="text-[11px] text-[#a99f8f]">Check it against the invoice you send today. Nothing is saved or sent.</p>
            </div>
          </div>
          {count > 0 ? (
            <button
              type="button"
              onClick={() => {
                tool.setValues([]);
                tool.toast.show("Cleared.");
              }}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(230,227,220,0.18)] px-3 text-[12px] font-semibold text-[#f3ebdd] hover:border-[#c2a05a]/60 ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Clear
            </button>
          ) : null}
        </div>

        <div className="border-b border-stone-200 bg-stone-50/70 px-4 py-3.5 sm:px-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-stone-900" aria-live="polite">
              <span className="tabular-nums">{count}</span> of {TOTAL} on your invoice
            </p>
            <p className="text-xs tabular-nums text-stone-500">{Math.round(share * 100)}%</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
            <div className={`h-full rounded-full transition-[width] ${count === TOTAL ? "bg-emerald-600" : "bg-[#A4823A]"}`} style={{ width: `${share * 100}%` }} />
          </div>
          <p className="mt-2 text-[13px] text-stone-600">{status}</p>
        </div>

        <div className="grid gap-x-6 gap-y-5 px-4 py-5 sm:px-5 md:grid-cols-2">
          {GROUPS.map((group) => (
            <fieldset key={group.id} className="min-w-0">
              <legend className="text-[12px] font-semibold uppercase tracking-[0.12em] text-stone-500">{group.title}</legend>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const on = checked.has(item.id);
                  return (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-stone-50">
                        <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(item.id)} />
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#c2a05a]/55 ${
                            on ? "border-[#A4823A] bg-[#A4823A] text-[#080907]" : "border-stone-300 bg-white"
                          }`}
                        >
                          {on ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span className={`text-[14px] leading-snug ${on ? "text-stone-900" : "text-stone-700"}`}>{item.text}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-stone-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs leading-relaxed text-stone-500">The free Invoice Builder has a field for every item above, and prints or saves a PDF.</p>
          <Link
            href={INVOICE_BUILDER_PATH}
            data-track="next-tool-invoice-builder-checklist"
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0d0f0c] px-4 text-[13px] font-semibold text-[#f3ebdd] transition-colors hover:bg-[#1b1e18] ${focusRing}`}
          >
            Build one in the Invoice Builder
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <Toast message={tool.toast.message} />
    </div>
  );
}
