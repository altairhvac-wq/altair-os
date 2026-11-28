"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { skipSetupStepAction, type SetupActionResult } from "@/app/actions/business-setup";
import type { BusinessNumbersRecord } from "@/lib/database/queries/business-numbers";
import type { SetupPriceBookItem } from "@/lib/database/queries/business-setup";
import {
  PriceListStep,
  RateStep,
  ServiceCallStep,
  ShopStep,
  TargetStep,
  type RatePrefill,
  type ShopStepValues,
} from "@/shared/components/business-setup/steps";
import { SETUP_SAVE_FAILED_MESSAGE } from "@/shared/components/business-setup/StepFrame";
import { useCarried, type CarriedNumbers } from "@/shared/components/resources/calc/carry";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { altairMcCardClass, altairMcCardPadClass } from "@/shared/design-system/components/mc-surface";
import { altairCanvasInkClass, altairCanvasInkMutedClass } from "@/shared/design-system/foundation";
import { deriveBusinessNumbers } from "@/shared/lib/business-numbers/derive";
import { formatCount, formatDollars, formatDollarsShort } from "@/shared/lib/business-numbers/format";
import { SERVICE_CALL_SETUP_KEY, type StarterTask } from "@/shared/lib/business-numbers/starter-price-list";
import { BUSINESS_SETUP_STEPS, nextBusinessSetupStep, type BusinessSetupStepId } from "@/shared/types/business-numbers";

/**
 * The guided setup: five short steps that put a new company's prices into
 * the product, so the first estimate is not written into an empty app.
 *
 * ============ NOBODY IS HELD HERE ============
 * This is a page inside the product, with the product's menu around it.
 * Every step can be skipped, "I'll do this later" is on the first screen,
 * and each step saves on its own, so closing the tab loses nothing that was
 * saved. Coming back opens on what is left.
 *
 * ============ NUMBERS FROM THE WEBSITE ============
 * Someone who worked their rate out on the public calculators and then
 * signed up in the same browser is offered those numbers on the first
 * screen. They stay in the browser until the owner presses the labor rate
 * step's own button.
 */

export type SetupView = "welcome" | BusinessSetupStepId | "done";

type StepMeta = { readonly title: string; readonly text: string; readonly minutes: number };

const STEP_META: Record<BusinessSetupStepId, StepMeta> = {
  shop: { title: "Your shop", text: "Phone, address and sales tax. These go on every estimate and invoice.", minutes: 1 },
  rate: { title: "Your labor rate", text: "What to charge for an hour of work, from what an hour really costs you. Or type the rate you already use.", minutes: 3 },
  "service-call": { title: "Your service call fee", text: "The fee for coming out, checked against what the visit costs you.", minutes: 1 },
  "price-list": { title: "Your price list", text: "Common jobs priced at your rate. Keep the ones you do; they become your price book.", minutes: 3 },
  target: { title: "Your monthly target", text: "How many jobs cover the month.", minutes: 1 },
};

type GuidedSetupProps = {
  readonly companyId: string;
  readonly firstName: string | null;
  readonly initialRecord: BusinessNumbersRecord;
  readonly initialView: SetupView;
  readonly shop: ShopStepValues;
  readonly starterTasks: readonly StarterTask[];
  /** Price book items an earlier visit to the setup made, as they stand now. */
  readonly existingItems: readonly SetupPriceBookItem[];
};

