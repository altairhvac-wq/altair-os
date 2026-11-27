"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import {
  ChevronDown,
  ClipboardCopy,
  Eye,
  FileText,
  PencilLine,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Field,
  NumberInput,
  Segmented,
  Switch,
  TextArea,
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
import {
  BLANK_INVOICE,
  BLANK_TEMPLATE_TEXT,
  COMPANY_KEYS,
  LINE_KIND_LABEL,
  QTY_UNIT,
  SAMPLE_INVOICE,
  STORAGE_KEY_COMPANY,
  type InvoiceKind,
  type InvoiceState,
  type TextKey,
} from "@/shared/components/resources/invoice/invoice-state";
import { InvoicePaper, computeInvoice } from "@/shared/components/resources/invoice/InvoicePaper";
import { formatCents, type InvoiceLine } from "@/shared/lib/resources/invoice-builder";

/**
 * HVAC Invoice Builder.
 *
 * ============ CUSTOMER DETAILS NEVER LEAVE THE BROWSER ============
 * No request, no form post, no analytics payload with anything typed in it,
 * and no share link (a link would put a customer's name and address in a
 * URL). The only thing ever stored is the visitor's OWN company block, and
 * only when they turn "Remember my company details" on.
 */

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Analytics label for this tool: a slug written here, never anything typed. */
const TOOL_ID = "invoice-builder";

