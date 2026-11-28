"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, CalendarClock, CheckCircle2, CreditCard, Mail, Plus, Receipt, Trash2, Wrench } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { NumberInput, Segmented, Toast, ToolButton, focusRing, useToast } from "@/shared/components/resources/tools/ToolControls";
import { InvoicePaper, computeInvoice } from "@/shared/components/resources/invoice/InvoicePaper";
import { LINE_KIND_LABEL, QTY_UNIT, SAMPLE_INVOICE, type InvoiceState } from "@/shared/components/resources/invoice/invoice-state";
import { formatCents, parseCents, type InvoiceLine } from "@/shared/lib/resources/invoice-builder";
import { INVOICE_BUILDER_PATH } from "@/shared/lib/resources/tool-hub";
import { DemoFrame, DemoStepper, StatusPill } from "@/shared/components/marketing/demos/DemoFrame";

/**
 * "Invoice a finished job", the demo on /hvac-invoicing-software.
 *
 * The flow is Altair's own, in its order (shared/lib/site/software-pages.ts
 * cites the code for each step): completing a job with an approved estimate
 * drafts the invoice from that estimate; the office reviews and emails it;
 * the customer pays by card from the link, or a cash, check, card, ACH or
 * other payment is recorded against it, in full or in part; an unpaid
 * invoice turns overdue after its due date.
 *
 * The invoice itself is the Invoice Builder's paper and integer-cent math
 * (PR #95), with the builder's sample service call. Every name and price is
 * made up. Nothing here calls a server, emails anyone or takes a card.
 */

const TOOL_ID = "invoicing-demo";

type Method = "cash" | "check" | "card" | "ach" | "other";
type Payment = { readonly id: number; readonly method: Method | "link"; readonly cents: number };

const METHOD_LABEL: Record<Payment["method"], string> = {
  link: "Card, paid from the link",
  cash: "Cash",
  check: "Check",
  card: "Card, taken on site",
  ach: "ACH",
  other: "Other",
};

const STEPS = [
  { id: "job", label: "Finish the job" },
  { id: "review", label: "Review the draft" },
  { id: "send", label: "Send it" },
  { id: "paid", label: "Get paid" },
] as const;

/** Sample price-book items the reviewer can add. Made-up prices. */
const PRICE_BOOK: readonly Omit<InvoiceLine, "id">[] = [
  { kind: "fee", description: "Condensate drain flush", partNumber: "", qty: "1", price: "65", taxable: false },
  { kind: "part", description: "Contactor 2-pole 30A", partNumber: "CON-230", qty: "1", price: "42", taxable: true },
  { kind: "labor", description: "Labor, additional", partNumber: "", qty: "0.5", price: "121", taxable: false },
];

const JOB = {
  number: "JOB-2207",
  estimate: "EST-1186",
  title: "AC not cooling",
  tech: SAMPLE_INVOICE.technician,
} as const;

