import {
  calculateInvoiceTotals,
  depositRequestCents,
  formatCents,
  formatQty,
  parseCents,
  type InvoiceTotals,
} from "@/shared/lib/resources/invoice-builder";
import { DOC_WORDS, type DocKind } from "@/shared/components/resources/invoice/doc-words";
import { LINE_KIND_LABEL, QTY_UNIT, type InvoiceState } from "@/shared/components/resources/invoice/invoice-state";

/**
 * The printable invoice. One component for the live preview, the printed
 * page and the blank template (`blank`), so what the visitor sees is what
 * prints.
 */

export type ComputedInvoice = {
  readonly totals: InvoiceTotals;
  /** What the customer is asked to pay on this invoice. */
  readonly dueNowCents: number;
  readonly dueLabel: string;
  readonly requestCents: number;
  readonly remainingAfterCents: number;
};

export function computeInvoice(state: InvoiceState, doc: DocKind = "invoice"): ComputedInvoice {
  const totals = calculateInvoiceTotals({
    lines: state.lines,
    taxRate: state.taxRate,
    discountMode: state.discountMode,
    discount: state.discount,
    discountReducesTax: state.discountReducesTax,
    // Nothing has been paid on an estimate, whatever an old field holds.
    amountPaid: doc === "estimate" ? "" : state.amountPaid,
  });
  const open = Math.max(0, totals.totalCents - totals.paidCents);
  if (doc === "estimate") {
    if (state.kind !== "deposit") {
      return { totals, dueNowCents: totals.totalCents, dueLabel: "Estimate total", requestCents: totals.totalCents, remainingAfterCents: 0 };
    }
    const deposit = Math.min(depositRequestCents(totals.totalCents, state.depositPct), totals.totalCents);
    return { totals, dueNowCents: deposit, dueLabel: "Deposit to start", requestCents: deposit, remainingAfterCents: totals.totalCents - deposit };
  }
  if (state.kind === "standard") {
    return {
      totals,
      dueNowCents: totals.balanceCents,
      dueLabel: "Balance due",
      requestCents: totals.balanceCents,
      remainingAfterCents: 0,
    };
  }
  const request = depositRequestCents(totals.totalCents, state.depositPct);
  const dueNow = Math.min(request, open);
  return {
    totals,
    dueNowCents: dueNow,
    dueLabel: state.kind === "deposit" ? "Deposit due now" : "Due on this invoice",
    requestCents: request,
    remainingAfterCents: open - dueNow,
  };
}

function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** A value, or a placeholder hint on screen and a blank rule in print. */
function V({ value, hint, blank, wide }: { readonly value: string; readonly hint: string; readonly blank: boolean; readonly wide?: boolean }) {
  if (!blank && value.trim()) return <>{value}</>;
  if (blank) {
    const label = hint && hint !== "—" ? hint : null;
    return (
      <span className={`inline-flex items-end gap-1.5 align-bottom ${wide ? "w-full" : ""}`}>
        {label ? <span className="whitespace-nowrap text-[9px] uppercase tracking-wide text-stone-500">{label}</span> : null}
        <span className={`inline-block border-b border-stone-400 ${wide ? "flex-1" : "w-28"}`}>&nbsp;</span>
      </span>
    );
  }
  return <span className="text-stone-400 print:text-transparent">{hint}</span>;
}

