"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCopy, ListChecks, Plus, Printer, RotateCcw, Save, Trash2, X } from "lucide-react";
import {
  Field,
  FindHelp,
  NumberInput,
  SampleTag,
  Segmented,
  TextInput,
  Toast,
  ToolButton,
  copyText,
  focusRing,
  readStorage,
  removeStorage,
  rowId,
  useToast,
  writeStorage,
} from "@/shared/components/resources/tools/ToolControls";
import { useCarried } from "@/shared/components/resources/calc/carry";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import {
  FLAT_RATE_SAMPLE_AFTER_HOURS,
  FLAT_RATE_SAMPLE_RATE,
  FLAT_RATE_SAMPLE_TASKS,
  markupToMargin,
  priceListLine,
  type PriceRounding,
} from "@/shared/lib/resources/flat-rate-list";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";

/**
 * The flat-rate price list builder at /resources/flat-rate-price-list.
 *
 * A list of tasks, each with book hours, a part cost and a markup, priced at
 * the shop's labor rate, with an after-hours price beside it. It prints as a
 * clean price sheet and copies into a spreadsheet. The same formula as the
 * price builder inside the Labor Cost Workspace, as a tool of its own for
 * the owner who already knows their rate.
 *
 * ============ NOTHING LEAVES THE BROWSER ============
 * The list lives in React state. "Save in this browser" writes it to this
 * browser's localStorage and nowhere else; there is no request with a price
 * or a company name in it. Every restored value is validated before use.
 */

const STORAGE_KEY = "altair-tool:flat-rate-price-list:v1";
const MAX_ROWS = 60;
const NUMBER_TEXT = /^\d{0,7}(\.\d{0,2})?$/;

type Row = { id: string; name: string; bookHours: string; partCost: string; markupPct: string };
type State = { company: string; rate: string; afterHours: string; rounding: PriceRounding; rows: Row[] };

const sampleRows = (): Row[] =>
  FLAT_RATE_SAMPLE_TASKS.map((task, index) => ({
    id: `s${index + 1}`,
    name: task.name,
    bookHours: String(task.bookHours),
    partCost: String(task.partCost),
    markupPct: String(task.markupPercent),
  }));

const SAMPLE: State = { company: "", rate: String(FLAT_RATE_SAMPLE_RATE), afterHours: String(FLAT_RATE_SAMPLE_AFTER_HOURS), rounding: "dollar", rows: sampleRows() };
const BLANK: State = { company: "", rate: "", afterHours: "1.5", rounding: "dollar", rows: [{ id: "b1", name: "", bookHours: "", partCost: "", markupPct: "100" }] };

const num = (raw: string) => {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
};
const money = (value: number, digits = 2) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
const cleanNumber = (value: unknown, fallback: string) => (typeof value === "string" && NUMBER_TEXT.test(value) ? value : fallback);
const cleanText = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, "").slice(0, max) : "");

/** Rebuilds a list from this browser's saved copy: known keys only, number-shaped numbers, short plain names. */
function sanitize(raw: unknown): State | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  if (!Array.isArray(source.rows)) return null;
  return {
    company: cleanText(source.company, 60),
    rate: cleanNumber(source.rate, ""),
    afterHours: cleanNumber(source.afterHours, "1.5"),
    rounding: source.rounding === "exact" || source.rounding === "five" ? source.rounding : "dollar",
    rows: source.rows.slice(0, MAX_ROWS).map((row, index) => {
      const r = (row ?? {}) as Record<string, unknown>;
      return { id: `r${index + 1}`, name: cleanText(r.name, 60), bookHours: cleanNumber(r.bookHours, ""), partCost: cleanNumber(r.partCost, ""), markupPct: cleanNumber(r.markupPct, "") };
    }),
  };
}