function round2(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** The website calculators' saved numbers, as the labor rate step's boxes. */
function toRatePrefill(carried: CarriedNumbers): RatePrefill {
  const prefill: RatePrefill = { laborRate: round2(carried.billedRate), averageWage: round2(carried.averageWage) };
  if (carried.averageWage > 0 && carried.loadedLaborCost >= carried.averageWage) {
    prefill.payrollBurdenPercent = round2((carried.loadedLaborCost / carried.averageWage - 1) * 100);
  }
  if (carried.monthlyOverhead !== null) prefill.monthlyOverhead = round2(carried.monthlyOverhead);
  if (carried.techCount !== null) prefill.technicianCount = String(Math.max(1, Math.round(carried.techCount)));
  return prefill;
}

function describeCarried(carried: CarriedNumbers): string {
  const parts = [`Labor rate ${formatDollarsShort(carried.billedRate)} an hour`];
  if (carried.techCount !== null) parts.push(`${formatCount(carried.techCount)} ${Math.round(carried.techCount) === 1 ? "technician" : "technicians"}`);
  if (carried.monthlyOverhead !== null) parts.push(`${formatDollarsShort(carried.monthlyOverhead)} a month in shop costs`);
  return `${parts.join(", ")}.`;
}

export function GuidedSetup({ companyId, firstName, initialRecord, initialView, shop, starterTasks, existingItems }: GuidedSetupProps) {
  const [record, setRecord] = useState(initialRecord);
  const [view, setView] = useState<SetupView>(initialView);
  const [shopValues, setShopValues] = useState(shop);
  const [items, setItems] = useState<readonly SetupPriceBookItem[]>(existingItems);
  const [prefill, setPrefill] = useState<RatePrefill | null>(null);
  const [websiteOffer, setWebsiteOffer] = useState<"open" | "used" | "declined">("open");
  const [skipProblem, setSkipProblem] = useState<string | null>(null);
  // Which step is being skipped right now. It is the step, not a yes/no: the
  // moment the skip is saved the next step is on screen, and that one must
  // not open greyed out and saying "Saving".
  const [skippingStep, setSkippingStep] = useState<BusinessSetupStepId | null>(null);
  const [, startSkip] = useTransition();
  const carried = useCarried();
  const router = useRouter();

  const { numbers, setup } = record;
  const derived = useMemo(() => deriveBusinessNumbers(numbers), [numbers]);
  const visited = BUSINESS_SETUP_STEPS.filter((step) => setup.steps[step]).length;
  const nextStep = nextBusinessSetupStep(setup);
  // What the price book really holds from the setup: jobs that are live in it.
  const priceListCount = items.filter((item) => item.key !== SERVICE_CALL_SETUP_KEY && item.active).length;
  const firstRender = useRef(true);

  // The address bar follows the screen, so a reload, or coming back on
  // another device, opens the same step. It goes through the router: an
  // address set behind its back is put back the next time the page refreshes
  // its data, which every save does.
  useEffect(() => {
    const url = view === "welcome" ? "/get-started" : `/get-started?step=${view}`;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      router.replace(url, { scroll: false });
    }
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // A new screen starts at its top, with the question focused. The page
    // scrolls inside the app shell on a computer and as a whole on a phone;
    // scrollIntoView finds whichever applies.
    const screen = document.querySelector<HTMLElement>('section[aria-label="Guided setup"]');
    screen?.scrollIntoView({ block: "start" });
    window.scrollTo({ top: 0 });
    screen?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [view, router]);

  function go(next: SetupView) {
    setSkipProblem(null);
    setView(next);
  }

  function after(step: BusinessSetupStepId): SetupView {
    const index = BUSINESS_SETUP_STEPS.indexOf(step);
    return index + 1 < BUSINESS_SETUP_STEPS.length ? BUSINESS_SETUP_STEPS[index + 1] : "done";
  }

  function before(step: BusinessSetupStepId): SetupView {
    const index = BUSINESS_SETUP_STEPS.indexOf(step);
    return index > 0 ? BUSINESS_SETUP_STEPS[index - 1] : "welcome";
  }

  function saved(step: BusinessSetupStepId, result: SetupActionResult) {
    if (result.record) setRecord(result.record);
    // The calculator numbers have done their job once the rate is saved:
    // coming back to the step must show what was saved, not what was offered.
    if (step === "rate") setPrefill(null);
    go(after(step));
  }

  function skip(step: BusinessSetupStepId) {
    if (skippingStep !== null) return;
    setSkippingStep(step);
    startSkip(async () => {
      let result: SetupActionResult;
      try {
        result = await skipSetupStepAction(step, companyId);
      } catch {
        setSkipProblem(SETUP_SAVE_FAILED_MESSAGE);
        setSkippingStep(null);
        return;
      }
      setSkippingStep(null);
      if (result.error || !result.record) {
        setSkipProblem(result.error ?? SETUP_SAVE_FAILED_MESSAGE);
        return;
      }
      setRecord(result.record);
      go(after(step));
    });
  }

  const common = (step: BusinessSetupStepId) => ({
    companyId,
    number: BUSINESS_SETUP_STEPS.indexOf(step) + 1,
    numbers,
    onSaved: (result: SetupActionResult) => saved(step, result),
    onBack: () => go(before(step)),
    onSkip: () => skip(step),
    skipping: skippingStep === step,
  });

  const skipNotice = skipProblem ? (
    <p role="alert" className="mb-3 rounded-xl border border-[rgba(185,28,28,0.28)] bg-[rgba(254,242,242,0.92)] px-3 py-2.5 text-[13px] leading-relaxed text-[#991B1B]">
      {skipProblem}
    </p>
  ) : null;

  const frame = "mx-auto w-full min-w-0 max-w-[60rem] px-1 pb-6 sm:px-2";

  if (view === "shop") {
    return (
      <section aria-label="Guided setup" className={frame}>
        {skipNotice}
        <ShopStep {...common("shop")} key="shop" initial={shopValues} onValuesSaved={setShopValues} />
      </section>
    );
  }

  if (view === "rate") {
    return (
      <section aria-label="Guided setup" className={frame}>
        {skipNotice}
        <RateStep {...common("rate")} key={`rate-${prefill ? "website" : "own"}`} prefill={prefill} />
      </section>
    );
  }

  if (view === "service-call") {
    return (
      <section aria-label="Guided setup" className={frame}>
        {skipNotice}
        <ServiceCallStep {...common("service-call")} key="service-call" />
      </section>
    );
  }

  if (view === "price-list") {
    return (
      <section aria-label="Guided setup" className={frame}>
        {skipNotice}
        <PriceListStep
          {...common("price-list")}
          key="price-list"
          starterTasks={starterTasks}
          existingItems={items}
          keptBefore={setup.steps["price-list"] === "done"}
          onGoToRate={() => go("rate")}
          onKept={setItems}
        />
      </section>
    );
  }

  if (view === "target") {
    return (
      <section aria-label="Guided setup" className={frame}>
        {skipNotice}
        <TargetStep {...common("target")} key="target" />
      </section>
    );
  }

  if (view === "done") {
    const skipped = BUSINESS_SETUP_STEPS.filter((step) => setup.steps[step] !== "done");
    const chips: { readonly step: BusinessSetupStepId; readonly label: string; readonly value: string | null; readonly note: string }[] = [
      {
        step: "rate",
        label: "Labor rate",
        value: numbers.laborRate !== null ? formatDollarsShort(numbers.laborRate) : null,
        note: derived.costPerBilledHour !== null ? `per billed hour. Costs you ${formatDollars(derived.costPerBilledHour)}.` : "per billed hour.",
      },
      {
        step: "service-call",
        label: "Service call",
        value: numbers.serviceCallFee !== null ? formatDollarsShort(numbers.serviceCallFee) : null,
        note: numbers.serviceCallCredited ? "credited toward the repair." : "for coming out.",
      },
      {
        step: "price-list",
        label: "Price book",
        value: priceListCount > 0 ? `${formatCount(priceListCount)} ${priceListCount === 1 ? "job" : "jobs"}` : null,
        note: "priced at your rate.",
      },
      {
        step: "target",
        label: "Monthly target",
        value: derived.breakEvenJobs !== null && derived.breakEvenJobs > 0 ? `${formatCount(derived.breakEvenJobs)} ${derived.breakEvenJobs === 1 ? "job" : "jobs"}` : null,
        note: numbers.monthlyOverhead !== null ? `to cover ${formatDollarsShort(numbers.monthlyOverhead)} of shop costs.` : "to cover the month.",
      },
    ];

    return (
      <section aria-label="Guided setup" className={frame}>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand-metal-text)]">
          {skipped.length === 0 ? "All five steps done" : `${BUSINESS_SETUP_STEPS.length - skipped.length} of ${BUSINESS_SETUP_STEPS.length} steps done`}
        </p>
        <h1 tabIndex={-1} className={`mt-1 text-[26px] font-bold leading-tight tracking-tight outline-none ${altairCanvasInkClass}`}>
          {skipped.length === 0 ? "Your shop is set up" : "Your shop is started"}
        </h1>
        <p className={`mt-1 max-w-2xl text-sm leading-relaxed ${altairCanvasInkMutedClass}`}>
          These are your numbers. You can change any of them under{" "}
          <Link href="/settings/business-numbers" className="font-semibold underline underline-offset-2">
            Settings, Numbers
          </Link>
          . A new service call fee reaches your price book by itself. A new labor rate does not re-price your list by itself yet: open your price list here again and save it.
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {chips.map((chip) => (
            <li key={chip.step} className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-altair-ink-on-paper-muted">{chip.label}</p>
              {chip.value !== null ? (
                <>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-altair-ink-on-paper">{chip.value}</p>
                  <p className="mt-0.5 text-xs leading-snug text-altair-ink-on-paper-secondary">{chip.note}</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-base font-semibold text-altair-ink-on-paper-secondary">Not set yet</p>
                  <button type="button" onClick={() => go(chip.step)} className="mt-1 min-h-11 text-left text-sm font-semibold text-[var(--brand-metal-text)] underline underline-offset-2 sm:min-h-0">
                    Set it now
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className={`mt-4 ${altairMcCardClass} ${altairMcCardPadClass}`}>
          <h2 className="text-[15px] font-bold tracking-tight text-altair-ink-on-paper">What to do first</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {[
              { title: "Write your first estimate", text: priceListCount > 0 ? "Your price book is ready to pick from." : "Add lines by hand, or from your price book once it has items.", href: "/sales?create=1", label: "New estimate", primary: true },
              { title: "Bring in your customers", text: "Upload a spreadsheet, or add one by hand.", href: "/customers/import", label: "Add customers", primary: false },
              { title: "See your price book", text: "Every job you kept, with its price. Add, change or remove any of them.", href: "/price-book", label: "Open price book", primary: false },
            ].map((action, index) => (
              <li key={action.href} className="flex flex-col gap-2 rounded-xl border border-altair-border bg-altair-paper-elevated p-3 sm:flex-row sm:items-center">
                <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-altair-graphite text-xs font-bold text-altair-paper">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-altair-ink-on-paper">{action.title}</span>
                  <span className="block text-[13px] leading-snug text-altair-ink-on-paper-secondary">{action.text}</span>
                </span>
                <Link href={action.href} className={buttonClassName(action.primary ? "primary" : "secondary", "sm", "shrink-0")}>
                  {action.label}
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-4 text-sm">
          <Link href="/" className="font-semibold text-[var(--brand-metal-text)] underline underline-offset-2">
            Go to your dashboard
          </Link>
        </p>
      </section>
    );
  }

  // ---- the first screen
  const showOffer = carried !== null && websiteOffer === "open" && setup.steps.rate !== "done";
  const startAt: SetupView = nextStep ?? "done";

  return (
    <section aria-label="Guided setup" className={frame}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand-metal-text)]">{visited > 0 ? "Welcome back" : firstName ? `Welcome, ${firstName}` : "Welcome"}</p>
      <h1 tabIndex={-1} className={`mt-1 text-[26px] font-bold leading-tight tracking-tight outline-none ${altairCanvasInkClass}`}>
        Let&apos;s set up your shop
      </h1>
      <p className={`mt-1 max-w-2xl text-sm leading-relaxed ${altairCanvasInkMutedClass}`}>
        Five short steps, about ten minutes. When you finish, your prices and your price book are already in the app. Nothing here is locked in: you can skip any step and change any number later.
      </p>

      {showOffer && carried ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[rgba(180,120,20,0.3)] bg-[rgba(255,248,230,0.95)] p-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#4a3408]">
            <span className="block font-semibold">We found numbers you worked out on our calculators.</span>
            {describeCarried(carried)} Start from those?
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                setPrefill(toRatePrefill(carried));
                setWebsiteOffer("used");
              }}
              className={buttonClassName("primary", "sm")}
            >
              Yes, use them
            </button>
            <button type="button" onClick={() => setWebsiteOffer("declined")} className={buttonClassName("secondary", "sm")}>
              Start fresh
            </button>
          </div>
        </div>
      ) : null}
      {websiteOffer === "used" ? (
        <p className="mt-4 rounded-xl border border-[rgba(5,150,105,0.22)] bg-[rgba(236,253,245,0.92)] px-3 py-2.5 text-[13px] leading-relaxed text-[#065F46]">Your calculator numbers will be waiting in step 2.</p>
      ) : null}

      <ol className="mt-4 flex flex-col gap-2">
        {BUSINESS_SETUP_STEPS.map((step, index) => {
          const status = setup.steps[step];
          const meta = STEP_META[step];
          return (
            <li key={step}>
              <button type="button" onClick={() => go(step)} className={`flex w-full items-start gap-3 text-left ${altairMcCardClass} ${altairMcCardPadClass} transition-colors hover:border-altair-border-strong`}>
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${status === "done" ? "bg-[#2f6b3d] text-white" : "bg-altair-graphite text-altair-paper"}`}
                >
                  {status === "done" ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-altair-ink-on-paper">{meta.title}</span>
                  <span className="block text-[13px] leading-snug text-altair-ink-on-paper-secondary">{meta.text}</span>
                </span>
                <span className="shrink-0 pt-1 text-xs text-altair-ink-on-paper-muted">{status === "done" ? "Done" : status === "skipped" ? "Skipped" : `${meta.minutes} min`}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={() => go(startAt)} className={buttonClassName("primary", "md", "w-full sm:w-auto")}>
          {startAt === "done" ? "See your numbers" : visited > 0 ? `Continue with ${STEP_META[startAt].title.toLowerCase()}` : "Start with your shop"}
        </button>
        <Link href="/" className="flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline">
          I&apos;ll do this later
        </Link>
      </div>
    </section>
  );
}
