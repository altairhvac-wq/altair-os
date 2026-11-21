"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  Link2,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  Field,
  NumberInput,
  SampleTag,
  Segmented,
  SourceTag,
  Switch,
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
  FICA_LABEL,
  RateBar,
  RateDonut,
  MarketBand,
  formatMoney,
  formatPct,
  formatHours,
} from "@/shared/components/resources/labor/LaborCharts";
import {
  BLANK,
  SAMPLE_CREW,
  SHARE_PARAM,
  STORAGE_KEY,
  WORKED_EXAMPLE,
  decodeState,
  encodeState,
  num,
  sanitizeState,
  storableState,
  toFlatRateTask,
  toWorkspaceInput,
  type LaborState,
  type NumericKey,
  type TaskRow,
  type TechRow,
} from "@/shared/components/resources/labor/labor-state";
import {
  calculateWorkspace,
  priceFlatRateTask,
  rateAtEfficiency,
  sumOverhead,
  sumUnbillable,
  type WorkspaceResult,
} from "@/shared/lib/resources/labor-workspace";

/**
 * HVAC Labor Cost Workspace.
 *
 * ============ NOTHING LEAVES THE BROWSER ============
 * There is no request, no form post and no analytics payload with a number
 * in it. "Copy share link" puts the inputs in the page's own query string
 * (the visitor decides who gets it), "Save in this browser" writes them to
 * localStorage, and "Print" is the browser's own print dialog.
 */