export function InvoiceBuilder() {
  const [state, setState] = useState<InvoiceState>(BLANK_INVOICE);
  const [view, setView] = useState<"form" | "preview">("form");
  const [blankPrint, setBlankPrint] = useState(false);
  const [rememberCompany, setRememberCompany] = useState(false);
  const toast = useToast();

  // "Tool used" (first-party analytics, once per page view, never a value):
  // the invoice changed because the visitor pressed or typed something, not
  // because today's date or a remembered company block was filled in on load.
  const interacted = useRef(false);
  const markInteracted = () => {
    interacted.current = true;
  };
  useEffect(() => {
    if (interacted.current) trackEngagement("calculator_used", TOOL_ID);
  }, [state]);
  const trackAction = (action: "print" | "print-blank" | "copy-blank") =>
    trackEngagement("cta_click", `tool-${TOOL_ID}-${action}`, { repeat: true });
  const printInvoice = () => {
    trackAction("print");
    window.print();
  };

  // After mount: today's date, and the visitor's own saved company block.
  useEffect(() => {
    const saved = readStorage(STORAGE_KEY_COMPANY);
    /* eslint-disable react-hooks/set-state-in-effect -- reads the clock and browser storage once after mount */
    setState((s) => {
      const next = { ...s, date: s.date || todayIso() };
      if (saved && typeof saved === "object") {
        for (const key of COMPANY_KEYS) {
          const value = (saved as Record<string, unknown>)[key];
          if (typeof value === "string") next[key] = value.slice(0, 160);
        }
      }
      return next;
    });
    if (saved) setRememberCompany(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Blank-template printing: render the blank paper, print, then restore.
  useEffect(() => {
    if (!blankPrint) return;
    const done = () => setBlankPrint(false);
    window.addEventListener("afterprint", done);
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [blankPrint]);

  const persistCompany = (next: InvoiceState, remember: boolean) => {
    if (!remember) return;
    writeStorage(
      STORAGE_KEY_COMPANY,
      Object.fromEntries(COMPANY_KEYS.map((key) => [key, next[key]])),
    );
  };

  const set = (key: TextKey, value: string) =>
    setState((s) => {
      const next = { ...s, [key]: value };
      if ((COMPANY_KEYS as readonly string[]).includes(key)) persistCompany(next, rememberCompany);
      return next;
    });
  const patch = (next: Partial<InvoiceState>) => setState((s) => ({ ...s, ...next }));

  const toggleRemember = (on: boolean) => {
    setRememberCompany(on);
    if (on) {
      persistCompany(state, true);
      toast.show("Your company details will be remembered in this browser.");
    } else {
      removeStorage(STORAGE_KEY_COMPANY);
      toast.show("Company details forgotten.");
    }
  };

  const keepCompany = (base: InvoiceState): InvoiceState => {
    if (!rememberCompany) return base;
    const next = { ...base };
    for (const key of COMPANY_KEYS) next[key] = state[key];
    return next;
  };

  const loadSample = () => {
    setState(SAMPLE_INVOICE);
    toast.show("Sample invoice loaded. Every name and price is made up.");
  };
  const clear = () => {
    setState(keepCompany({ ...BLANK_INVOICE, date: todayIso() }));
    toast.show(rememberCompany ? "Cleared. Your company details were kept." : "Cleared.");
  };
  const copyBlank = async () => {
    trackAction("copy-blank");
    const ok = await copyText(BLANK_TEMPLATE_TEXT);
    toast.show(ok ? "Blank template copied. Paste it into any document." : "Could not copy. Your browser blocked the clipboard.");
  };

  const updateLine = (id: string, next: Partial<InvoiceLine>) =>
    setState((s) => ({ ...s, lines: s.lines.map((l) => (l.id === id ? { ...l, ...next } : l)) }));
  const removeLine = (id: string) => setState((s) => ({ ...s, lines: s.lines.filter((l) => l.id !== id) }));
  const addLine = (kind: InvoiceLine["kind"], description = "") =>
    setState((s) =>
      s.lines.length >= 40
        ? s
        : {
            ...s,
            lines: [
              ...s.lines,
              {
                id: rowId("l"),
                kind,
                description,
                partNumber: "",
                qty: kind === "labor" ? "" : "1",
                price: "",
                taxable: kind === "part" || kind === "refrigerant",
              },
            ],
          },
    );

  const computed = useMemo(() => computeInvoice(state), [state]);
  const printBlank = () => {
    trackAction("print-blank");
    setBlankPrint(true);
  };
  // Which of the folded sections already hold something (a loaded sample, or the owner's own entries).
  const has = (...keys: (keyof InvoiceState)[]) => keys.some((key) => String(state[key] ?? "").trim() !== "");
  const filled = {
    equipment: has("equipmentType", "make", "model", "serial", "location", "refrigerantType", "lbsAdded", "lbsRecovered"),
    work: has("complaint", "cause", "correction"),
    tax: state.kind !== "standard" || [state.taxRate, state.discount, state.amountPaid].some((value) => Number.parseFloat(value) > 0),
    terms: has("paymentInstructions", "warranty", "permit", "inspection", "technician", "notes"),
  };

  return (
    <div id="invoice-builder" className="scroll-mt-24" onPointerDownCapture={markInteracted} onKeyDownCapture={markInteracted}>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_40px_100px_-60px_rgba(28,25,23,0.55)] print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        {/* ---------- toolbar ---------- */}
        {/* A phone shows one row: the name and "Load sample". The PDF button is in the bar at the bottom of
            the screen there, and Clear and the blank copies are under the form. */}
        <div className="flex items-center justify-between gap-3 bg-[#0d0f0c] px-4 py-2.5 sm:flex-col sm:items-stretch sm:px-5 sm:py-3 xl:flex-row xl:items-center print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30 max-sm:hidden">
              <FileText aria-hidden="true" className="h-4.5 w-4.5 text-[#e8d9ac]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#fff9ea]">Invoice Builder</p>
              <p className="hidden text-[11px] text-[#a99f8f] sm:block">Customer details stay on this device. Nothing is uploaded.</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ToolButton variant="dark" size="sm" icon={Sparkles} onClick={loadSample}>
              Load sample
            </ToolButton>
            <ToolButton variant="dark" size="sm" icon={RotateCcw} onClick={clear} className="max-sm:hidden">
              Clear
            </ToolButton>
            <ToolButton variant="dark" size="sm" icon={ClipboardCopy} onClick={copyBlank} className="max-sm:hidden">
              Copy blank template
            </ToolButton>
            <ToolButton variant="dark" size="sm" icon={FileText} onClick={printBlank} className="max-sm:hidden">
              Print blank
            </ToolButton>
            <ToolButton variant="primary" size="sm" icon={Printer} onClick={printInvoice} className="max-sm:hidden">
              Print / Save PDF
            </ToolButton>
          </div>
        </div>

        {/* ---------- phone: form / preview switch ---------- */}
        <div className="sticky top-16 z-20 flex border-b border-stone-200 bg-white lg:hidden print:hidden" role="tablist" aria-label="Builder view">
          {(
            [
              { id: "form", label: "Edit", icon: PencilLine },
              { id: "preview", label: "Preview", icon: Eye },
            ] as const
          ).map((tab) => {
            const active = view === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setView(tab.id);
                  document.getElementById("invoice-builder")?.scrollIntoView({ block: "start" });
                }}
                className={`relative flex min-h-12 flex-1 items-center justify-center gap-2 text-sm font-semibold ${
                  active ? "text-stone-900" : "text-stone-500"
                } ${focusRing}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {tab.label}
                {active ? <span aria-hidden="true" className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-[#A4823A]" /> : null}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] print:block">
          {/* ---------- form ---------- */}
          <div className={`min-w-0 border-stone-200 lg:block lg:border-r print:hidden ${view === "form" ? "block" : "hidden"}`}>
            <div className="divide-y divide-stone-200">
              <p className="bg-stone-50 px-4 py-2.5 text-[13px] leading-snug text-stone-700 sm:px-6">
                <strong className="font-semibold text-stone-900">Four parts make a complete invoice</strong>
                <span className="hidden sm:inline">: the details, your company, the customer and the lines</span>. The folded sections are there
                when the job needs them.
              </p>
              <FormSection n={1} title="Invoice details">
                <div className="mb-4">
                  <Segmented
                    label="Invoice type"
                    value={state.kind}
                    onChange={(value: InvoiceKind) => patch({ kind: value })}
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "deposit", label: "Deposit" },
                      { value: "progress", label: "Progress" },
                    ]}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Invoice number">{({ id }) => <TextInput id={id} value={state.number} onChange={(v) => set("number", v)} placeholder="1001" maxLength={20} />}</Field>
                  <Field label="Customer PO (optional)">{({ id }) => <TextInput id={id} value={state.poNumber} onChange={(v) => set("poNumber", v)} placeholder="PO number" maxLength={30} />}</Field>
                  <Field label="Invoice date">{({ id }) => <TextInput id={id} type="date" value={state.date} onChange={(v) => set("date", v)} />}</Field>
                  <Field label="Due date">{({ id }) => <TextInput id={id} type="date" value={state.dueDate} onChange={(v) => set("dueDate", v)} />}</Field>
                  <Field label="Payment terms" className="sm:col-span-2">
                    {({ id }) => (
                      <div className="flex flex-wrap gap-2">
                        <div className="min-w-0 flex-1 basis-48">
                          <TextInput id={id} value={state.terms} onChange={(v) => set("terms", v)} placeholder="Due on receipt" maxLength={60} />
                        </div>
                        {["Due on receipt", "Net 15", "Net 30"].map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => set("terms", term)}
                            aria-pressed={state.terms === term}
                            className={`min-h-11 rounded-lg border px-3 text-[13px] font-semibold ${
                              state.terms === term ? "border-[#A4823A] bg-amber-50 text-[#77591B]" : "border-stone-300 text-stone-700 hover:border-[#C2A05A]"
                            } ${focusRing}`}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    )}
                  </Field>
                </div>
              </FormSection>

              <FormSection n={2} title="Your company">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company name" className="sm:col-span-2">{({ id }) => <TextInput id={id} value={state.companyName} onChange={(v) => set("companyName", v)} placeholder="Your company name" autoComplete="organization" />}</Field>
                  <Field label="Address" className="sm:col-span-2">{({ id }) => <TextInput id={id} value={state.companyAddress} onChange={(v) => set("companyAddress", v)} placeholder="Street, city, state, ZIP" />}</Field>
                  <Field label="Phone">{({ id }) => <TextInput id={id} type="tel" value={state.companyPhone} onChange={(v) => set("companyPhone", v)} placeholder="(555) 555-0100" />}</Field>
                  <Field label="Email">{({ id }) => <TextInput id={id} type="email" value={state.companyEmail} onChange={(v) => set("companyEmail", v)} placeholder="office@yourcompany.com" />}</Field>
                  <Field label="License number" hint="Some states require it on invoices or contracts.">{({ id }) => <TextInput id={id} value={state.companyLicense} onChange={(v) => set("companyLicense", v)} placeholder="If your state requires it" maxLength={40} />}</Field>
                  <div className="flex items-end pb-1">
                    <Switch checked={rememberCompany} onChange={toggleRemember} label="Remember my company details" description="Saved in this browser only. Customer details are never saved." />
                  </div>
                </div>
              </FormSection>

              <FormSection n={3} title="Customer and site">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Customer name" className="sm:col-span-2">{({ id }) => <TextInput id={id} value={state.customerName} onChange={(v) => set("customerName", v)} placeholder="Name or business" />}</Field>
                  <Field label="Billing address" className="sm:col-span-2">{({ id }) => <TextInput id={id} value={state.customerAddress} onChange={(v) => set("customerAddress", v)} placeholder="Street, city, state, ZIP" />}</Field>
                  <Field label="Phone">{({ id }) => <TextInput id={id} value={state.customerPhone} onChange={(v) => set("customerPhone", v)} placeholder="Customer phone" />}</Field>
                  <Field label="Email">{({ id }) => <TextInput id={id} value={state.customerEmail} onChange={(v) => set("customerEmail", v)} placeholder="Customer email" />}</Field>
                  <Field label="Service address" hint="Leave empty when it is the billing address." className="sm:col-span-2">{({ id }) => <TextInput id={id} value={state.serviceAddress} onChange={(v) => set("serviceAddress", v)} placeholder="Same as billing" />}</Field>
                </div>
              </FormSection>

              <FormSection n={4} title="Equipment and refrigerant" tag="For service work" filled={filled.equipment}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Equipment" className="sm:col-span-2">{({ id }) => <TextInput id={id} value={state.equipmentType} onChange={(v) => set("equipmentType", v)} placeholder="e.g. Gas furnace, heat pump outdoor unit" />}</Field>
                  <Field label="Make">{({ id }) => <TextInput id={id} value={state.make} onChange={(v) => set("make", v)} placeholder="From the data plate" />}</Field>
                  <Field label="Model">{({ id }) => <TextInput id={id} value={state.model} onChange={(v) => set("model", v)} placeholder="Model number" />}</Field>
                  <Field label="Serial">{({ id }) => <TextInput id={id} value={state.serial} onChange={(v) => set("serial", v)} placeholder="Serial number" />}</Field>
                  <Field label="Location">{({ id }) => <TextInput id={id} value={state.location} onChange={(v) => set("location", v)} placeholder="Attic, side yard, roof" />}</Field>
                  <Field label="Refrigerant type">
                    {({ id }) => (
                      <div className="space-y-2">
                        <TextInput id={id} value={state.refrigerantType} onChange={(v) => set("refrigerantType", v)} placeholder="R-410A, R-454B, R-32, R-22" maxLength={20} />
                        <div className="flex flex-wrap gap-1.5">
                          {["R-410A", "R-454B", "R-32", "R-22"].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => set("refrigerantType", type)}
                              className={`min-h-8 rounded-md border px-2 text-xs font-semibold ${state.refrigerantType === type ? "border-[#A4823A] bg-amber-50 text-[#77591B]" : "border-stone-300 text-stone-600 hover:border-[#C2A05A]"} ${focusRing}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Added">{({ id }) => <NumberInput id={id} value={state.lbsAdded} onChange={(v) => set("lbsAdded", v)} suffix="lb" placeholder="0" />}</Field>
                    <Field label="Recovered">{({ id }) => <NumberInput id={id} value={state.lbsRecovered} onChange={(v) => set("lbsRecovered", v)} suffix="lb" placeholder="0" />}</Field>
                  </div>
                </div>
              </FormSection>

              <FormSection n={5} title="Work performed" tag="For service work" filled={filled.work}>
                <div className="grid gap-4">
                  <Field label="Complaint" hint="What the customer said was wrong.">{({ id }) => <TextArea id={id} value={state.complaint} onChange={(v) => set("complaint", v)} placeholder="e.g. No heat upstairs" />}</Field>
                  <Field label="Cause" hint="What the technician found.">{({ id }) => <TextArea id={id} value={state.cause} onChange={(v) => set("cause", v)} placeholder="e.g. Flame sensor coated, furnace locking out" />}</Field>
                  <Field label="Correction" hint="What was done, in words the customer understands.">{({ id }) => <TextArea id={id} value={state.correction} onChange={(v) => set("correction", v)} placeholder="e.g. Cleaned flame sensor, tested three full cycles" rows={3} />}</Field>
                </div>
              </FormSection>

              <FormSection n={6} title="Labor, parts and fees">
                {state.lines.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm text-stone-600">
                    No line items yet. Add labor, parts, refrigerant or a fee below.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {state.lines.map((line, index) => (
                      <LineEditor
                        key={line.id}
                        line={line}
                        index={index}
                        amount={computed.totals.lineCents[index] ?? 0}
                        onChange={(next) => updateLine(line.id, next)}
                        onRemove={() => removeLine(line.id)}
                      />
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <ToolButton size="sm" icon={Plus} onClick={() => addLine("labor")}>Labor</ToolButton>
                  <ToolButton size="sm" icon={Plus} onClick={() => addLine("part")}>Part</ToolButton>
                  <ToolButton size="sm" icon={Plus} onClick={() => addLine("refrigerant", state.refrigerantType ? `Refrigerant ${state.refrigerantType}` : "Refrigerant")}>Refrigerant ($/lb)</ToolButton>
                  <ToolButton size="sm" icon={Plus} onClick={() => addLine("fee", "Diagnostic service call")}>Service call</ToolButton>
                  <ToolButton size="sm" icon={Plus} onClick={() => addLine("fee", "Permit fee")}>Permit</ToolButton>
                  <ToolButton size="sm" icon={Plus} onClick={() => addLine("fee", "Old equipment removal and disposal")}>Disposal</ToolButton>
                </div>
              </FormSection>

              <FormSection n={7} title="Tax, discount and payments" tag="If it applies" filled={filled.tax}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sales tax rate" hint="Applied to lines marked taxable. Check your state's rules for parts and labor.">
                    {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.taxRate} onChange={(v) => set("taxRate", v)} suffix="%" placeholder="0" />}
                  </Field>
                  <Field label="Discount">
                    {({ id }) => (
                      <div className="flex gap-2">
                        <Segmented
                          label="Discount type"
                          value={state.discountMode}
                          onChange={(value) => patch({ discountMode: value })}
                          options={[
                            { value: "amount", label: "$" },
                            { value: "percent", label: "%" },
                          ]}
                        />
                        <div className="min-w-0 flex-1">
                          <NumberInput id={id} value={state.discount} onChange={(v) => set("discount", v)} prefix={state.discountMode === "amount" ? "$" : undefined} suffix={state.discountMode === "percent" ? "%" : undefined} placeholder="0" />
                        </div>
                      </div>
                    )}
                  </Field>
                  <div className="sm:col-span-2">
                    <Switch
                      checked={state.discountReducesTax}
                      onChange={(checked) => patch({ discountReducesTax: checked })}
                      label="Discount lowers the taxed amount"
                      description="Leave off when the discount is on labor or a service fee that is not taxed."
                    />
                  </div>
                  {state.kind !== "standard" ? (
                    <Field label={state.kind === "deposit" ? "Deposit requested" : "This invoice bills"} hint={state.kind === "deposit" ? "Share of the job total due now." : "Share of the contract total due on this progress invoice."}>
                      {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.depositPct} onChange={(v) => set("depositPct", v)} suffix="% of total" />}
                    </Field>
                  ) : null}
                  <Field label={state.kind === "standard" ? "Already paid (deposit received)" : "Previously paid"}>
                    {({ id }) => <NumberInput id={id} value={state.amountPaid} onChange={(v) => set("amountPaid", v)} prefix="$" placeholder="0.00" />}
                  </Field>
                </div>
              </FormSection>

              <FormSection n={8} title="Payment, warranty and permits" tag="If it applies" filled={filled.terms}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="How to pay" className="sm:col-span-2">{({ id }) => <TextArea id={id} value={state.paymentInstructions} onChange={(v) => set("paymentInstructions", v)} placeholder="Payment link, card, check payable to..., ACH" />}</Field>
                  <Field label="Warranty" className="sm:col-span-2">{({ id }) => <TextInput id={id} value={state.warranty} onChange={(v) => set("warranty", v)} placeholder="e.g. 1 year labor; parts per manufacturer" maxLength={200} />}</Field>
                  <Field label="Permit number">{({ id }) => <TextInput id={id} value={state.permit} onChange={(v) => set("permit", v)} placeholder="For installs" maxLength={40} />}</Field>
                  <Field label="Inspection status">{({ id }) => <TextInput id={id} value={state.inspection} onChange={(v) => set("inspection", v)} placeholder="Scheduled, passed" maxLength={60} />}</Field>
                  <Field label="Technician">{({ id }) => <TextInput id={id} value={state.technician} onChange={(v) => set("technician", v)} placeholder="Technician name" maxLength={60} />}</Field>
                  <Field label="Note to customer" className="sm:col-span-2">{({ id }) => <TextArea id={id} value={state.notes} onChange={(v) => set("notes", v)} placeholder="Recommendations, thank-you note" />}</Field>
                </div>
              </FormSection>
              {/* phone: the toolbar's other buttons */}
              <div className="flex flex-wrap gap-2 px-4 py-4 sm:hidden">
                <ToolButton size="sm" icon={RotateCcw} onClick={clear}>
                  Clear
                </ToolButton>
                <ToolButton size="sm" icon={ClipboardCopy} onClick={copyBlank}>
                  Copy blank template
                </ToolButton>
                <ToolButton size="sm" icon={FileText} onClick={printBlank}>
                  Print blank
                </ToolButton>
              </div>
            </div>
          </div>

          {/* ---------- preview ---------- */}
          <div className={`min-w-0 bg-stone-100/80 px-3 py-5 sm:px-6 lg:block print:block print:bg-white print:p-0 ${view === "preview" ? "block" : "hidden"}`}>
            <div className="lg:sticky lg:top-24">
              <div className="mb-3 flex items-center justify-between print:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Live preview</p>
                <p className="text-xs text-stone-500">Prints on one page, letter or A4</p>
              </div>
              <InvoicePaper state={state} computed={computed} blank={blankPrint} />
            </div>
          </div>
        </div>
      </div>

      {/* phone: the balance stays in view */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{computed.dueLabel}</p>
            <p className="text-lg font-semibold tabular-nums text-stone-900">{formatCents(computed.dueNowCents)}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView(view === "form" ? "preview" : "form")}
              className={`inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3 text-[13px] font-semibold text-stone-800 ${focusRing}`}
            >
              {view === "form" ? "Preview" : "Edit"}
            </button>
            <button
              type="button"
              onClick={printInvoice}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#0d0f0c] px-3 text-[13px] font-semibold text-[#f3ebdd] ${focusRing}`}
            >
              <Printer aria-hidden="true" className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>

      <Toast message={toast.message} />
    </div>
  );
}

/**
 * One numbered part of the form. With a `tag` the section folds: it starts
 * closed while it is empty, so a first-time visitor sees the four parts every
 * invoice needs and not 46 boxes (2026-11-27 audit), and opens by itself when
 * it holds something (a loaded sample, a deposit invoice). A press on the
 * heading always wins.
 */
function FormSection({
  n,
  title,
  children,
  tag,
  filled = false,
}: {
  readonly n: number;
  readonly title: string;
  readonly children: React.ReactNode;
  /** Short note beside the title, e.g. "If it applies". Makes the section foldable. */
  readonly tag?: string;
  readonly filled?: boolean;
}) {
  const [pressed, setPressed] = useState<boolean | null>(null);
  const bodyId = useId();
  const badge = (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[11px] font-semibold text-white">{n}</span>
  );
  if (!tag) {
    return (
      <section className="px-4 py-5 sm:px-6">
        <h3 className="mb-4 flex items-center gap-2.5 text-[15px] font-semibold text-stone-900">
          {badge}
          {title}
        </h3>
        {children}
      </section>
    );
  }
  const open = pressed ?? filled;
  return (
    <section className="px-4 sm:px-6">
      <h3 className="text-[15px] font-semibold text-stone-900">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setPressed(!open)}
          className={`flex min-h-14 w-full items-center gap-2.5 rounded-lg text-left ${focusRing}`}
        >
          {badge}
          <span className="min-w-0 flex-1">{title}</span>
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">{!open && filled ? "Filled in" : tag}</span>
          <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-stone-500 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        </button>
      </h3>
      <div id={bodyId} hidden={!open} className="pb-5 pt-1">
        {children}
      </div>
    </section>
  );
}

function LineEditor({
  line,
  index,
  amount,
  onChange,
  onRemove,
}: {
  readonly line: InvoiceLine;
  readonly index: number;
  readonly amount: number;
  readonly onChange: (next: Partial<InvoiceLine>) => void;
  readonly onRemove: () => void;
}) {
  const showPartNumber = line.kind === "part";
  return (
    <li className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`kind-${line.id}`}>Line {index + 1} type</label>
        <select
          id={`kind-${line.id}`}
          value={line.kind}
          onChange={(event) => onChange({ kind: event.target.value as InvoiceLine["kind"] })}
          className={`min-h-10 rounded-lg border border-stone-300 bg-stone-50 px-2 text-[13px] font-semibold text-stone-800 ${focusRing}`}
        >
          {(Object.keys(LINE_KIND_LABEL) as InvoiceLine["kind"][]).map((kind) => (
            <option key={kind} value={kind}>{LINE_KIND_LABEL[kind]}</option>
          ))}
        </select>
        <div className="min-w-0 flex-1 basis-48">
          <TextInput value={line.description} onChange={(v) => onChange({ description: v })} ariaLabel={`Line ${index + 1} description`} placeholder="Description" maxLength={120} compact />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove line ${index + 1}`}
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700 ${focusRing}`}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <div className={`mt-2 grid gap-2 ${showPartNumber ? "grid-cols-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]" : "grid-cols-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto]"} items-center`}>
        {showPartNumber ? (
          <TextInput value={line.partNumber} onChange={(v) => onChange({ partNumber: v })} ariaLabel={`Line ${index + 1} part number`} placeholder="Part no." maxLength={40} compact />
        ) : null}
        <NumberInput value={line.qty} onChange={(v) => onChange({ qty: v.replace(/-/g, "") })} suffix={QTY_UNIT[line.kind]} ariaLabel={`Line ${index + 1} ${line.kind === "labor" ? "hours" : "quantity"}`} placeholder="0" compact />
        <NumberInput value={line.price} onChange={(v) => onChange({ price: v })} prefix="$" suffix={line.kind === "labor" ? "/hr" : line.kind === "refrigerant" ? "/lb" : "each"} ariaLabel={`Line ${index + 1} ${line.kind === "labor" ? "rate" : "price"}`} placeholder="0.00" compact />
        <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
          <label className="flex min-h-10 cursor-pointer items-center gap-1.5 text-xs font-medium text-stone-600">
            <input
              type="checkbox"
              checked={line.taxable}
              onChange={(event) => onChange({ taxable: event.target.checked })}
              className="h-4 w-4 accent-[#A4823A]"
            />
            Taxable
          </label>
          <span className="min-w-[84px] text-right text-sm font-semibold tabular-nums text-stone-900">{formatCents(amount)}</span>
        </div>
      </div>
    </li>
  );
}
