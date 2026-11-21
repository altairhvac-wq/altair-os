import {
  AGREEMENT_CHECKLIST,
  AGREEMENT_DISCLAIMER,
  AGREEMENT_SECTIONS,
  CHECKLIST_SECTIONS,
  ESTIMATE_BLANK,
  ESTIMATE_EXAMPLE,
  ESTIMATE_TERMS_HINTS,
  WORKSHEET_NOTES,
  WORKSHEET_ROWS,
  estimateTotals,
  pricingWorksheetExample,
} from "@/shared/lib/resources/templates";

/**
 * The four templates as printable pages: the same content as the Excel and
 * Word files (shared/lib/resources/templates.ts), laid out as a letter-size
 * sheet. Shown scaled as a preview on /resources/templates and printed (or
 * saved as PDF) at full size.
 */

export type SheetVariant = "blank" | "example";

const exact = "[print-color-adjust:exact] [-webkit-print-color-adjust:exact]";
const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (fraction: number) => `${(fraction * 100).toFixed(1).replace(/\.0$/, "")}%`;

function Paper({ title, kicker, children }: { readonly title: string; readonly kicker: string; readonly children: React.ReactNode }) {
  return (
    <article className="w-[816px] bg-white px-14 py-12 text-[13px] leading-snug text-stone-800 print:w-full print:px-0 print:py-0">
      <header className="flex items-end justify-between gap-6 border-b-2 border-[#C2A05A] pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77591B]">{kicker}</p>
          <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-[#0A0A0A]">{title}</h2>
        </div>
      </header>
      <div className="mt-5">{children}</div>
      <footer className="mt-8 border-t border-stone-200 pt-2 text-[10px] text-stone-500">Free template from altair-op.com/resources/templates</footer>
    </article>
  );
}

function Line({ value, wide }: { readonly value?: string; readonly wide?: boolean }) {
  return (
    <span className={`block min-h-[22px] border-b border-stone-400 px-1 pb-0.5 text-[13px] text-stone-900 ${wide ? "w-full" : ""}`}>
      {value || " "}
    </span>
  );
}

function Label({ children }: { readonly children: React.ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">{children}</span>;
}

/* ------------------------------------------------------------ estimate */

export function EstimateSheet({ variant }: { readonly variant: SheetVariant }) {
  const doc = variant === "example" ? ESTIMATE_EXAMPLE : ESTIMATE_BLANK;
  const totals = estimateTotals(doc);
  const example = variant === "example";
  // Blank: room for eight lines. Example: its lines plus one spare, so it prints on one page.
  const rows = Array.from({ length: example ? doc.lines.length + 1 : 8 }, (_, i) => doc.lines[i]);
  return (
    <Paper title="Estimate" kicker={example ? "Filled-in example · sample business and prices" : "HVAC estimate template"}>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <Label>From</Label>
          <dl className="mt-1 space-y-1.5">
            {doc.company.map((row) => (
              <div key={row.label} className="grid grid-cols-[80px_1fr] items-end gap-2">
                <dt className="text-[11px] text-stone-500">{row.label}</dt>
                <dd><Line value={row.value} /></dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <Label>Estimate</Label>
          <dl className="mt-1 space-y-1.5">
            {doc.details.map((row) => (
              <div key={row.label} className="grid grid-cols-[90px_1fr] items-end gap-2">
                <dt className="text-[11px] text-stone-500">{row.label}</dt>
                <dd><Line value={row.value} /></dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="mt-5">
        <Label>Customer</Label>
        <dl className="mt-1 grid grid-cols-2 gap-x-8 gap-y-1.5">
          {doc.customer.map((row) => (
            <div key={row.label} className={`grid grid-cols-[110px_1fr] items-end gap-2 ${row.label === "Service address" || row.label === "Equipment on site" ? "col-span-2" : ""}`}>
              <dt className="text-[11px] text-stone-500">{row.label}</dt>
              <dd><Line value={row.value} /></dd>
            </div>
          ))}
        </dl>
      </div>
      <table className="mt-6 w-full border-collapse text-[12px]">
        <thead>
          <tr className={`bg-stone-100 text-left text-[10px] uppercase tracking-wide text-stone-600 ${exact}`}>
            <th className="px-2 py-1.5 font-semibold">Section</th>
            <th className="px-2 py-1.5 font-semibold">Item and description</th>
            <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
            <th className="px-2 py-1.5 font-semibold">Unit</th>
            <th className="px-2 py-1.5 text-right font-semibold">Unit price</th>
            <th className="px-2 py-1.5 text-right font-semibold">Line total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((line, index) => (
            <tr key={index} className="h-[30px] border-b border-stone-200 align-top">
              <td className="px-2 py-1.5">{line?.section}</td>
              <td className="px-2 py-1.5">
                {line ? (
                  <>
                    <span className="font-semibold text-stone-900">{line.item}</span>
                    <span className="block text-[11px] text-stone-600">{line.description}</span>
                  </>
                ) : null}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{line?.qty ?? ""}</td>
              <td className="px-2 py-1.5">{line?.unit}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{line?.unitPrice != null ? usd(line.unitPrice) : ""}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{line && line.qty != null && line.unitPrice != null ? usd(line.qty * line.unitPrice) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex justify-end">
        <dl className="w-64 space-y-1 text-[12px]">
          {[
            ["Subtotal", example ? usd(totals.subtotal) : ""],
            ["Discount", example ? usd(totals.discount) : ""],
            ["Sales tax (your local rate)", ""],
          ].map(([label, value]) => (
            <div key={label} className="flex items-end justify-between gap-3">
              <dt className="text-stone-600">{label}</dt>
              <dd className="w-28 border-b border-stone-300 text-right tabular-nums">{value || " "}</dd>
            </div>
          ))}
          <div className={`flex items-center justify-between gap-3 bg-stone-100 px-2 py-1.5 font-semibold text-stone-900 ${exact}`}>
            <dt>Total</dt>
            <dd className="tabular-nums">{example ? `${usd(totals.total)} + tax` : " "}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
        {doc.terms.map((term) => (
          <div key={term.label}>
            <Label>{term.label}</Label>
            {term.text ? (
              <p className="mt-1 text-[12px] leading-relaxed text-stone-800">{term.text}</p>
            ) : (
              <>
                <p className="mt-0.5 text-[10.5px] italic text-stone-400">{ESTIMATE_TERMS_HINTS[term.label]}</p>
                <Line />
                <Line />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-7 grid grid-cols-[1fr_180px] gap-8">
        <div>
          <Line />
          <p className="mt-1 text-[10px] text-stone-500">Customer approval: signature</p>
        </div>
        <div>
          <Line />
          <p className="mt-1 text-[10px] text-stone-500">Date</p>
        </div>
      </div>
      <p className="mt-5 text-[10px] leading-relaxed text-stone-500">
        This is a template, not a contract. Have your own terms reviewed by an attorney in your state. Example prices are placeholders, not industry figures.
      </p>
    </Paper>
  );
}

/* --------------------------------------------------- pricing worksheet */

const FIRST_OF_STEP = new Set(WORKSHEET_ROWS.filter((row, i) => i === 0 || WORKSHEET_ROWS[i - 1].step !== row.step).map((row) => row.key));

export function WorksheetSheet({ variant }: { readonly variant: SheetVariant }) {
  const ex = pricingWorksheetExample();
  const example = variant === "example";
  const show = (key: keyof typeof ex, unit: "$" | "%" | "hrs") => (unit === "$" ? usd(ex[key]) : unit === "%" ? pct(ex[key]) : `${ex[key]} hrs`);
  return (
    <Paper title="Pricing worksheet" kicker={example ? "Filled-in example · the condenser fan motor repair" : "Build one price from cost up"}>
      <p className="text-[12px] text-stone-600">
        {example
          ? "3 hours on the job and $213 of parts (the fan motor and capacitor from the estimate example). Sample numbers, not industry figures."
          : "Fill in the shaded lines for a job you price often, work down the page, and compare the price with what you charge today."}
      </p>
      <table className="mt-4 w-full border-collapse text-[12px]">
        <thead>
          <tr className={`bg-stone-100 text-left text-[10px] uppercase tracking-wide text-stone-600 ${exact}`}>
            <th className="px-2 py-1.5 font-semibold">Line</th>
            <th className="px-2 py-1.5 font-semibold">How it is worked out</th>
            <th className="w-32 px-2 py-1.5 text-right font-semibold">{example ? "This job" : "Your numbers"}</th>
          </tr>
        </thead>
        <tbody>
          {WORKSHEET_ROWS.map((row) => {
            const header = FIRST_OF_STEP.has(row.key) ? row.step : null;
            return [
              header ? (
                <tr key={`${row.key}-h`}>
                  <td colSpan={3} className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
                    {header}
                  </td>
                </tr>
              ) : null,
              <tr key={row.key} className={`border-b border-stone-200 ${row.key === "price" ? "font-semibold text-stone-900" : ""}`}>
                <td className="px-2 py-1.5">{row.line}</td>
                <td className="px-2 py-1.5 text-[11px] text-stone-500">{row.how ?? (row.input ? "your number" : "")}</td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${row.input ? `bg-amber-50/80 ${exact}` : ""}`}>{example ? show(row.key, row.unit) : " "}</td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
      {example ? (
        <p className="mt-3 rounded bg-stone-100 px-3 py-2 text-[11.5px] text-stone-700">
          Check: {usd(ex.directCost)} direct + {usd(ex.overheadDollars)} overhead + {usd(ex.marginDollars)} profit = {usd(ex.price)}.
        </p>
      ) : null}
      <ul className="mt-4 list-disc space-y-1 pl-4 text-[10.5px] leading-relaxed text-stone-500">
        {WORKSHEET_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </Paper>
  );
}

/* ---------------------------------------------------------- agreement */

export function AgreementSheet({ variant }: { readonly variant: SheetVariant }) {
  const example = variant === "example";
  return (
    <Paper title="Maintenance agreement outline" kicker={example ? "Filled-in example · sample two-visit HVAC plan" : "An outline for your attorney, not a contract"}>
      <p className={`rounded border-l-4 border-[#C2A05A] bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-stone-700 ${exact}`}>{AGREEMENT_DISCLAIMER}</p>
      {example ? <p className="mt-2 text-[11px] italic text-stone-500">The business, customer, prices and terms below are made up to show how a finished outline reads.</p> : null}
      <ol className="mt-4 space-y-3.5">
        {AGREEMENT_SECTIONS.map((section, index) => (
          <li key={section.title} className="break-inside-avoid">
            <h3 className="border-b border-stone-200 pb-0.5 text-[14px] font-semibold text-[#0A0A0A]">
              {index + 1}. {section.title}
            </h3>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12px] leading-relaxed marker:text-[#A4823A]">
              {(example ? section.example : section.decide).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {example ? null : (
              <div className="mt-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Our answer</span>
                <Line />
                <Line />
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-5 break-inside-avoid">
        <h3 className="text-[13px] font-semibold text-[#0A0A0A]">Before you use your version</h3>
        <ul className="mt-1.5 space-y-1 text-[12px]">
          {AGREEMENT_CHECKLIST.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border border-stone-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Paper>
  );
}

/* ---------------------------------------------------------- checklist */

export function ChecklistSheet({ variant }: { readonly variant: SheetVariant }) {
  const example = variant === "example";
  return (
    <Paper title="Daily operations checklist" kicker={example ? "Filled-in example · one made-up day at a three-truck shop" : "For a small field service office"}>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <Label>Date</Label>
          <Line value={example ? "Tuesday, November 17, 2026 (sample day)" : ""} />
        </div>
        <div>
          <Label>Completed by</Label>
          <Line value={example ? "Office manager (sample)" : ""} />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-stone-500">Items marked (owner) are the ones that most often slip when the owner is also working in the field.</p>
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-4">
        {CHECKLIST_SECTIONS.map((section) => (
          <section key={section.title} className="break-inside-avoid">
            <h3 className="border-b border-[#C2A05A] pb-0.5 text-[13px] font-semibold text-[#0A0A0A]">{section.title}</h3>
            <ul className="mt-1.5 space-y-1.5 text-[11.5px] leading-snug">
              {section.items.map((item) => {
                const done = example && item.example !== undefined;
                return (
                  <li key={item.text} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[9px] font-bold ${exact} ${done ? "border-[#0d0f0c] bg-[#0d0f0c] text-white" : "border-stone-500"}`}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span>
                      {item.owner ? <strong className="font-semibold text-[#77591B]">(owner) </strong> : null}
                      {item.text}
                      {done ? <span className="mt-0.5 block italic text-[#77591B]">{item.example}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Paper>
  );
}

export const TEMPLATE_SHEETS: Record<string, (props: { readonly variant: SheetVariant }) => React.ReactElement> = {
  "estimate-template": EstimateSheet,
  "pricing-worksheet": WorksheetSheet,
  "maintenance-agreement-outline": AgreementSheet,
  "daily-operations-checklist": ChecklistSheet,
};