function baseInvoice(): InvoiceState {
  return { ...SAMPLE_INVOICE, lines: SAMPLE_INVOICE.lines.map((line) => ({ ...line })), amountPaid: "0", terms: "Net 15" };
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function InvoiceDemo() {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [invoice, setInvoice] = useState<InvoiceState>(baseInvoice);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sent, setSent] = useState(false);
  const [overdue, setOverdue] = useState(false);
  const [method, setMethod] = useState<Method>("check");
  const [amount, setAmount] = useState("");
  const [payView, setPayView] = useState<"link" | "record">("link");
  const [phoneTab, setPhoneTab] = useState<"steps" | "invoice">("steps");
  const toast = useToast();
  const nextId = useRef(1);

  const interacted = useRef(false);
  const markInteracted = () => {
    interacted.current = true;
  };
  useEffect(() => {
    if (interacted.current) trackEngagement("calculator_used", TOOL_ID);
  }, [step, invoice, payments]);

  const paidCents = payments.reduce((sum, payment) => sum + payment.cents, 0);
  const paper: InvoiceState = useMemo(
    () => ({
      ...invoice,
      dueDate: addDays(invoice.date, 15),
      amountPaid: (paidCents / 100).toFixed(2),
      paymentInstructions: "Pay by card from the link in your email, or by cash or check to the technician.",
    }),
    [invoice, paidCents],
  );
  const computed = useMemo(() => computeInvoice(paper), [paper]);
  const totalCents = computed.totals.totalCents;
  const balanceCents = Math.max(0, totalCents - paidCents);

  const status: { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" } =
    reached === 0
      ? { label: "Job in progress", tone: "info" }
      : !sent
        ? { label: "Draft", tone: "neutral" }
        : balanceCents === 0 && paidCents > 0
          ? { label: "Paid", tone: "success" }
          : overdue
            ? { label: "Overdue", tone: "danger" }
            : paidCents > 0
              ? { label: "Partially paid", tone: "warning" }
              : { label: "Sent", tone: "info" };

  const go = (index: number) => {
    setStep(index);
    setReached((r) => Math.max(r, index));
  };

  const reset = () => {
    setStep(0);
    setReached(0);
    setInvoice(baseInvoice());
    setPayments([]);
    setSent(false);
    setOverdue(false);
    setAmount("");
    setPayView("link");
    setPhoneTab("steps");
    toast.show("Back to the start.");
  };

  const completeJob = () => {
    go(1);
    toast.show(`Job complete. Draft invoice ${SAMPLE_INVOICE.number} was created from the approved estimate.`);
  };

  const updateLine = (id: string, next: Partial<InvoiceLine>) =>
    setInvoice((s) => ({ ...s, lines: s.lines.map((line) => (line.id === id ? { ...line, ...next } : line)) }));
  const removeLine = (id: string) => setInvoice((s) => ({ ...s, lines: s.lines.filter((line) => line.id !== id) }));
  const addFromBook = (index: number) => {
    const item = PRICE_BOOK[index];
    if (!item) return;
    setInvoice((s) =>
      s.lines.length >= 10 ? s : { ...s, lines: [...s.lines, { ...item, id: `pb${nextId.current++}` }] },
    );
  };

  const send = () => {
    setSent(true);
    go(3);
    toast.show(`Invoice emailed to ${SAMPLE_INVOICE.customerEmail} (sample: nothing was sent).`);
  };

  const recordPayment = (kind: Payment["method"], cents: number) => {
    const take = Math.min(cents, balanceCents);
    if (take <= 0) return;
    setPayments((list) => [...list, { id: nextId.current++, method: kind, cents: take }]);
    setAmount("");
    const left = balanceCents - take;
    toast.show(left === 0 ? "Paid in full. The invoice is marked paid." : `${formatCents(take)} recorded. ${formatCents(left)} still owed.`);
  };

  const typedCents = parseCents(amount);
  const amountProblem =
    amount.trim() === ""
      ? null
      : typedCents <= 0
        ? "Enter an amount above zero."
        : typedCents > balanceCents
          ? `That is more than the ${formatCents(balanceCents)} still owed.`
          : null;

  const lineCount = invoice.lines.filter((line) => line.description.trim() || parseCents(line.price) !== 0).length;

  return (
    <DemoFrame
      id="invoicing-demo"
      icon={Receipt}
      title="Invoice a finished job"
      subtitle="The Altair invoicing flow with a made-up service call. Nothing is sent or charged."
      onReset={reset}
      onInteract={markInteracted}
    >
      <DemoStepper steps={STEPS} current={step} onSelect={setStep} canSelect={(index) => index <= reached} />

      {/* phone: one pane at a time */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-3 py-2 lg:hidden">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        <Segmented
          label="Show"
          value={phoneTab}
          onChange={setPhoneTab}
          options={[
            { value: "steps", label: "Workflow" },
            { value: "invoice", label: reached === 0 ? "Invoice" : `Invoice · ${formatCents(balanceCents)} due` },
          ]}
        />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ---------------- the workflow ---------------- */}
        <div className={`border-stone-200 p-4 sm:p-6 lg:block lg:border-r ${phoneTab === "steps" ? "block" : "hidden"}`}>
          {step === 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">On the technician&apos;s phone</p>
              <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-stone-500">{JOB.number}</p>
                    <p className="text-lg font-semibold text-stone-900">{JOB.title}</p>
                    <p className="text-sm text-stone-600">
                      {SAMPLE_INVOICE.customerName} · {SAMPLE_INVOICE.customerAddress}
                    </p>
                  </div>
                  <StatusPill tone={reached > 0 ? "success" : "info"}>{reached > 0 ? "Completed" : "On site"}</StatusPill>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-stone-500">Approved estimate</dt>
                    <dd className="font-medium text-stone-900">{JOB.estimate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">Technician</dt>
                    <dd className="font-medium text-stone-900">{JOB.tech}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-stone-500">Equipment</dt>
                    <dd className="font-medium text-stone-900">
                      {SAMPLE_INVOICE.make} {SAMPLE_INVOICE.model} · {SAMPLE_INVOICE.refrigerantType}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-stone-500">Work done</dt>
                    <dd className="text-stone-800">{SAMPLE_INVOICE.correction}</dd>
                  </div>
                </dl>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-stone-600">
                The estimate the customer approved is already on the job. When the job is marked complete, Altair drafts
                the invoice from it and tells the office it is ready.
              </p>
              <ToolButton variant="primary" icon={Wrench} onClick={completeJob} className="mt-4 w-full sm:w-auto">
                {reached > 0 ? "Open the draft invoice" : "Mark the job complete"}
              </ToolButton>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Draft invoice {SAMPLE_INVOICE.number}, from {JOB.estimate}
                </p>
                <span className="text-xs text-stone-500">Change a quantity or rate and watch the total.</span>
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[440px] text-sm">
                  <caption className="sr-only">Invoice lines</caption>
                  <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-semibold">Line</th>
                      <th scope="col" className="w-20 px-1.5 py-2 text-left font-semibold">Qty</th>
                      <th scope="col" className="w-24 px-1.5 py-2 text-left font-semibold">Rate</th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold">Amount</th>
                      <th scope="col" className="w-10 px-1 py-2"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {invoice.lines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-stone-500">
                          No lines left. Add one from the price book below, or start over.
                        </td>
                      </tr>
                    ) : (
                      invoice.lines.map((line, index) => (
                        <tr key={line.id} className="align-middle">
                          <td className="px-3 py-1.5">
                            <span className="block text-[13px] font-medium leading-snug text-stone-900">{line.description}</span>
                            <span className="text-[11px] text-stone-500">
                              {LINE_KIND_LABEL[line.kind]}
                              {line.taxable ? " · taxable" : ""}
                            </span>
                          </td>
                          <td className="px-1 py-1.5">
                            <NumberInput
                              compact
                              value={line.qty}
                              onChange={(value) => updateLine(line.id, { qty: value })}
                              ariaLabel={`Line ${index + 1} quantity in ${QTY_UNIT[line.kind]}`}
                              placeholder="0"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <NumberInput
                              compact
                              prefix="$"
                              value={line.price}
                              onChange={(value) => updateLine(line.id, { price: value })}
                              ariaLabel={`Line ${index + 1} rate`}
                              placeholder="0"
                            />
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-stone-900">
                            {formatCents(computed.totals.lineCents[index] ?? 0)}
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              aria-label={`Remove line ${index + 1}`}
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700 ${focusRing}`}
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <p className="text-[13px] font-medium text-stone-800">Add from the price book</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRICE_BOOK.map((item, index) => (
                    <ToolButton key={item.description} size="sm" icon={Plus} onClick={() => addFromBook(index)} disabled={invoice.lines.length >= 10}>
                      {item.description} · ${item.price}
                    </ToolButton>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
                <div>
                  <label htmlFor="demo-tax" className="text-[13px] font-medium text-stone-800">
                    Sales tax on taxable lines
                  </label>
                  <div className="mt-1.5">
                    <NumberInput
                      id="demo-tax"
                      suffix="%"
                      value={invoice.taxRate}
                      onChange={(value) => setInvoice((s) => ({ ...s, taxRate: value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-xs text-stone-500">Total</p>
                  <p className="text-xl font-semibold tabular-nums text-stone-900">{formatCents(totalCents)}</p>
                </div>
              </div>

              <ToolButton
                variant="primary"
                icon={ArrowRight}
                onClick={() => go(2)}
                disabled={lineCount === 0 || totalCents <= 0}
                className="mt-5 w-full sm:w-auto"
              >
                Looks right, send it
              </ToolButton>
              {lineCount === 0 || totalCents <= 0 ? (
                <p className="mt-2 text-xs text-red-700">An invoice needs at least one line with an amount.</p>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">The email the customer gets</p>
              <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                <div className="space-y-1 border-b border-stone-100 bg-stone-50 px-4 py-3 text-[13px]">
                  <p>
                    <span className="text-stone-500">To: </span>
                    <span className="font-medium text-stone-900">{SAMPLE_INVOICE.customerEmail}</span>
                  </p>
                  <p>
                    <span className="text-stone-500">Subject: </span>
                    <span className="font-medium text-stone-900">
                      Invoice {SAMPLE_INVOICE.number} from {SAMPLE_INVOICE.companyName}
                    </span>
                  </p>
                </div>
                <div className="px-4 py-4 text-sm text-stone-700">
                  <p>Hi {SAMPLE_INVOICE.customerName.split(" ")[0]}, thanks for having us out. Your invoice is ready.</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2.5 ring-1 ring-inset ring-stone-200">
                    <span>
                      Amount due <strong className="tabular-nums text-stone-900">{formatCents(balanceCents)}</strong> by{" "}
                      {longDate(paper.dueDate)}
                    </span>
                    <span className="inline-flex min-h-9 items-center rounded-lg bg-stone-900 px-3 text-[13px] font-semibold text-white">
                      View and pay
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-stone-600">
                Send one invoice when it is ready, or the day&apos;s batch at once. The payment link works once your own
                Stripe account is connected.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ToolButton variant="primary" icon={Mail} onClick={send}>
                  {sent ? "Resend the invoice" : "Send the invoice"}
                </ToolButton>
                <ToolButton onClick={() => go(1)}>Back to the draft</ToolButton>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              {balanceCents === 0 && paidCents > 0 ? (
                <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200">
                  <p className="flex items-center gap-2 font-semibold text-emerald-900">
                    <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                    Paid in full
                  </p>
                  <p className="mt-1 text-sm text-emerald-900/80">
                    {formatCents(paidCents)} received in {payments.length} {payments.length === 1 ? "payment" : "payments"}. The
                    reports count it as collected.
                  </p>
                </div>
              ) : (
                <>
                  <Segmented
                    label="How the money comes in"
                    value={payView}
                    onChange={setPayView}
                    options={[
                      { value: "link", label: "Customer pays the link" },
                      { value: "record", label: "Record a payment" },
                    ]}
                  />

                  {payView === "link" ? (
                    <div className="mt-4">
                      <div className="mx-auto max-w-[300px] rounded-[1.6rem] border-[6px] border-stone-900 bg-white p-4 shadow-xl">
                        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                          {SAMPLE_INVOICE.companyName}
                        </p>
                        <p className="mt-3 text-center text-sm text-stone-600">Invoice {SAMPLE_INVOICE.number}</p>
                        <p className="text-center text-3xl font-semibold tabular-nums text-stone-900">{formatCents(balanceCents)}</p>
                        <p className="text-center text-xs text-stone-500">due by {longDate(paper.dueDate)}</p>
                        <button
                          type="button"
                          onClick={() => recordPayment("link", balanceCents)}
                          className={`mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-900 text-sm font-semibold text-white hover:bg-stone-800 ${focusRing}`}
                        >
                          <CreditCard aria-hidden="true" className="h-4 w-4" />
                          Pay {formatCents(balanceCents)} by card
                        </button>
                        <p className="mt-2 text-center text-[11px] leading-snug text-stone-500">
                          The real page hands the card to Stripe. This demo asks for no card.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-[13px] font-medium text-stone-800">Method</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Payment method">
                          {(["cash", "check", "card", "ach", "other"] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              role="radio"
                              aria-checked={method === option}
                              onClick={() => setMethod(option)}
                              className={`min-h-9 rounded-lg px-3 text-[13px] font-semibold ring-1 ring-inset transition-colors ${
                                method === option ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:ring-[#C2A05A]"
                              } ${focusRing}`}
                            >
                              {option === "ach" ? "ACH" : option.charAt(0).toUpperCase() + option.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sm:max-w-xs">
                        <label htmlFor="demo-amount" className="text-[13px] font-medium text-stone-800">
                          Amount (part payments are fine)
                        </label>
                        <div className="mt-1.5">
                          <NumberInput
                            id="demo-amount"
                            prefix="$"
                            value={amount}
                            onChange={setAmount}
                            placeholder={(balanceCents / 100).toFixed(2)}
                            invalid={Boolean(amountProblem)}
                            describedBy={amountProblem ? "demo-amount-error" : undefined}
                          />
                        </div>
                        {amountProblem ? (
                          <p id="demo-amount-error" className="mt-1 text-xs text-red-700">
                            {amountProblem}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-stone-500">Leave it empty to record the full {formatCents(balanceCents)}.</p>
                        )}
                      </div>
                      <ToolButton
                        variant="primary"
                        icon={Banknote}
                        disabled={Boolean(amountProblem)}
                        onClick={() => recordPayment(method, amount.trim() === "" ? balanceCents : typedCents)}
                      >
                        Record the payment
                      </ToolButton>
                    </div>
                  )}

                  {!overdue ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOverdue(true);
                        toast.show("The due date passed. The invoice turned overdue and shows on the overdue list.");
                      }}
                      className={`mt-5 inline-flex min-h-9 items-center gap-1.5 rounded-md text-[13px] font-semibold text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline ${focusRing}`}
                    >
                      <CalendarClock aria-hidden="true" className="h-4 w-4" />
                      Skip ahead past the due date
                    </button>
                  ) : (
                    <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800 ring-1 ring-inset ring-red-200">
                      Overdue. It is on the overdue list and the reports. Resending it is one click; automatic reminder emails
                      are not built yet.
                    </p>
                  )}
                </>
              )}

              {payments.length ? (
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Payments on this invoice</p>
                  <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white text-sm">
                    {payments.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-stone-700">{METHOD_LABEL[payment.method]}</span>
                        <span className="font-semibold tabular-nums text-emerald-800">{formatCents(payment.cents)}</span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between gap-3 bg-stone-50 px-3 py-2 font-semibold">
                      <span className="text-stone-900">Still owed</span>
                      <span className="tabular-nums text-stone-900">{formatCents(balanceCents)}</span>
                    </li>
                  </ul>
                </div>
              ) : null}

              {balanceCents === 0 && paidCents > 0 ? (
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/signup"
                    data-cta="invoicing-demo-done"
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#A4823A] px-4 text-sm font-semibold text-[#080907] hover:bg-[#C2A05A] ${focusRing}`}
                  >
                    Bill a real job, free for 14 days
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                  <Link
                    href={INVOICE_BUILDER_PATH}
                    className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:border-[#C2A05A] ${focusRing}`}
                  >
                    Make a one-off invoice with the free builder
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ---------------- the invoice ---------------- */}
        <div className={`bg-stone-100/70 p-3 sm:p-6 lg:block ${phoneTab === "invoice" ? "block" : "hidden"}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline-flex">
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
              </span>
              {reached > 0 ? (
                <span className="text-xs text-stone-500">
                  Paid {formatCents(paidCents)} of {formatCents(totalCents)}
                </span>
              ) : null}
            </div>
            <span className="text-xs text-stone-500">Same paper as the free Invoice Builder</span>
          </div>
          {reached === 0 ? (
            <div className="space-y-3">
              <div className="rounded-md bg-white p-5 ring-1 ring-stone-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Approved estimate {JOB.estimate}
                  </p>
                  <StatusPill tone="success">Approved</StatusPill>
                </div>
                <ul className="mt-3 divide-y divide-stone-100 text-sm">
                  {invoice.lines.map((line, index) => (
                    <li key={line.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 text-stone-700">{line.description}</span>
                      <span className="shrink-0 tabular-nums text-stone-900">{formatCents(computed.totals.lineCents[index] ?? 0)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-sm font-semibold text-stone-900">
                  <span>Approved total, with tax and discount</span>
                  <span className="tabular-nums">{formatCents(totalCents)}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-dashed border-stone-300 bg-white/60 px-4 py-4">
                <Receipt aria-hidden="true" className="h-6 w-6 shrink-0 text-stone-400" />
                <p className="text-sm text-stone-600">
                  <span className="font-semibold text-stone-800">No invoice yet.</span> It is drafted from this estimate the
                  moment the job is marked complete.
                </p>
              </div>
            </div>
          ) : (
            <div className="origin-top">
              <InvoicePaper state={paper} computed={computed} />
            </div>
          )}
        </div>
      </div>
      <Toast message={toast.message} />
    </DemoFrame>
  );
}