export function InvoicePaper({
  state,
  computed,
  blank = false,
  doc = "invoice",
}: {
  readonly state: InvoiceState;
  readonly computed: ComputedInvoice;
  readonly blank?: boolean;
  /** Which document the paper is: the words change, the layout and the math do not. */
  readonly doc?: DocKind;
}) {
  const { totals } = computed;
  const w = DOC_WORDS[doc];
  const estimate = doc === "estimate";
  const lines = blank ? [] : state.lines.filter((line) => line.description.trim() || parseCents(line.price) !== 0);
  const hasEquipment = blank || [state.equipmentType, state.make, state.model, state.serial, state.location, state.refrigerantType, state.lbsAdded, state.lbsRecovered].some((v) => v.trim());
  const hasWork = blank || [state.complaint, state.cause, state.correction].some((v) => v.trim());
  const pct = state.taxRate.trim() || "0";

  return (
    <article
      aria-label={estimate ? "Estimate preview" : "Invoice preview"}
      className="mx-auto w-full max-w-[720px] rounded-md bg-white px-6 py-7 text-[12px] leading-relaxed text-stone-800 shadow-[0_20px_50px_-28px_rgba(28,25,23,0.45)] ring-1 ring-stone-200 sm:px-9 sm:py-9 print:max-w-none print:rounded-none print:px-0 print:py-0 print:text-[11px] print:shadow-none print:ring-0"
    >
      {/* header */}
      <header className="flex flex-col gap-5 border-b-2 border-stone-900 pb-5 sm:flex-row sm:items-start sm:justify-between print:flex-row">
        <div className="min-w-0">
          <p className="text-[18px] font-semibold leading-tight text-stone-900">
            <V value={state.companyName} hint="Your company name" blank={blank} />
          </p>
          <p className="mt-1 text-stone-600"><V value={state.companyAddress} hint="Address" blank={blank} /></p>
          <p className="text-stone-600">
            <V value={state.companyPhone} hint="Phone" blank={blank} />
            {" · "}
            <V value={state.companyEmail} hint="Email" blank={blank} />
          </p>
          {blank || state.companyLicense ? (
            <p className="text-stone-600">License no. <V value={state.companyLicense} hint="" blank={blank} /></p>
          ) : null}
        </div>
        <div className="shrink-0 sm:text-right print:text-right">
          <p className="text-[22px] font-semibold uppercase tracking-[0.12em] text-[#77591B] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">{w.paperTitle[state.kind]}</p>
          <dl className="mt-2 grid grid-cols-[auto_auto] justify-start gap-x-4 gap-y-0.5 sm:justify-end print:justify-end">
            <dt className="text-stone-500">{w.paperNumber}</dt>
            <dd className="font-semibold text-stone-900"><V value={state.number} hint="—" blank={blank} /></dd>
            <dt className="text-stone-500">Date</dt>
            <dd className="text-stone-900"><V value={formatDate(state.date)} hint="—" blank={blank} /></dd>
            <dt className="text-stone-500">{w.paperDue}</dt>
            <dd className="text-stone-900"><V value={formatDate(state.dueDate)} hint="—" blank={blank} /></dd>
            {blank || state.poNumber ? (
              <>
                <dt className="text-stone-500">PO</dt>
                <dd className="text-stone-900"><V value={state.poNumber} hint="" blank={blank} /></dd>
              </>
            ) : null}
          </dl>
        </div>
      </header>

      {/* parties */}
      <section className="grid gap-5 border-b border-stone-200 py-5 sm:grid-cols-2 print:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{w.paperParty}</p>
          <p className="mt-1 font-semibold text-stone-900"><V value={state.customerName} hint="Customer name" blank={blank} wide /></p>
          <p><V value={state.customerAddress} hint="Billing address" blank={blank} wide /></p>
          <p>
            <V value={state.customerPhone} hint="Phone" blank={blank} />
            {state.customerEmail || blank ? <> · <V value={state.customerEmail} hint="" blank={blank} /></> : null}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Service address</p>
          <p className="mt-1">{blank ? <V value="" hint="" blank wide /> : state.serviceAddress.trim() || <span className="text-stone-500">Same as billing</span>}</p>
          {blank || state.technician ? (
            <p className="mt-2 text-stone-600">Technician: <V value={state.technician} hint="" blank={blank} /></p>
          ) : null}
        </div>
      </section>

      {/* equipment */}
      {hasEquipment ? (
        <section className="border-b border-stone-200 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{w.paperEquipment}</p>
          <p className="mt-1 font-medium text-stone-900"><V value={state.equipmentType} hint="Equipment" blank={blank} wide /></p>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 print:grid-cols-4">
            {[
              ["Make", state.make],
              ["Model", state.model],
              ["Serial", state.serial],
              ["Location", state.location],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] text-stone-500">{label}</dt>
                <dd className="truncate text-stone-900"><V value={value} hint="—" blank={blank} /></dd>
              </div>
            ))}
          </dl>
          {blank || state.refrigerantType || state.lbsAdded || state.lbsRecovered ? (
            <p className="mt-2 text-stone-700">
              Refrigerant: <span className="font-semibold text-stone-900"><V value={state.refrigerantType} hint="type" blank={blank} /></span>
              {blank || state.lbsAdded ? <> · added <V value={state.lbsAdded ? `${formatQty(state.lbsAdded)} lb` : ""} hint="" blank={blank} /></> : null}
              {blank || state.lbsRecovered ? <> · recovered <V value={state.lbsRecovered ? `${formatQty(state.lbsRecovered)} lb` : ""} hint="" blank={blank} /></> : null}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* work performed */}
      {hasWork ? (
        <section className="border-b border-stone-200 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{w.paperWork}</p>
          <dl className="mt-1.5 space-y-1">
            {[
              [w.work[0].label, state.complaint],
              [w.work[1].label, state.cause],
              [w.work[2].label, state.correction],
            ].map(([label, value]) => (
              // The estimate's labels are longer, so each sits above its text instead of beside it.
              <div key={label} className={estimate ? "grid gap-0.5" : "grid grid-cols-[84px_minmax(0,1fr)] gap-2"}>
                <dt className="font-semibold text-stone-900">{label}</dt>
                <dd className="whitespace-pre-line"><V value={value} hint="—" blank={blank} wide /></dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* line items */}
      <section className="py-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-300 text-[10px] uppercase tracking-[0.1em] text-stone-500">
              <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Description</th>
              <th scope="col" className="px-2 py-1.5 text-right font-semibold">Qty</th>
              <th scope="col" className="px-2 py-1.5 text-right font-semibold">Rate</th>
              <th scope="col" className="py-1.5 pl-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {blank
              ? Array.from({ length: 7 }, (_, i) => (
                  <tr key={i} className="border-b border-stone-200">
                    <td className="h-7 py-1 pr-2">&nbsp;</td>
                    <td className="px-2" />
                    <td className="px-2" />
                    <td className="pl-2" />
                  </tr>
                ))
              : null}
            {!blank && lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-stone-400 print:text-transparent">
                  Line items appear here as you add them.
                </td>
              </tr>
            ) : null}
            {lines.map((line) => {
              const index = state.lines.indexOf(line);
              return (
                <tr key={line.id} className="border-b border-stone-100 align-top">
                  <td className="py-1.5 pr-2">
                    <span className="text-stone-900">{line.description || LINE_KIND_LABEL[line.kind]}</span>
                    <span className="block text-[10px] text-stone-500">
                      {LINE_KIND_LABEL[line.kind]}
                      {line.partNumber ? ` · Part no. ${line.partNumber}` : ""}
                      {line.taxable ? " · Taxable" : ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                    {formatQty(line.qty)} {QTY_UNIT[line.kind] === "qty" ? "" : QTY_UNIT[line.kind]}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{formatCents(parseCents(line.price))}</td>
                  <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums text-stone-900">{formatCents(totals.lineCents[index] ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* totals */}
        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-[290px] space-y-1 tabular-nums">
            <TotalRow label="Subtotal" value={blank ? "" : formatCents(totals.subtotalCents)} />
            {blank || totals.discountCents > 0 ? (
              <TotalRow
                label={state.discountMode === "percent" && !blank ? `Discount (${state.discount}%)` : "Discount"}
                value={blank ? "" : `-${formatCents(totals.discountCents)}`}
              />
            ) : null}
            <TotalRow
              label={blank ? "Tax (___%)" : `Tax ${pct}% on ${formatCents(totals.taxBaseCents)}`}
              value={blank ? "" : formatCents(totals.taxCents)}
            />
            <TotalRow label="Total" value={blank ? "" : formatCents(totals.totalCents)} strong />
            {!estimate && (blank || totals.paidCents > 0) ? (
              <TotalRow label={state.kind === "standard" ? "Paid" : "Previously paid"} value={blank ? "" : `-${formatCents(totals.paidCents)}`} />
            ) : null}
            {!blank && state.kind !== "standard" ? (
              <TotalRow label={`${state.kind === "deposit" ? "Deposit" : "This invoice"} (${state.depositPct || 0}% of total)`} value={formatCents(computed.requestCents)} />
            ) : null}
            <div className="mt-2 flex items-center justify-between rounded-md bg-stone-900 px-3 py-2 text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em]">{blank ? w.blankDueLabel : computed.dueLabel}</dt>
              <dd className="text-[15px] font-semibold">{blank ? "" : formatCents(computed.dueNowCents)}</dd>
            </div>
            {!blank && state.kind !== "standard" ? (
              <div className="pt-1 text-right text-[10px] text-stone-500">
                <dt className="inline">{estimate ? "Balance when the work is done: " : "Remaining after this payment: "}</dt>
                <dd className="inline">{formatCents(computed.remainingAfterCents)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      {/* terms */}
      <footer className="grid gap-4 border-t border-stone-200 pt-4 sm:grid-cols-2 print:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{w.paperPay}</p>
            <p className="whitespace-pre-line"><V value={state.paymentInstructions} hint="Methods" blank={blank} wide /></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{w.paperTerms}</p>
            <p><V value={state.terms} hint={w.paperTermsHint} blank={blank} /></p>
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Warranty</p>
            <p><V value={state.warranty} hint="Labor and parts" blank={blank} wide /></p>
          </div>
          {blank || state.permit || state.inspection ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Permit</p>
              <p>
                No. <V value={state.permit} hint="—" blank={blank} />
                {blank || state.inspection ? <> · Inspection: <V value={state.inspection} hint="" blank={blank} /></> : null}
              </p>
            </div>
          ) : null}
        </div>
        {!blank && state.notes.trim() ? <p className="whitespace-pre-line text-stone-700 sm:col-span-2 print:col-span-2">{state.notes}</p> : null}
        <div className="mt-2 grid grid-cols-2 gap-6 sm:col-span-2 print:col-span-2">
          <p className="border-t border-stone-400 pt-1 text-[10px] text-stone-500">{w.paperSignature}</p>
          <p className="border-t border-stone-400 pt-1 text-[10px] text-stone-500">Date</p>
        </div>
        <p className="text-center text-stone-600 sm:col-span-2 print:col-span-2">{w.paperClosing}</p>
      </footer>
    </article>
  );
}

function TotalRow({ label, value, strong }: { readonly label: string; readonly value: string; readonly strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "border-t border-stone-300 pt-1.5 font-semibold text-stone-900" : "text-stone-700"}`}>
      <dt>{label}</dt>
      <dd className={value ? "" : "inline-block w-24 border-b border-stone-400"}>{value || " "}</dd>
    </div>
  );
}