export function FlatRatePriceList() {
  const [state, setState] = useState<State>(SAMPLE);
  const [isSample, setIsSample] = useState(true);
  const [hasSaved, setHasSaved] = useState(false);
  const toast = useToast();
  const carried = useCarried();

  // A saved list replaces the sample once the page is in the browser.
  useEffect(() => {
    const saved = sanitize(readStorage(STORAGE_KEY));
    if (saved) {
      setState(saved);
      setIsSample(false);
      setHasSaved(true);
    }
  }, []);

  const edit = (next: Partial<State>) => {
    setIsSample(false);
    setState((current) => ({ ...current, ...next }));
  };
  const editRow = (id: string, next: Partial<Row>) => edit({ rows: state.rows.map((row) => (row.id === id ? { ...row, ...next } : row)) });
  const addRow = () => edit({ rows: [...state.rows, { id: rowId("r"), name: "", bookHours: "", partCost: "", markupPct: "100" }] });
  const removeRow = (id: string) => edit({ rows: state.rows.filter((row) => row.id !== id) });

  const rate = num(state.rate);
  const multiplier = Math.max(1, num(state.afterHours) || 1);
  const priced = state.rows.map((row) => ({
    row,
    line: priceListLine({ bookHours: num(row.bookHours), partCost: num(row.partCost), markupPercent: num(row.markupPct) }, rate, multiplier, state.rounding),
  }));
  const listed = priced.filter(({ row, line }) => row.name.trim() !== "" && line.standard > 0);
  const prices = listed.map(({ line }) => line.standard);
  const ready = rate > 0 && listed.length > 0;
  const carriedRate = carried ? carried.billedRate : null;

  const save = () => {
    const ok = writeStorage(STORAGE_KEY, { ...state, rows: state.rows.map(({ name, bookHours, partCost, markupPct }) => ({ name, bookHours, partCost, markupPct })) });
    setHasSaved(ok);
    toast.show(ok ? "Saved in this browser." : "This browser would not save it. Print or copy the list instead.");
  };
  const forget = () => {
    removeStorage(STORAGE_KEY);
    setHasSaved(false);
    toast.show("Saved list removed from this browser.");
  };
  const copy = async () => {
    const lines = [["Task", "Book hours", "Standard price", "After-hours price"].join("\t"), ...listed.map(({ row, line }) => [row.name, row.bookHours, line.standard.toFixed(2), line.afterHours.toFixed(2)].join("\t"))];
    const ok = await copyText(lines.join("\n"));
    toast.show(ok ? "Copied. Paste it into Excel or Google Sheets." : "Copy was blocked by the browser. Use Print instead.");
  };

  return (
    <div id="price-list" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_40px_100px_-60px_rgba(28,25,23,0.55)] print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        {/* ---------- toolbar ---------- */}
        <div className="flex items-center justify-between gap-3 bg-[#0d0f0c] px-4 py-2.5 sm:px-5 lg:py-3 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30 max-sm:hidden">
              <ListChecks aria-hidden="true" className="h-4.5 w-4.5 text-[#e8d9ac]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#fff9ea]">Flat-Rate Price List</p>
              <p className="hidden text-[11px] text-[#a99f8f] sm:block">Runs in your browser. Nothing you type is sent anywhere.</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <ToolButton
              variant="dark"
              size="sm"
              icon={RotateCcw}
              onClick={() => {
                setState({ ...SAMPLE, rows: sampleRows() });
                setIsSample(true);
                toast.show("Sample list loaded.");
              }}
            >
              Load sample
            </ToolButton>
            <ToolButton variant="dark" size="sm" icon={ClipboardCopy} onClick={copy} disabled={!ready} className="max-lg:hidden">
              Copy for a spreadsheet
            </ToolButton>
            <ToolButton variant="dark" size="sm" icon={Save} onClick={save} className="max-lg:hidden">
              Save in this browser
            </ToolButton>
            <ToolButton variant="primary" size="sm" icon={Printer} onClick={() => window.print()} disabled={!ready} className="max-lg:hidden">
              Print / PDF
            </ToolButton>
          </div>
        </div>

        {hasSaved ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-amber-50/60 px-4 py-2 text-[13px] text-stone-700 sm:px-5 print:hidden">
            <span>Your list is saved in this browser.</span>
            <button type="button" onClick={forget} className={`inline-flex min-h-8 items-center gap-1 rounded font-semibold text-[#77591B] hover:underline ${focusRing}`}>
              <X aria-hidden="true" className="h-3.5 w-3.5" /> Forget the saved list
            </button>
          </div>
        ) : null}

        {isSample ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-[13px] text-stone-700 sm:px-5 print:hidden">
            <span>
              <strong className="font-semibold text-stone-900">A sample list.</strong> The hours and part costs are made up: put in your own.
            </span>
            <button
              type="button"
              onClick={() => {
                setState(BLANK);
                setIsSample(false);
              }}
              className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded font-semibold text-[#77591B] hover:underline ${focusRing}`}
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Start blank
            </button>
          </div>
        ) : null}

        {/* ---------- settings ---------- */}
        <div className="border-b border-stone-200 px-4 py-5 sm:px-6 print:hidden">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Your labor rate"
              hint="What one billed hour is quoted at."
              find={
                <>
                  The recommended rate from the{" "}
                  <Link href={LABOR_WORKSPACE_PATH} className="font-semibold text-[#77591B] underline underline-offset-2">
                    labor rate calculator
                  </Link>
                  , or the hourly rate in your current price book.
                </>
              }
            >
              {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.rate} onChange={(value) => edit({ rate: value })} prefix="$" suffix="/hr" invalid={rate <= 0} placeholder="0" />}
            </Field>
            <Field label="After-hours multiplier" hint="On labor only. 1.5 is time and a half." find="Your choice. Whatever you pay technicians for nights and weekends is a fair starting point: time and a half is 1.5.">
              {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.afterHours} onChange={(value) => edit({ afterHours: value })} suffix="× labor" placeholder="1.5" />}
            </Field>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="mb-1.5 text-[13px] font-medium text-stone-800">Round prices up to</p>
              <Segmented
                label="Round prices up to"
                value={state.rounding}
                onChange={(value) => edit({ rounding: value })}
                options={[
                  { value: "exact", label: "Cents" },
                  { value: "dollar", label: "$1" },
                  { value: "five", label: "$5" },
                ]}
              />
            </div>
            <Field label="Company name" hint="Optional. Printed at the top of the list.">
              {({ id }) => <TextInput id={id} value={state.company} onChange={(value) => edit({ company: value })} placeholder="Your company" maxLength={60} />}
            </Field>
          </div>
          {carriedRate !== null && num(state.rate) !== carriedRate ? (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-stone-600">
              Your labor rate calculator result was {money(carriedRate, 0)} an hour.
              <ToolButton size="sm" onClick={() => edit({ rate: String(carriedRate) })}>
                Use {money(carriedRate, 0)}
              </ToolButton>
            </p>
          ) : null}
        </div>

        {/* ---------- print header ---------- */}
        <div className="hidden print:block print:pb-4">
          <p className="text-xl font-semibold text-black">{state.company.trim() || "Flat-rate price list"}</p>
          <p className="text-xs text-stone-600">
            {state.company.trim() ? "Flat-rate price list. " : ""}Prices include labor and the part. After-hours prices apply nights, weekends and holidays.
          </p>
        </div>

        {/* ---------- the list ---------- */}
        <div className="px-4 py-5 sm:px-6 print:px-0 print:py-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <p className="text-[15px] font-semibold text-stone-900">Your tasks</p>
            <SampleTag>price = book hours × rate + part with markup</SampleTag>
          </div>
          <FindHelp label="Where do the book hours and part costs come from?" className="mb-4 print:hidden">
            <strong className="font-semibold text-stone-900">Book hours:</strong> how long the task takes on average, from your own finished jobs, drive time left
            out. Look at the last few times you did it. <strong className="font-semibold text-stone-900">Part cost:</strong> what your supply house charges you
            today. <strong className="font-semibold text-stone-900">Markup:</strong> what you add to the part. 100% doubles it, which leaves half of the
            part&apos;s price as margin.
          </FindHelp>

          {/* phone: one card per task */}
          <ul className="space-y-3 md:hidden print:hidden">
            {priced.map(({ row, line }, index) => (
              <li key={row.id} className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <TextInput value={row.name} onChange={(value) => editRow(row.id, { name: value })} ariaLabel={`Task ${index + 1}`} placeholder="Task name" maxLength={60} />
                  </div>
                  <button type="button" onClick={() => removeRow(row.id)} aria-label={`Remove task ${index + 1}`} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700 ${focusRing}`}>
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <NumberInput value={row.bookHours} onChange={(value) => editRow(row.id, { bookHours: value })} suffix="hrs" ariaLabel={`Task ${index + 1} book hours`} placeholder="0" />
                  <NumberInput value={row.partCost} onChange={(value) => editRow(row.id, { partCost: value })} prefix="$" ariaLabel={`Task ${index + 1} part cost`} placeholder="0" />
                  <NumberInput value={row.markupPct} onChange={(value) => editRow(row.id, { markupPct: value })} suffix="%" ariaLabel={`Task ${index + 1} part markup`} placeholder="0" />
                </div>
                <p className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-stone-500">
                  <span>Book hours</span>
                  <span>Part cost</span>
                  <span>Markup</span>
                </p>
                <p className="mt-2 flex items-baseline justify-between gap-3 border-t border-stone-200 pt-2 text-sm">
                  <span className="text-stone-600">
                    Price <span className="font-semibold tabular-nums text-stone-900">{rate > 0 ? money(line.standard, state.rounding === "exact" ? 2 : 0) : "–"}</span>
                  </span>
                  <span className="text-stone-600">
                    After hours <span className="font-semibold tabular-nums text-stone-900">{rate > 0 ? money(line.afterHours, state.rounding === "exact" ? 2 : 0) : "–"}</span>
                  </span>
                </p>
              </li>
            ))}
          </ul>

          {/* computer: a table to edit */}
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 md:block print:hidden">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Flat-rate price list: tasks, hours, parts and prices</caption>
              <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left font-semibold">Task</th>
                  <th scope="col" className="w-24 px-2 py-2.5 text-left font-semibold">Book hrs</th>
                  <th scope="col" className="w-28 px-2 py-2.5 text-left font-semibold">Part cost</th>
                  <th scope="col" className="w-24 px-2 py-2.5 text-left font-semibold">Markup</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Price</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">After hours</th>
                  <th scope="col" className="w-12 px-2 py-2.5">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {priced.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-500">
                      No tasks yet. Add the jobs you price most often.
                    </td>
                  </tr>
                ) : (
                  priced.map(({ row, line }, index) => (
                    <tr key={row.id}>
                      <td className="px-2 py-1.5">
                        <TextInput value={row.name} onChange={(value) => editRow(row.id, { name: value })} ariaLabel={`Task ${index + 1}`} placeholder="Task name" maxLength={60} compact />
                      </td>
                      <td className="px-1 py-1.5">
                        <NumberInput value={row.bookHours} onChange={(value) => editRow(row.id, { bookHours: value })} ariaLabel={`Task ${index + 1} book hours`} placeholder="0" compact />
                      </td>
                      <td className="px-1 py-1.5">
                        <NumberInput value={row.partCost} onChange={(value) => editRow(row.id, { partCost: value })} prefix="$" ariaLabel={`Task ${index + 1} part cost`} placeholder="0" compact />
                      </td>
                      <td className="px-1 py-1.5">
                        <NumberInput value={row.markupPct} onChange={(value) => editRow(row.id, { markupPct: value })} suffix="%" ariaLabel={`Task ${index + 1} part markup`} placeholder="0" compact />
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-stone-900">{rate > 0 ? money(line.standard, state.rounding === "exact" ? 2 : 0) : "–"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-stone-700">{rate > 0 ? money(line.afterHours, state.rounding === "exact" ? 2 : 0) : "–"}</td>
                      <td className="px-1 py-1.5 text-center">
                        <button type="button" onClick={() => removeRow(row.id)} aria-label={`Remove task ${index + 1}`} className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700 ${focusRing}`}>
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <ToolButton icon={Plus} onClick={addRow} disabled={state.rows.length >= MAX_ROWS}>
              Add task
            </ToolButton>
            <p className="text-[13px] text-stone-500 sm:text-xs">
              Labor at {money(rate)}/hr · after hours ×{multiplier} on labor · a 100% markup leaves {Math.round(markupToMargin(100) * 100)}% of the part&apos;s price as margin.
            </p>
          </div>

          {/* the price sheet: what prints, and a plain reading on screen */}
          <div className="mt-6 print:mt-0">
            {ready ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 print:hidden" role="status">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">What this means</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {listed.length} {listed.length === 1 ? "task" : "tasks"} priced, from {money(Math.min(...prices), state.rounding === "exact" ? 2 : 0)} to{" "}
                  {money(Math.max(...prices), state.rounding === "exact" ? 2 : 0)}.
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-stone-700">
                  Each price is the book hours at {money(rate, 0)} an hour plus the part with your markup
                  {state.rounding === "exact" ? "" : `, rounded up to the next ${state.rounding === "five" ? "$5" : "dollar"}`}. The customer hears one number
                  before the work starts, and it is the same number whichever technician runs the call. Print it for the truck, or copy it into a spreadsheet.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-stone-700 print:hidden" role="status">
                <p className="font-semibold text-stone-900">No price list yet</p>
                <p className="mt-1">Enter your labor rate, then name a task and give it book hours or a part cost.</p>
              </div>
            )}

            <table className="mt-4 hidden w-full text-sm print:table">
              <caption className="sr-only">Flat-rate prices</caption>
              <thead>
                <tr className="border-b-2 border-black text-left text-xs uppercase tracking-wide">
                  <th scope="col" className="py-2">Task</th>
                  <th scope="col" className="py-2 text-right">Price</th>
                  <th scope="col" className="py-2 text-right">After hours</th>
                </tr>
              </thead>
              <tbody>
                {listed.map(({ row, line }) => (
                  <tr key={row.id} className="border-b border-stone-300">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 text-right tabular-nums">{money(line.standard, state.rounding === "exact" ? 2 : 0)}</td>
                    <td className="py-2 text-right tabular-nums">{money(line.afterHours, state.rounding === "exact" ? 2 : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phone: the toolbar's other buttons */}
          <div className="mt-5 rounded-xl border border-stone-200 bg-white p-3 lg:hidden print:hidden">
            <p className="text-[13px] font-semibold text-stone-900">Keep this list</p>
            <p className="mt-0.5 text-[13px] leading-snug text-stone-600">Nothing you type is sent anywhere. Save it in this browser, print it, or copy it into a spreadsheet.</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <ToolButton size="sm" icon={Save} onClick={save} className="px-2">
                Save
              </ToolButton>
              <ToolButton size="sm" icon={ClipboardCopy} onClick={copy} disabled={!ready} className="px-2">
                Copy
              </ToolButton>
              <ToolButton size="sm" variant="primary" icon={Printer} onClick={() => window.print()} disabled={!ready} className="px-2">
                PDF
              </ToolButton>
            </div>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-3 max-w-4xl px-2 text-center text-xs leading-relaxed text-stone-500 print:hidden">
        A price list is only as good as the rate under it. If you have not worked yours out, start with the{" "}
        <Link href={LABOR_WORKSPACE_PATH} className="font-medium text-[#77591B] hover:underline">
          labor rate calculator
        </Link>
        ; one technician takes two minutes in the{" "}
        <Link href={calculatorPath("labor-rate")} className="font-medium text-[#77591B] hover:underline">
          quick version
        </Link>
        .
      </p>
      <Toast message={toast.message} />
    </div>
  );
}