const STEPS = [
  { id: "team", label: "Team", title: "Technicians and wages" },
  { id: "burden", label: "Burden", title: "Labor burden" },
  { id: "time", label: "Time", title: "Billable and unbillable time" },
  { id: "overhead", label: "Overhead", title: "Monthly overhead" },
  { id: "margin", label: "Margin", title: "Target net margin" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const PROBLEM_TEXT: Record<string, string> = {
  "no-techs": "Enter at least one technician's wage and paid hours to see a rate.",
  "no-billable-hours":
    "No hours are left to bill. Lower the unbillable hours or raise billable efficiency.",
  "margin-out-of-range": "Set a target margin from 0% to 99%.",
};

/** Analytics label for this tool: a slug written here, never anything typed. */
const TOOL_ID = "labor-workspace";

export function LaborCostWorkspace() {
  const [state, setState] = useState<LaborState>(WORKED_EXAMPLE);
  const [step, setStep] = useState<StepId>("team");
  const [restored, setRestored] = useState<"link" | "saved" | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const toast = useToast();
  const presetsRef = useRef<HTMLDivElement>(null);
  // "Tool used" (first-party analytics, once per page view, never a value):
  // the numbers changed because the visitor pressed or typed something, not
  // because a saved copy or a shared link was restored on load.
  const interacted = useRef(false);
  const markInteracted = () => {
    interacted.current = true;
  };
  useEffect(() => {
    if (interacted.current) trackEngagement("calculator_used", TOOL_ID);
  }, [state]);
  const trackAction = (action: "print" | "link" | "save") =>
    trackEngagement("cta_click", `tool-${TOOL_ID}-${action}`, { repeat: true });

  // After the first render (so server HTML and hydration agree): a shared
  // link wins over this browser's saved copy.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    const fromLink = param ? decodeState(param) : null;
    const saved = sanitizeState(readStorage(STORAGE_KEY));
    /* eslint-disable react-hooks/set-state-in-effect -- reads the URL and browser storage once after mount */
    if (saved) setHasSaved(true);
    if (fromLink) {
      setState(fromLink);
      setRestored("link");
    } else if (saved) {
      setState(saved);
      setRestored("saved");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!presetsOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!presetsRef.current?.contains(event.target as Node)) setPresetsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresetsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [presetsOpen]);

  const input = useMemo(() => toWorkspaceInput(state), [state]);
  const outcome = useMemo(() => calculateWorkspace(input), [input]);
  const result = outcome.ok ? outcome.result : null;

  const set = (key: NumericKey, value: string) => setState((s) => ({ ...s, [key]: value }));
  const patch = (next: Partial<LaborState>) => setState((s) => ({ ...s, ...next }));

  const loadPreset = (preset: LaborState, label: string) => {
    setState(preset);
    setRestored(null);
    setPresetsOpen(false);
    setStep("team");
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    toast.show(label);
  };

  const copyLink = async () => {
    trackAction("link");
    const url = `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${encodeState(state)}#workspace`;
    const ok = await copyText(url);
    toast.show(ok ? "Link copied. Anyone with it sees these numbers." : "Could not copy. Your browser blocked the clipboard.");
  };

  const save = () => {
    trackAction("save");
    const ok = writeStorage(STORAGE_KEY, storableState(state));
    if (ok) setHasSaved(true);
    toast.show(ok ? "Saved in this browser only." : "This browser is blocking storage, so nothing was saved.");
  };

  const forget = () => {
    removeStorage(STORAGE_KEY);
    setHasSaved(false);
    setRestored(null);
    toast.show("Saved numbers removed from this browser.");
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const marginInvalid = num(state.marginPct) >= 100 || num(state.marginPct) < 0;

  return (
    <div id="workspace" className="scroll-mt-24" onPointerDownCapture={markInteracted} onKeyDownCapture={markInteracted}>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_40px_100px_-60px_rgba(28,25,23,0.55)] print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        {/* ---------- toolbar ---------- */}
        <div className="flex flex-col gap-3 bg-[#0d0f0c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 print:hidden">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30">
              <Calculator aria-hidden="true" className="h-4.5 w-4.5 text-[#e8d9ac]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#fff9ea]">Labor Cost Workspace</p>
              <p className="text-[11px] text-[#a99f8f]">Runs in your browser. Nothing you type is sent anywhere.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div ref={presetsRef} className="relative">
              <ToolButton
                variant="dark"
                size="sm"
                icon={RotateCcw}
                onClick={() => setPresetsOpen((open) => !open)}
                ariaLabel="Load sample numbers"
              >
                Load sample
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
              </ToolButton>
              {presetsOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl sm:left-auto sm:right-0"
                >
                  {[
                    {
                      label: "Worked example",
                      text: "1 technician, $30 wage. The numbers in the guide below.",
                      preset: WORKED_EXAMPLE,
                      toastText: "Worked example loaded.",
                    },
                    {
                      label: "Sample crew",
                      text: "3 technicians with the itemized burden. Made-up numbers.",
                      preset: SAMPLE_CREW,
                      toastText: "Sample crew loaded.",
                    },
                    {
                      label: "Start blank",
                      text: "Empty fields for your own numbers.",
                      preset: BLANK,
                      toastText: "Cleared. Enter your own numbers.",
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => loadPreset(item.preset, item.toastText)}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left hover:bg-stone-50 ${focusRing}`}
                    >
                      <span className="block text-sm font-semibold text-stone-900">{item.label}</span>
                      <span className="block text-xs text-stone-500">{item.text}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <ToolButton variant="dark" size="sm" icon={Link2} onClick={copyLink}>
              Copy share link
            </ToolButton>
            <ToolButton variant="dark" size="sm" icon={Save} onClick={save}>
              Save in this browser
            </ToolButton>
            <ToolButton
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={() => {
                trackAction("print");
                window.print();
              }}
            >
              Print / PDF
            </ToolButton>
          </div>
        </div>

        {restored || hasSaved ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-amber-50/60 px-4 py-2 text-[13px] text-stone-700 sm:px-5 print:hidden">
            <span>
              {restored === "link"
                ? "Showing the numbers from a shared link."
                : restored === "saved"
                  ? "Restored the numbers you saved in this browser."
                  : "Your numbers are saved in this browser."}
            </span>
            {hasSaved ? (
              <button type="button" onClick={forget} className={`inline-flex items-center gap-1 rounded font-semibold text-[#77591B] hover:underline ${focusRing}`}>
                <X aria-hidden="true" className="h-3.5 w-3.5" /> Forget saved numbers
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ---------- print header ---------- */}
        <div className="hidden print:block print:pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">Altair Operating System · Labor Cost Workspace</p>
          <p className="mt-1 text-xl font-semibold text-black">HVAC labor rate worksheet</p>
          <p className="text-xs text-stone-600">Estimates from the owner&apos;s own inputs. Not tax or accounting advice.</p>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] print:block">
          {/* ---------- inputs ---------- */}
          <div className="flex min-w-0 flex-col border-stone-200 lg:border-r print:hidden">
            <nav aria-label="Workspace steps" className="border-b border-stone-200 bg-stone-50/70">
              <ol className="flex overflow-x-auto px-2 sm:px-3 [scrollbar-width:none]">
                {STEPS.map((s, index) => {
                  const active = s.id === step;
                  return (
                    <li key={s.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setStep(s.id)}
                        aria-current={active ? "step" : undefined}
                        className={`relative flex min-h-12 items-center gap-2 px-3 text-[13px] font-semibold transition-colors sm:px-4 ${
                          active ? "text-stone-900" : "text-stone-500 hover:text-stone-800"
                        } ${focusRing}`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                            active ? "bg-[#A4823A] text-[#080907]" : index < stepIndex ? "bg-stone-800 text-white" : "bg-stone-200 text-stone-600"
                          }`}
                        >
                          {index < stepIndex ? <Check aria-hidden="true" className="h-3 w-3" /> : index + 1}
                        </span>
                        <span className={active ? "" : "hidden sm:inline"}>{s.label}</span>
                        {active ? <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#A4823A]" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-stone-900">
                  <span className="text-stone-400">{stepIndex + 1}.</span> {STEPS[stepIndex].title}
                </h3>
                <span className="text-xs text-stone-500">
                  Step {stepIndex + 1} of {STEPS.length}
                </span>
              </div>

              {step === "team" ? <TeamStep state={state} setState={setState} result={result} /> : null}
              {step === "burden" ? <BurdenStep state={state} set={set} patch={patch} result={result} /> : null}
              {step === "time" ? <TimeStep state={state} set={set} patch={patch} result={result} /> : null}
              {step === "overhead" ? <OverheadStep state={state} set={set} result={result} /> : null}
              {step === "margin" ? <MarginStep state={state} set={set} invalid={marginInvalid} result={result} /> : null}

              <div className="mt-7 flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
                <ToolButton
                  variant="ghost"
                  icon={ArrowLeft}
                  disabled={stepIndex === 0}
                  onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].id)}
                >
                  Back
                </ToolButton>
                {stepIndex < STEPS.length - 1 ? (
                  <ToolButton variant="primary" onClick={() => setStep(STEPS[stepIndex + 1].id)}>
                    Next: {STEPS[stepIndex + 1].label}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </ToolButton>
                ) : (
                  <a
                    href="#analysis"
                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#A4823A] px-4 text-sm font-semibold text-[#080907] hover:bg-[#C2A05A] ${focusRing}`}
                  >
                    See the analysis <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <InputsAtAGlance state={state} result={result} onJump={setStep} current={step} />
          </div>

          {/* ---------- print-only inputs summary ---------- */}
          <PrintInputs state={state} result={result} />

          {/* ---------- results ---------- */}
          <aside id="results" aria-label="Results" className="scroll-mt-24 bg-stone-50/60 px-4 py-5 sm:px-6 print:bg-white print:px-0">
            <div className="lg:sticky lg:top-24">
              <ResultsPanel result={result} problem={outcome.ok ? null : PROBLEM_TEXT[outcome.problem]} margin={num(state.marginPct)} />
            </div>
          </aside>
        </div>

        {/* ---------- analysis ---------- */}
        <div id="analysis" className="scroll-mt-24 border-t border-stone-200 bg-white px-4 py-6 sm:px-6 print:break-before-page print:px-0">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnalysisCard title="Where each dollar of the rate goes" text="The recommended rate split into what it pays for, per billed hour.">
              {result ? <RateDonut result={result} /> : <EmptyAnalysis />}
            </AnalysisCard>
            <AnalysisCard title="Against published ranges" text="What customers are charged for HVAC labor, from the sources in the guide.">
              {result ? <MarketBand rate={result.recommendedRate} breakEven={result.breakEvenRate} /> : <EmptyAnalysis />}
            </AnalysisCard>
            <RateCard state={state} result={result} set={set} />
          </div>
          <div className="mt-8 border-t border-stone-200 pt-6">
            <Sensitivity state={state} result={result} />
          </div>
          <FlatRateBuilder state={state} setState={setState} set={set} result={result} />
        </div>
      </div>

      {/* phone: the answer stays in view while typing */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Recommended rate</p>
            <p className="text-lg font-semibold tabular-nums text-stone-900">
              {result ? `${formatMoney(result.recommendedRate)}/hr` : "Check inputs"}
              {result ? (
                <span className="ml-2 text-xs font-medium text-stone-500">break-even {formatMoney(result.breakEvenRate)}</span>
              ) : null}
            </p>
          </div>
          <a
            href="#results"
            className={`inline-flex min-h-10 items-center rounded-lg bg-[#0d0f0c] px-3.5 text-[13px] font-semibold text-[#f3ebdd] ${focusRing}`}
          >
            Results
          </a>
        </div>
      </div>

      <Toast message={toast.message} />
    </div>
  );
}

/* ====================== steps ====================== */

type SetFn = (key: NumericKey, value: string) => void;

function StepIntro({ children }: { readonly children: React.ReactNode }) {
  return <p className="mb-5 max-w-2xl text-sm leading-relaxed text-stone-600">{children}</p>;
}

function TeamStep({
  state,
  setState,
  result,
}: {
  readonly state: LaborState;
  readonly setState: React.Dispatch<React.SetStateAction<LaborState>>;
  readonly result: WorkspaceResult | null;
}) {
  const update = (id: string, next: Partial<TechRow>) =>
    setState((s) => ({ ...s, techs: s.techs.map((t) => (t.id === id ? { ...t, ...next } : t)) }));
  const add = () =>
    setState((s) => ({
      ...s,
      techs: [...s.techs, { id: rowId("t"), name: `Technician ${s.techs.length + 1}`, wage: "30", paidHours: "40" }],
    }));
  const remove = (id: string) => setState((s) => ({ ...s, techs: s.techs.filter((t) => t.id !== id) }));

  return (
    <div>
      <StepIntro>
        One row per field technician on the payroll. Use the base hourly wage from the pay stub, before taxes and
        benefits, and the hours a week you pay them for. Owners who run calls count too, at what you would pay
        someone to replace you.
      </StepIntro>

      <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500 md:grid">
        <span>Technician</span>
        <span>Wage</span>
        <span>Paid hrs / wk</span>
        <span className="text-right">Labor per billed hr</span>
        <span className="sr-only">Remove</span>
      </div>
      <ul className="space-y-3 md:space-y-2">
        {state.techs.map((tech, index) => {
          const techResult = result?.techs.find((t) => t.id === tech.id);
          return (
            <li
              key={tech.id}
              className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 p-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] md:items-center md:rounded-none md:border-0 md:p-1"
            >
              <div className="col-span-2 md:col-span-1">
                <TextInput
                  value={tech.name}
                  onChange={(value) => update(tech.id, { name: value })}
                  ariaLabel={`Technician ${index + 1} name`}
                  placeholder={`Technician ${index + 1}`}
                  maxLength={40}
                  compact
                />
              </div>
              <NumberInput
                value={tech.wage}
                onChange={(value) => update(tech.id, { wage: value })}
                prefix="$"
                suffix="/hr"
                ariaLabel={`Technician ${index + 1} hourly wage`}
                placeholder="0"
                compact
              />
              <NumberInput
                value={tech.paidHours}
                onChange={(value) => update(tech.id, { paidHours: value })}
                suffix="hrs"
                ariaLabel={`Technician ${index + 1} paid hours a week`}
                placeholder="40"
                compact
              />
              <p className="flex items-center text-sm tabular-nums text-stone-700 md:justify-end">
                <span className="mr-2 text-xs text-stone-500 md:hidden">Labor / billed hr</span>
                {techResult && techResult.billableHoursPerYear > 0 ? formatMoney(techResult.laborPerBillableHour) : "–"}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => remove(tech.id)}
                  disabled={state.techs.length === 1}
                  aria-label={`Remove technician ${index + 1}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 ${focusRing}`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ToolButton icon={Plus} onClick={add} disabled={state.techs.length >= 25}>
          Add technician
        </ToolButton>
        {result ? (
          <p className="text-sm text-stone-600">
            {state.techs.length} {state.techs.length === 1 ? "technician" : "technicians"} ·{" "}
            <span className="font-semibold tabular-nums text-stone-900">{formatMoney(result.totalWages, 0)}</span> wages a year
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BurdenStep({
  state,
  set,
  patch,
  result,
}: {
  readonly state: LaborState;
  readonly set: SetFn;
  readonly patch: (next: Partial<LaborState>) => void;
  readonly result: WorkspaceResult | null;
}) {
  const lines = result?.burdenLines;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-relaxed text-stone-600">
          What it costs to employ a technician on top of the wage. Use one percentage, or itemize it line by line.
        </p>
        <Segmented
          label="Burden detail"
          value={state.burdenMode}
          onChange={(value) => patch({ burdenMode: value })}
          options={[
            { value: "simple", label: "Simple" },
            { value: "advanced", label: "Advanced" },
          ]}
        />
      </div>

      {state.burdenMode === "simple" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Labor burden"
            hint="Payroll taxes, workers' comp, insurance and benefits, as a share of wages. Your payroll provider or accountant can give you this number."
          >
            {({ id, hintId }) => (
              <NumberInput id={id} describedBy={hintId} value={state.burdenPct} onChange={(v) => set("burdenPct", v)} suffix="% of wages" />
            )}
          </Field>
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm leading-relaxed text-stone-600">
            Not sure? Switch to <strong className="text-stone-800">Advanced</strong> to build it from the federal
            payroll taxes, your state rates, health insurance, paid time off and the truck.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-medium text-stone-800">{FICA_LABEL}</p>
                <SourceTag>IRS · fixed by law</SourceTag>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                6.2% Social Security on wages up to $184,500 (2026) plus 1.45% Medicare. Applied automatically.
              </p>
              <p className="mt-2 text-sm font-semibold tabular-nums text-stone-900">{lines ? `${formatMoney(lines.fica, 0)} a year` : "–"}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-medium text-stone-800">FUTA 0.6% on the first $7,000</p>
                <SourceTag>IRS · fixed by law</SourceTag>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                Federal unemployment after the full state credit: $42 a year per employee. Applied automatically.
              </p>
              <p className="mt-2 text-sm font-semibold tabular-nums text-stone-900">{lines ? `${formatMoney(lines.futa, 0)} a year` : "–"}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State unemployment (SUTA)" badge={<SampleTag />} hint="Your rate from the state's annual notice.">
              {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.sutaPct} onChange={(v) => set("sutaPct", v)} suffix="%" />}
            </Field>
            <Field label="SUTA wage base" badge={<SampleTag />} hint="Wages taxed per employee each year. Varies by state.">
              {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.sutaBase} onChange={(v) => set("sutaBase", v)} prefix="$" suffix="/yr" />}
            </Field>
            <Field label="Workers' comp" badge={<SampleTag />} hint="From your policy: rate for your HVAC class code, as a % of wages.">
              {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.wcPct} onChange={(v) => set("wcPct", v)} suffix="% of wages" />}
            </Field>
            <Field
              label="Health insurance, employer share"
              badge={<SourceTag>KFF 2025 average</SourceTag>}
              hint="Per technician per year. $7,885 is the 2025 average employer share for single coverage. Use your plan's number."
            >
              {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.health} onChange={(v) => set("health", v)} prefix="$" suffix="/yr" />}
            </Field>
            <Field label="Paid days off and holidays" badge={<SampleTag />} hint="Paid days not worked a year. Sample: 10 vacation days plus 6 holidays.">
              {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.ptoDays} onChange={(v) => set("ptoDays", v)} suffix="days/yr" />}
            </Field>
            <Field label="Vehicle and tools per technician" badge={<SampleTag />} hint="Truck payment, fuel, insurance, tools and phone for each technician.">
              {({ id, hintId }) => <NumberInput id={id} describedBy={hintId} value={state.vehicle} onChange={(v) => set("vehicle", v)} prefix="$" suffix="/mo" />}
            </Field>
          </div>
          {lines && result ? (
            <div className="overflow-hidden rounded-xl border border-stone-200">
              <table className="w-full text-sm">
                <caption className="sr-only">Burden for the whole crew, per year</caption>
                <tbody className="divide-y divide-stone-100">
                  {[
                    ["Social Security and Medicare", lines.fica],
                    ["Federal unemployment (FUTA)", lines.futa],
                    ["State unemployment (SUTA)", lines.suta],
                    ["Workers' comp", lines.workersComp],
                    ["Health insurance", lines.health],
                    ["Vehicle and tools", lines.vehicle],
                    ["Paid time off (wages for days not worked)", lines.pto],
                  ].map(([label, value]) => (
                    <tr key={label as string}>
                      <td className="px-4 py-2 text-stone-700">{label}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-stone-900">{formatMoney(value as number, 0)}</td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50 font-semibold">
                    <td className="px-4 py-2.5 text-stone-900">Effective burden on worked wages</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[#77591B]">{formatPct(result.effectiveBurdenRate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TimeStep({
  state,
  set,
  patch,
  result,
}: {
  readonly state: LaborState;
  readonly set: SetFn;
  readonly patch: (next: Partial<LaborState>) => void;
  readonly result: WorkspaceResult | null;
}) {
  const unbillable = sumUnbillable(toWorkspaceInput(state).unbillable);
  const rows: { key: NumericKey; label: string; hint: string }[] = [
    { key: "drive", label: "Drive time", hint: "Between calls, to the supply house." },
    { key: "shop", label: "Shop and parts runs", hint: "Loading the truck, restocking." },
    { key: "training", label: "Training and meetings", hint: "Classes, safety, morning meetings." },
    { key: "callbacks", label: "Free callbacks and warranty", hint: "Return trips nobody pays for." },
    { key: "otherHours", label: "Paperwork and other", hint: "Anything paid and not billed." },
  ];
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-relaxed text-stone-600">
          Billable hours are hours that end up on an invoice. This is the input that moves the rate the most.
        </p>
        <Segmented
          label="How to count billable time"
          value={state.billableMode}
          onChange={(value) => patch({ billableMode: value })}
          options={[
            { value: "hours", label: "Itemize hours" },
            { value: "efficiency", label: "Efficiency %" },
          ]}
        />
      </div>

      {state.billableMode === "hours" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <Field key={row.key} label={row.label} hint={row.hint}>
                {({ id, hintId }) => (
                  <NumberInput id={id} describedBy={hintId} value={state[row.key]} onChange={(v) => set(row.key, v)} suffix="hrs/wk" placeholder="0" />
                )}
              </Field>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-500">Per technician, per week. Taken off each technician&apos;s paid hours.</p>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Billable efficiency" hint="The share of paid hours that is billed to a customer. 30 billed out of 40 paid is 75%.">
            {({ id, hintId }) => (
              <NumberInput id={id} describedBy={hintId} value={state.efficiencyPct} onChange={(v) => set("efficiencyPct", v)} suffix="% of paid hours" />
            )}
          </Field>
        </div>
      )}

      {result ? (
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-stone-50 p-3 ring-1 ring-inset ring-stone-200 sm:gap-3 sm:p-4">
          <Stat label={state.billableMode === "hours" ? "Unbillable / tech / wk" : "Billable / tech / wk"} value={state.billableMode === "hours" ? formatHours(unbillable) : formatHours(result.techs[0]?.billableHoursPerWeek ?? 0)} />
          <Stat label="Billable efficiency" value={formatPct(result.billableEfficiency)} />
          <Stat label="Billable hours / yr" value={Math.round(result.billableHoursPerYear).toLocaleString("en-US")} />
        </div>
      ) : null}
    </div>
  );
}

function OverheadStep({ state, set, result }: { readonly state: LaborState; readonly set: SetFn; readonly result: WorkspaceResult | null }) {
  const rows: { key: NumericKey; label: string; hint: string }[] = [
    { key: "rent", label: "Rent and utilities", hint: "Shop, office, storage." },
    { key: "office", label: "Office staff", hint: "Dispatch, CSRs, bookkeeping, with their burden." },
    { key: "insurance", label: "Business insurance", hint: "General liability, umbrella, property." },
    { key: "software", label: "Software and phones", hint: "Field service software, accounting, phones." },
    { key: "marketing", label: "Marketing", hint: "Ads, website, wraps, directories." },
    { key: "vehicles", label: "Shared vehicles", hint: "Trucks not assigned to a technician." },
    { key: "otherOverhead", label: "Everything else", hint: "Accounting, licenses, bank fees, owner salary." },
  ];
  const total = sumOverhead(toWorkspaceInput(state).overhead);
  return (
    <div>
      <StepIntro>
        Every monthly cost that is not field labor or materials, for the whole company. It is spread across the
        billable hours of every technician on the Team step.
      </StepIntro>
      <div className="mb-3 flex justify-end">
        <SampleTag>sample values · use your own</SampleTag>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Field key={row.key} label={row.label} hint={row.hint}>
            {({ id, hintId }) => (
              <NumberInput id={id} describedBy={hintId} value={state[row.key]} onChange={(v) => set(row.key, v)} prefix="$" suffix="/mo" placeholder="0" />
            )}
          </Field>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-stone-50 p-3 ring-1 ring-inset ring-stone-200 sm:gap-3 sm:p-4">
        <Stat label="Overhead / month" value={formatMoney(total, 0)} />
        <Stat label="Overhead / year" value={formatMoney(total * 12, 0)} />
        <Stat label="Per billable hour" value={result ? formatMoney(result.overheadPerBillableHour) : "–"} />
      </div>
    </div>
  );
}

function MarginStep({
  state,
  set,
  invalid,
  result,
}: {
  readonly state: LaborState;
  readonly set: SetFn;
  readonly invalid: boolean;
  readonly result: WorkspaceResult | null;
}) {
  return (
    <div>
      <StepIntro>
        The profit you want left after every cost, as a share of the price. A margin, not a markup: a 20% margin
        means $20 of every $100 billed is profit, which is a 25% markup on cost.
      </StepIntro>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target net margin" hint={invalid ? "Enter a margin from 0% to 99%." : "Profit as a share of the billed rate."}>
          {({ id, hintId }) => (
            <NumberInput id={id} describedBy={hintId} value={state.marginPct} onChange={(v) => set("marginPct", v)} suffix="%" invalid={invalid} />
          )}
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          {["10", "15", "20", "25", "30"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => set("marginPct", value)}
              aria-pressed={state.marginPct === value}
              className={`min-h-11 rounded-lg border px-3.5 text-sm font-semibold tabular-nums transition-colors ${
                state.marginPct === value ? "border-[#A4823A] bg-amber-50 text-[#77591B]" : "border-stone-300 text-stone-700 hover:border-[#C2A05A]"
              } ${focusRing}`}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>
      {result ? (
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-stone-50 p-3 ring-1 ring-inset ring-stone-200 sm:gap-3 sm:p-4">
          <Stat label="Markup on cost" value={formatPct(result.breakEvenRate > 0 ? result.recommendedRate / result.breakEvenRate - 1 : 0)} />
          <Stat label="Profit / billed hr" value={formatMoney(result.profitPerBillableHour)} />
          <Stat label="Profit / year" value={formatMoney(result.annualProfitAtRate, 0)} />
        </div>
      ) : null}
    </div>
  );
}

function AnalysisCard({ title, text, children }: { readonly title: string; readonly text: string; readonly children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <h3 className="text-[15px] font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-stone-600">{text}</p>
      {children}
    </section>
  );
}

function EmptyAnalysis() {
  return <p className="mt-4 rounded-lg bg-stone-50 px-3 py-6 text-center text-sm text-stone-500">Appears once the inputs give a rate.</p>;
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 sm:text-[11px]">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-stone-900 sm:text-lg">{value}</p>
    </div>
  );
}

/* ====================== results ====================== */

function ResultsPanel({
  result,
  problem,
  margin,
}: {
  readonly result: WorkspaceResult | null;
  readonly problem: string | null;
  readonly margin: number;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="status">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-stone-900">No rate yet</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-700">{problem}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[#0d0f0c] p-5 text-[#f3ebdd] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">Recommended rate</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[2.6rem] font-semibold leading-none tracking-tight tabular-nums text-[#fff9ea]" aria-live="polite">
            {formatMoney(result.recommendedRate)}
          </span>
          <span className="text-sm text-[#a99f8f]">per billed hour</span>
        </p>
        <p className="mt-2 text-[13px] text-[#c9bfae]">
          Quote <span className="font-semibold text-[#e8d9ac]">{formatMoney(result.recommendedRateRounded, 0)}</span> rounded up, at a{" "}
          {Number.isFinite(margin) ? `${margin}%` : ""} net margin.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2.5">
        <ResultTile label="Break-even rate" value={formatMoney(result.breakEvenRate)} note="per billed hour" strong />
        <ResultTile label="Loaded labor cost" value={formatMoney(result.loadedCostPerPaidHour)} note="per paid hour" />
        <ResultTile label="Labor-only rate" value={formatMoney(result.laborPerBillableHour)} note="per billed hour" />
        <ResultTile label="Overhead-only rate" value={formatMoney(result.overheadPerBillableHour)} note="per billed hour" />
        <ResultTile label="Profit" value={formatMoney(result.profitPerBillableHour)} note="per billed hour" positive />
        <ResultTile label="Revenue at this rate" value={formatMoney(result.annualRevenueAtRate, 0)} note={`${Math.round(result.billableHoursPerYear).toLocaleString("en-US")} billed hrs / yr`} />
      </dl>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-[13px] font-semibold text-stone-900">What one billed hour pays for</p>
        <RateBar result={result} />
      </div>
    </div>
  );
}

function ResultTile({
  label,
  value,
  note,
  strong,
  positive,
}: {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly strong?: boolean;
  readonly positive?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-white p-3 ${strong ? "border-[#C2A05A]/70 ring-1 ring-inset ring-[#C2A05A]/30" : "border-stone-200"}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums ${positive ? "text-emerald-700" : "text-stone-900"}`}>{value}</dd>
      <dd className="text-[11px] text-stone-500">{note}</dd>
    </div>
  );
}

/* ====================== analysis ====================== */

const EFFICIENCY_ROWS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];

function Sensitivity({ state, result }: { readonly state: LaborState; readonly result: WorkspaceResult | null }) {
  const target = num(state.marginPct) / 100;
  const margins = Array.from(new Set([0.1, 0.2, 0.3, target]))
    .filter((m) => m >= 0 && m < 1)
    .sort((a, b) => a - b);
  const input = toWorkspaceInput(state);
  const avgPaid = result ? result.paidHoursPerYear / 52 / Math.max(1, result.techs.length) : 40;
  const current = result?.billableEfficiency ?? null;
  const rows = [...EFFICIENCY_ROWS];
  if (current !== null && !rows.some((r) => Math.abs(r - current) < 0.0049) && current > 0 && current <= 1) rows.push(current);
  rows.sort((a, b) => a - b);

  return (
    <section aria-labelledby="sensitivity-heading" className="min-w-0">
      <h3 id="sensitivity-heading" className="text-base font-semibold text-stone-900">
        Billable hours vs. rate
      </h3>
      <p className="mt-1 text-sm text-stone-600">
        The same crew and overhead at different billable efficiencies. Your current row is highlighted.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full min-w-[460px] text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
            <tr>
              <th scope="col" className="px-3 py-2.5 text-left font-semibold">Billable</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Break-even</th>
              {margins.map((m) => (
                <th key={m} scope="col" className={`px-3 py-2.5 text-right font-semibold ${Math.abs(m - target) < 1e-9 ? "text-[#77591B]" : ""}`}>
                  {Math.round(m * 1000) / 10}% margin
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((eff) => {
              const isCurrent = current !== null && Math.abs(eff - current) < 0.0049;
              const base = rateAtEfficiency(input, eff, 0);
              return (
                <tr key={eff} className={isCurrent ? "bg-amber-50/80 font-semibold" : ""}>
                  <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-stone-800">
                    {formatPct(eff)} <span className="text-xs font-normal text-stone-500">· {formatHours(avgPaid * eff)}/wk</span>
                    {isCurrent ? <span className="ml-1.5 rounded bg-[#A4823A] px-1.5 py-0.5 text-[10px] font-semibold text-[#080907]">You</span> : null}
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums text-stone-700">{base ? formatMoney(base.breakEven) : "–"}</td>
                  {margins.map((m) => {
                    const r = rateAtEfficiency(input, eff, m);
                    return (
                      <td key={m} className={`px-3 py-2 text-right tabular-nums ${Math.abs(m - target) < 1e-9 ? "text-stone-900" : "text-stone-600"}`}>
                        {r ? formatMoney(r.rate) : "–"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RateCard({ state, result, set }: { readonly state: LaborState; readonly result: WorkspaceResult | null; readonly set: SetFn }) {
  const mult = Math.max(1, num(state.afterHoursMult));
  const base = result ? result.recommendedRateRounded : 0;
  const avgWage = result && result.paidHoursPerYear > 0 ? result.totalWages / result.paidHoursPerYear : 0;
  return (
    <section aria-labelledby="ratecard-heading" className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5 md:col-span-2 xl:col-span-1">
      <h3 id="ratecard-heading" className="text-[15px] font-semibold text-stone-900">
        Rate card: standard vs. after hours
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
        Nights, weekends and holidays are usually billed at a multiple of the standard rate.
      </p>
      <div className="mt-4">
        <Field label="After-hours multiplier" badge={<SampleTag />} hint="Applied to labor only. 1.5 means time and a half.">
          {({ id, hintId }) => (
            <NumberInput id={id} describedBy={hintId} value={state.afterHoursMult} onChange={(v) => set("afterHoursMult", v)} suffix="× standard" />
          )}
        </Field>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-lg bg-stone-50 p-3 ring-1 ring-inset ring-stone-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Standard hours</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{result ? formatMoney(base, 0) : "–"}<span className="text-xs font-medium text-stone-500">/hr</span></p>
          </div>
          <div className="rounded-lg bg-stone-50 p-3 ring-1 ring-inset ring-stone-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">After hours</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{result ? formatMoney(base * mult) : "–"}<span className="text-xs font-medium text-stone-500">/hr</span></p>
          </div>
        </div>
        {result ? (
          <p className="mt-3 text-xs leading-relaxed text-stone-600">
            Check it covers the call: overtime at time and a half adds {formatMoney(avgWage * 0.5)} an hour in wages on
            your {formatMoney(avgWage)} average wage, before payroll taxes, plus any on-call pay.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function FlatRateBuilder({
  state,
  setState,
  set,
  result,
}: {
  readonly state: LaborState;
  readonly setState: React.Dispatch<React.SetStateAction<LaborState>>;
  readonly set: SetFn;
  readonly result: WorkspaceResult | null;
}) {
  const rate =
    state.rateSource === "custom" ? num(state.customRate) : result ? result.recommendedRateRounded : 0;
  const mult = num(state.afterHoursMult);
  const fee = num(state.diagnosticFee);
  const showFee = fee > 0;

  const update = (id: string, next: Partial<TaskRow>) =>
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...next } : t)) }));
  const add = () =>
    setState((s) => ({ ...s, tasks: [...s.tasks, { id: rowId("k"), task: "", bookHours: "", partCost: "", markupPct: "100" }] }));
  const remove = (id: string) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));

  return (
    <section aria-labelledby="flatrate-heading" className="mt-8 border-t border-stone-200 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="flatrate-heading" className="text-base font-semibold text-stone-900">
            Flat-rate price builder
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Price = book hours × labor rate + part cost with your markup. After hours, the multiplier applies to the
            labor only. Book hours and parts below are samples: use your own job history.
          </p>
        </div>
        <Segmented
          label="Labor rate for the price book"
          value={state.rateSource}
          onChange={(value) => setState((s) => ({ ...s, rateSource: value }))}
          options={[
            { value: "recommended", label: result ? `Use ${formatMoney(result.recommendedRateRounded, 0)}` : "Recommended" },
            { value: "custom", label: "My own rate" },
          ]}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {state.rateSource === "custom" ? (
          <Field label="Labor rate">
            {({ id }) => <NumberInput id={id} value={state.customRate} onChange={(v) => set("customRate", v)} prefix="$" suffix="/hr" placeholder="0" />}
          </Field>
        ) : null}
        <Field label="Diagnostic / service call fee" hint="Optional. Leave at 0 if you do not charge one.">
          {({ id, hintId }) => (
            <NumberInput id={id} describedBy={hintId} value={state.diagnosticFee} onChange={(v) => set("diagnosticFee", v)} prefix="$" placeholder="0" />
          )}
        </Field>
        <div className="flex items-end pb-2 sm:col-span-2">
          <Switch
            checked={state.creditDiagnostic}
            onChange={(checked) => setState((s) => ({ ...s, creditDiagnostic: checked }))}
            label="Credit the fee toward the repair"
            description="On: the customer pays the larger of the fee or the repair."
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Flat-rate price book</caption>
          <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
            <tr>
              <th scope="col" className="px-3 py-2.5 text-left font-semibold">Task</th>
              <th scope="col" className="w-24 px-2 py-2.5 text-left font-semibold">Book hrs</th>
              <th scope="col" className="w-28 px-2 py-2.5 text-left font-semibold">Part cost</th>
              <th scope="col" className="w-24 px-2 py-2.5 text-left font-semibold">Markup</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Standard</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">After hours</th>
              {showFee ? <th scope="col" className="px-3 py-2.5 text-right font-semibold">Customer pays</th> : null}
              <th scope="col" className="w-12 px-2 py-2.5 print:hidden"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {state.tasks.length === 0 ? (
              <tr>
                <td colSpan={showFee ? 8 : 7} className="px-4 py-8 text-center text-sm text-stone-500">
                  No tasks yet. Add the jobs you price most often.
                </td>
              </tr>
            ) : (
              state.tasks.map((task, index) => {
                const line = priceFlatRateTask(toFlatRateTask(task), rate, mult, fee, state.creditDiagnostic);
                return (
                  <tr key={task.id}>
                    <td className="px-2 py-1.5">
                      <TextInput value={task.task} onChange={(v) => update(task.id, { task: v })} ariaLabel={`Task ${index + 1}`} placeholder="Task name" maxLength={60} compact />
                    </td>
                    <td className="px-1 py-1.5">
                      <NumberInput value={task.bookHours} onChange={(v) => update(task.id, { bookHours: v })} ariaLabel={`Task ${index + 1} book hours`} placeholder="0" compact />
                    </td>
                    <td className="px-1 py-1.5">
                      <NumberInput value={task.partCost} onChange={(v) => update(task.id, { partCost: v })} prefix="$" ariaLabel={`Task ${index + 1} part cost`} placeholder="0" compact />
                    </td>
                    <td className="px-1 py-1.5">
                      <NumberInput value={task.markupPct} onChange={(v) => update(task.id, { markupPct: v })} suffix="%" ariaLabel={`Task ${index + 1} part markup`} placeholder="0" compact />
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-stone-900">{formatMoney(line.standard)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-stone-700">{formatMoney(line.afterHours)}</td>
                    {showFee ? <td className="px-3 py-1.5 text-right tabular-nums text-stone-700">{formatMoney(line.withDiagnostic)}</td> : null}
                    <td className="px-1 py-1.5 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => remove(task.id)}
                        aria-label={`Remove task ${index + 1}`}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-700 ${focusRing}`}
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <ToolButton icon={Plus} onClick={add} disabled={state.tasks.length >= 30} className="print:hidden">
          Add task
        </ToolButton>
        <p className="text-xs text-stone-500">
          Labor at {formatMoney(rate)}/hr · after hours ×{mult > 1 ? mult : 1} · a 100% markup doubles the part cost.
        </p>
      </div>
    </section>
  );
}

/* ====================== inputs at a glance ====================== */

function InputsAtAGlance({
  state,
  result,
  onJump,
  current,
}: {
  readonly state: LaborState;
  readonly result: WorkspaceResult | null;
  readonly onJump: (step: StepId) => void;
  readonly current: StepId;
}) {
  const input = toWorkspaceInput(state);
  const techs = state.techs.length;
  const cells: { step: StepId; label: string; value: string }[] = [
    {
      step: "team",
      label: "Team",
      value: result
        ? `${techs} ${techs === 1 ? "tech" : "techs"} · avg ${formatMoney(result.totalWages / result.paidHoursPerYear)}`
        : `${techs} ${techs === 1 ? "tech" : "techs"}`,
    },
    {
      step: "burden",
      label: "Burden",
      value: result ? `${formatPct(result.effectiveBurdenRate)}${state.burdenMode === "advanced" ? " itemized" : ""}` : `${state.burdenPct || 0}%`,
    },
    {
      step: "time",
      label: "Billable",
      value: result ? `${formatPct(result.billableEfficiency)} of paid hrs` : "–",
    },
    { step: "overhead", label: "Overhead", value: `${formatMoney(sumOverhead(input.overhead), 0)}/mo` },
    { step: "margin", label: "Margin", value: `${state.marginPct || 0}%` },
  ];
  return (
    <div className="mt-auto border-t border-stone-200 bg-stone-50/70 px-4 py-4 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Your inputs at a glance</p>
      <ul className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cells.map((cell) => (
          <li key={cell.step}>
            <button
              type="button"
              onClick={() => onJump(cell.step)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                cell.step === current ? "border-[#C2A05A] bg-white" : "border-stone-200 bg-white hover:border-stone-300"
              } ${focusRing}`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-stone-500">{cell.label}</span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold tabular-nums text-stone-900">{cell.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ====================== print summary ====================== */

function PrintInputs({ state, result }: { readonly state: LaborState; readonly result: WorkspaceResult | null }) {
  const unbillable = sumUnbillable(toWorkspaceInput(state).unbillable);
  const overhead = sumOverhead(toWorkspaceInput(state).overhead);
  return (
    <div className="hidden print:block print:pb-4">
      <p className="text-sm font-semibold text-black">Inputs</p>
      <table className="mt-1 w-full text-xs">
        <tbody>
          {state.techs.map((tech, index) => (
            <tr key={tech.id} className="border-b border-stone-200">
              <td className="py-1">{tech.name || `Technician ${index + 1}`}</td>
              <td className="py-1 text-right">${tech.wage || 0}/hr · {tech.paidHours || 0} paid hrs/wk</td>
            </tr>
          ))}
          <tr className="border-b border-stone-200">
            <td className="py-1">Labor burden</td>
            <td className="py-1 text-right">
              {state.burdenMode === "simple"
                ? `${state.burdenPct || 0}% of wages`
                : `Itemized: SUTA ${state.sutaPct}% on $${state.sutaBase}, workers' comp ${state.wcPct}%, health $${state.health}/yr, ${state.ptoDays} days off, vehicle $${state.vehicle}/mo${result ? ` (effective ${formatPct(result.effectiveBurdenRate)})` : ""}`}
            </td>
          </tr>
          <tr className="border-b border-stone-200">
            <td className="py-1">Billable time</td>
            <td className="py-1 text-right">
              {state.billableMode === "hours" ? `${formatHours(unbillable)} unbillable per tech per week` : `${state.efficiencyPct}% billable efficiency`}
            </td>
          </tr>
          <tr className="border-b border-stone-200">
            <td className="py-1">Overhead</td>
            <td className="py-1 text-right">{formatMoney(overhead, 0)} a month</td>
          </tr>
          <tr>
            <td className="py-1">Target net margin</td>
            <td className="py-1 text-right">{state.marginPct || 0}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
