"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, FileCheck, Plus, Send, Smartphone, Trash2 } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { NumberInput, Toast, ToolButton, focusRing, useToast } from "@/shared/components/resources/tools/ToolControls";
import { SignaturePad, type SignaturePadHandle } from "@/shared/components/billing/SignaturePad";
import { WORKED_EXAMPLE, toFlatRateTask, toWorkspaceInput, type TaskRow } from "@/shared/components/resources/labor/labor-state";
import { calculateWorkspace, priceFlatRateTask } from "@/shared/lib/resources/labor-workspace";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { DemoFrame, DemoStepper, StatusPill } from "@/shared/components/marketing/demos/DemoFrame";

/**
 * "Price it, send it, get it signed", the demo on /hvac-estimating-software.
 *
 * The price book is the Labor Cost Workspace's flat-rate builder (PR #95):
 * each task is book hours × labor rate + part cost with markup, priced by
 * `priceFlatRateTask`, and the labor rate starts at the workspace's own
 * worked-example result. The approval is the product's own: printed name,
 * a drawn signature on the same SignaturePad component and the
 * authorization box, then the approved estimate becomes the job
 * (app/actions/estimate-public-approval.ts). One estimate carries one set of
 * lines; there is no good-better-best builder, and the demo does not
 * pretend otherwise. Nothing leaves the browser.
 */

const TOOL_ID = "estimating-demo";

const STEPS = [
  { id: "build", label: "Build it" },
  { id: "send", label: "Send it" },
  { id: "approve", label: "Customer signs" },
  { id: "job", label: "It is a job" },
] as const;

/** The workspace's three sample tasks plus three more. Book hours and part costs are samples. */
const PRICE_BOOK: readonly TaskRow[] = [
  ...WORKED_EXAMPLE.tasks,
  { id: "k4", task: "Replace condenser fan motor", bookHours: "1.5", partCost: "145", markupPct: "100" },
  { id: "k5", task: "Replace hot surface igniter", bookHours: "0.75", partCost: "38", markupPct: "100" },
  { id: "k6", task: "Install surge protector", bookHours: "0.75", partCost: "55", markupPct: "100" },
];

const WORKED = calculateWorkspace(toWorkspaceInput(WORKED_EXAMPLE));
const WORKED_RATE = WORKED.ok ? WORKED.result.recommendedRateRounded : 0;

const CUSTOMER = { name: "Pat Sample", address: "200 Example Street, Anytown" } as const;
const ESTIMATE_NO = "EST-1187";
const JOB_NO = "JOB-2208";

function money(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Line = { readonly id: string; readonly taskId: string; readonly qty: string };

export function EstimateDemo() {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [rate, setRate] = useState(String(WORKED_RATE));
  const [lines, setLines] = useState<Line[]>([
    { id: "e1", taskId: "k1", qty: "1" },
    { id: "e2", taskId: "k3", qty: "1" },
  ]);
  const [channel, setChannel] = useState<"link" | "onsite">("link");
  const [signer, setSigner] = useState<string>(CUSTOMER.name);
  const [authorized, setAuthorized] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const pad = useRef<SignaturePadHandle>(null);
  const nextId = useRef(3);
  const toast = useToast();

  const interacted = useRef(false);
  const markInteracted = () => {
    interacted.current = true;
  };
  useEffect(() => {
    if (interacted.current) trackEngagement("calculator_used", TOOL_ID);
  }, [step, lines, rate]);

  const rateValue = Math.max(0, Number.parseFloat(rate) || 0);
  const priced = useMemo(
    () =>
      new Map(
        PRICE_BOOK.map((task) => [task.id, priceFlatRateTask(toFlatRateTask(task), rateValue, 1.5, 0, true)] as const),
      ),
    [rateValue],
  );
  const estimateLines = lines
    .map((line) => {
      const task = PRICE_BOOK.find((t) => t.id === line.taskId);
      const price = priced.get(line.taskId);
      const qty = Math.max(0, Math.floor(Number.parseFloat(line.qty) || 0));
      return task && price ? { id: line.id, raw: line.qty, task, unit: price.standard, qty, amount: price.standard * qty } : null;
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);
  const total = estimateLines.reduce((sum, line) => sum + line.amount, 0);
  const canSend = estimateLines.some((line) => line.qty > 0) && total > 0;

  const go = (index: number) => {
    setStep(index);
    setReached((r) => Math.max(r, index));
  };

  const reset = () => {
    setStep(0);
    setReached(0);
    setRate(String(WORKED_RATE));
    setLines([
      { id: "e1", taskId: "k1", qty: "1" },
      { id: "e2", taskId: "k3", qty: "1" },
    ]);
    setChannel("link");
    setSigner(CUSTOMER.name);
    setAuthorized(false);
    setSignError(null);
    setSignature(null);
    setApprovedAt(null);
    pad.current?.clear();
    toast.show("Back to the start.");
  };

  const add = (taskId: string) => {
    const existing = lines.find((line) => line.taskId === taskId);
    if (existing) {
      setLines((list) => list.map((line) => (line.id === existing.id ? { ...line, qty: String((Number.parseInt(line.qty, 10) || 0) + 1) } : line)));
      return;
    }
    setLines((list) => (list.length >= 8 ? list : [...list, { id: `e${nextId.current++}`, taskId, qty: "1" }]));
  };

  const approve = () => {
    setSignError(null);
    if (!signer.trim()) {
      setSignError("Type the customer's printed name.");
      return;
    }
    const data = pad.current?.toDataUrl() ?? null;
    if (!data) {
      setSignError("Please draw your signature before approving.");
      return;
    }
    if (!authorized) {
      setSignError("Tick the box to authorize the work.");
      return;
    }
    setSignature(data);
    setApprovedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    go(3);
    toast.show(`Approved and signed. ${ESTIMATE_NO} became ${JOB_NO}.`);
  };

  const validUntil = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }, []);

  return (
    <DemoFrame
      id="estimating-demo"
      icon={FileCheck}
      title="Price it, send it, get it signed"
      subtitle="A flat-rate estimate from a sample price book, approved on the customer's phone."
      onReset={reset}
      onInteract={markInteracted}
    >
      <DemoStepper steps={STEPS} current={step} onSelect={setStep} canSelect={(index) => (approvedAt !== null ? index === 3 : index <= reached)} />

      {step === 0 ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="border-b border-stone-200 p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Flat-rate price book</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Price = book hours × labor rate + part cost with a 100% markup.
                </p>
              </div>
              <div className="w-36">
                <label htmlFor="demo-rate" className="text-[12px] font-medium text-stone-700">
                  Labor rate
                </label>
                <div className="mt-1">
                  <NumberInput id="demo-rate" compact prefix="$" suffix="/hr" value={rate} onChange={setRate} placeholder="0" invalid={rateValue <= 0} />
                </div>
              </div>
            </div>
            {rateValue <= 0 ? (
              <p className="mt-2 text-xs text-red-700">Enter a labor rate above zero to price the book.</p>
            ) : (
              <p className="mt-2 text-xs text-stone-500">
                {rateValue === WORKED_RATE ? (
                  <>
                    ${WORKED_RATE}/hr is the{" "}
                    <Link href={LABOR_WORKSPACE_PATH} className={`font-semibold text-[#77591B] underline-offset-2 hover:underline ${focusRing}`}>
                      Labor Cost Workspace
                    </Link>{" "}
                    worked example&apos;s rate, rounded up to the dollar. Use your own.
                  </>
                ) : (
                  <>Prices follow your rate.</>
                )}
              </p>
            )}
            <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200">
              {PRICE_BOOK.map((task) => {
                const price = priced.get(task.id);
                return (
                  <li key={task.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-stone-900">{task.task}</p>
                      <p className="text-[11px] text-stone-500">
                        {task.bookHours} hr · parts {money(Number(task.partCost))}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-stone-900">{money(price?.standard ?? 0)}</span>
                      <button
                        type="button"
                        onClick={() => add(task.id)}
                        disabled={rateValue <= 0}
                        aria-label={`Add ${task.task} to the estimate`}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 hover:border-[#C2A05A] disabled:opacity-40 ${focusRing}`}
                      >
                        <Plus aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-stone-500">Book hours and part costs are samples. Use your own job history.</p>
          </div>

          <div className="bg-stone-50/70 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Estimate {ESTIMATE_NO} · {CUSTOMER.name}
              </p>
              <StatusPill tone="neutral">Draft</StatusPill>
            </div>
            <ul className="mt-3 space-y-2">
              {estimateLines.length === 0 ? (
                <li className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">
                  No lines yet. Add a task from the price book.
                </li>
              ) : (
                estimateLines.map((line) => (
                  <li key={line.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug text-stone-900">{line.task.task}</p>
                      <p className="text-[11px] text-stone-500">{money(line.unit)} each</p>
                    </div>
                    <div className="w-16">
                      <NumberInput
                        compact
                        value={line.raw}
                        onChange={(value) => setLines((list) => list.map((l) => (l.id === line.id ? { ...l, qty: value.replace(/[^0-9]/g, "") } : l)))}
                        ariaLabel={`${line.task.task} quantity`}
                        placeholder="0"
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-semibold tabular-nums text-stone-900">{money(line.amount)}</span>
                    <button
                      type="button"
                      onClick={() => setLines((list) => list.filter((l) => l.id !== line.id))}
                      aria-label={`Remove ${line.task.task}`}
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700 ${focusRing}`}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-stone-900 px-4 py-3 text-white">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Estimate total</span>
              <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
            </div>
            <p className="mt-2 text-[11px] text-stone-500">Before any sales tax. One estimate carries one set of lines.</p>
            <ToolButton variant="primary" icon={ArrowRight} onClick={() => go(1)} disabled={!canSend} className="mt-4 w-full sm:w-auto">
              Ready to send
            </ToolButton>
            {!canSend ? <p className="mt-2 text-xs text-red-700">Add at least one line with a quantity to send it.</p> : null}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="p-4 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">How the customer approves</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(
              [
                { value: "link", icon: Send, title: "Send an approval link", text: "The customer opens it on their phone, approves and signs. No account and no app. The link is tied to this one estimate and expires after a set time." },
                { value: "onsite", icon: Smartphone, title: "Approve on site", text: "The customer is standing next to the technician, so they approve and sign on the technician's phone instead." },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const active = channel === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChannel(option.value)}
                  aria-pressed={active}
                  className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-[#C2A05A] bg-amber-50/50 shadow-sm" : "border-stone-200 bg-white hover:border-stone-300"} ${focusRing}`}
                >
                  <span className="flex items-center gap-2 text-[15px] font-semibold text-stone-900">
                    <Icon aria-hidden="true" className="h-4 w-4 text-[#77591B]" />
                    {option.title}
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-stone-600">{option.text}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ToolButton
              variant="primary"
              icon={channel === "link" ? Send : Smartphone}
              onClick={() => {
                go(2);
                toast.show(channel === "link" ? "Approval link sent (sample: nothing was sent)." : "Hand the phone to the customer.");
              }}
            >
              {channel === "link" ? "Send the link" : "Open it on the tech's phone"}
            </ToolButton>
            <ToolButton onClick={() => setStep(0)}>Back to the estimate</ToolButton>
            <span className="text-sm text-stone-600">
              Total <strong className="tabular-nums text-stone-900">{money(total)}</strong>
            </span>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 lg:order-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">What the customer sees</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600">
              The same approval the product uses: the estimate, a printed name, a signature drawn with a finger and a box
              to authorize the work. Draw any signature in the box to try it.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-stone-700">
              <li className="flex gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                The approval is saved with the name, the signature and the time.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                The approved estimate becomes the job, ready for the dispatch board.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                When the job is done, the same lines become the invoice.
              </li>
            </ul>
          </div>
          <div className="order-1 mx-auto w-full max-w-[340px] lg:order-2">
            <div className="rounded-[1.8rem] border-[7px] border-stone-900 bg-white p-4 shadow-xl">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Example Heating &amp; Cooling Co.</p>
              <p className="mt-2 text-center text-sm font-semibold text-stone-900">Estimate {ESTIMATE_NO}</p>
              <p className="text-center text-xs text-stone-500">Valid until {validUntil}</p>
              <ul className="mt-3 divide-y divide-stone-100 text-[13px]">
                {estimateLines
                  .filter((line) => line.qty > 0)
                  .map((line) => (
                    <li key={line.id} className="flex justify-between gap-3 py-1.5">
                      <span className="text-stone-700">
                        {line.task.task}
                        {line.qty > 1 ? ` × ${line.qty}` : ""}
                      </span>
                      <span className="tabular-nums text-stone-900">{money(line.amount)}</span>
                    </li>
                  ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-stone-300 pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{money(total)}</span>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="demo-signer" className="text-xs font-semibold text-stone-700">
                    Printed name
                  </label>
                  <input
                    id="demo-signer"
                    type="text"
                    autoComplete="off"
                    value={signer}
                    maxLength={60}
                    onChange={(event) => setSigner(event.target.value)}
                    className={`mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm text-stone-900 ${focusRing}`}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-700">Signature</p>
                  <div className="mt-1 [&>div]:h-32">
                    <SignaturePad ref={pad} onStroke={() => setSignError(null)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => pad.current?.clear()}
                    className={`mt-1 text-xs font-semibold text-stone-600 underline-offset-2 hover:underline ${focusRing}`}
                  >
                    Clear signature
                  </button>
                </div>
                <label className="flex items-start gap-2 text-xs leading-relaxed text-stone-700">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(event) => setAuthorized(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#A4823A]"
                  />
                  I authorize the proposed work described in this estimate.
                </label>
                {signError ? (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-inset ring-red-200">
                    {signError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={approve}
                  className={`flex min-h-12 w-full items-center justify-center rounded-lg bg-teal-700 text-base font-bold text-white hover:bg-teal-800 ${focusRing}`}
                >
                  Approve estimate
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
          <div>
            <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200">
              <p className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                {ESTIMATE_NO} approved
              </p>
              <p className="mt-1 text-sm text-emerald-900/80">
                Signed by {signer.trim() || CUSTOMER.name}
                {approvedAt ? ` at ${approvedAt}` : ""}
                {channel === "onsite" ? " on the technician's phone" : " from the link"}.
              </p>
              {signature ? (
                // eslint-disable-next-line @next/next/no-img-element -- a data URL drawn in this browser
                <img src={signature} alt={`Signature of ${signer.trim() || CUSTOMER.name}`} className="mt-3 h-16 w-auto rounded-md bg-white ring-1 ring-emerald-200" />
              ) : null}
            </div>
            <ol className="mt-5 space-y-3">
              {[
                { title: "Estimate approved and signed", text: `${money(total)}, saved with the signature.` },
                { title: `${JOB_NO} created`, text: "The job carries the approved estimate, so the price travels with the work." },
                { title: "On the board", text: "It waits in the unassigned queue until the dispatcher gives it to a technician." },
                { title: "Then the invoice", text: "When the job is done, the approved lines become the draft invoice." },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A4823A] text-[11px] font-semibold text-[#080907]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                    <p className="text-sm text-stone-600">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-stone-500">{JOB_NO}</p>
              <StatusPill tone="warning">Unassigned</StatusPill>
            </div>
            <p className="mt-1 text-lg font-semibold text-stone-900">{estimateLines[0]?.task.task ?? "Approved work"}</p>
            <p className="text-sm text-stone-600">
              {CUSTOMER.name} · {CUSTOMER.address}
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm text-stone-700">
              <CalendarCheck aria-hidden="true" className="h-4 w-4 text-[#77591B]" />
              From approved estimate {ESTIMATE_NO} · {money(total)}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/hvac-dispatch-software#dispatch-demo"
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-800 ${focusRing}`}
              >
                Try assigning it on the board
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                data-cta="estimating-demo-done"
                className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[#A4823A] px-4 text-sm font-semibold text-[#080907] hover:bg-[#C2A05A] ${focusRing}`}
              >
                Send a real estimate, free for 14 days
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      <Toast message={toast.message} />
    </DemoFrame>
  );
}
