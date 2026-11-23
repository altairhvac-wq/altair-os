"use client";

import { startTransition, useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Mail, Sparkles, UserCheck, Globe2 } from "lucide-react";
import type { DirectoryFormState } from "@/app/actions/directory";
import { ListingPreview, type PreviewValues } from "@/shared/components/directory/ListingPreview";
import {
  dirBrassButton,
  dirError,
  dirFocus,
  dirHint,
  dirInput,
  dirLabel,
  dirPanel,
  dirSecondaryButton,
} from "@/shared/components/directory/directory-styles";
import { trackEngagement } from "@/shared/lib/analytics/client";
import {
  DIRECTORY_CONSENT_TEXT,
  DIRECTORY_DAYS,
  DIRECTORY_DETAIL_LIMITS,
  DIRECTORY_LANGUAGES,
  DIRECTORY_LIMITS,
  DIRECTORY_TRADES,
  US_STATES,
  encodeHours,
  formatPhone,
  normalizeDirectoryEmail,
  parseHoursInput,
  servicesForTrade,
  validateListingInput,
  type DirectoryFieldErrors,
  type DirectoryFieldKey,
  type DirectoryHours,
  type DirectoryListingFields,
} from "@/shared/types/directory";

/**
 * The listing form, used twice: to list a business (/directory/list) and to
 * edit one from the manage link. Same fields, same rules
 * (`validateListingInput`), same component, so the two cannot ask for
 * different things.
 *
 * CREATE is three short steps beside a live preview of the listing:
 *   1. The essentials: name, trade, city and state, phone, email.
 *   2. Details, all optional: what you do, services, hours, license, and so on.
 *   3. Send: the consent sentence and the button.
 * EDIT shows the same fields in two sections, without the email step.
 *
 * Every field stays in the form at every step (inactive steps are hidden,
 * not removed), so one submit carries everything and the Server Action
 * checks it all again. A mistake is described under its field, announced at
 * the top, and the form opens on the step that holds it. Nothing typed is
 * lost after a failed submit.
 *
 * Counted steps (no field values, ever): form started, details step, send
 * step, sent, success screen.
 */

type Action = (state: DirectoryFormState, formData: FormData) => Promise<DirectoryFormState>;

export type ListingFormPrefill = { tradeType?: string; city?: string; state?: string };

type Props = {
  readonly action: Action;
  readonly mode: "create" | "edit";
  /** Edit mode: the listing as it stands, and the signed link that proves whose it is. */
  readonly initial?: DirectoryListingFields;
  readonly link?: { readonly id: string; readonly token: string };
  readonly submitLabel: string;
  /** Create mode: trade and place carried over from an empty search. Checked again on submit. */
  readonly prefill?: ListingFormPrefill;
  /** Edit mode: the approved logo, for the preview. */
  readonly logoUrl?: string | null;
  /**
   * Migration 214 is not applied yet: only the phase-1 fields are offered
   * (no services, hours, license, radius or languages) and the description
   * is required, as the table still demands.
   */
  readonly basic?: boolean;
};

const INITIAL: DirectoryFormState = { status: "idle" };

type Values = Record<string, string>;

function initialValues(fields?: DirectoryListingFields, prefill?: ListingFormPrefill): Values {
  if (!fields) {
    return {
      tradeType: prefill?.tradeType ?? "",
      city: prefill?.city ?? "",
      state: prefill?.state ?? "",
    };
  }
  return {
    businessName: fields.businessName,
    tradeType: fields.tradeType,
    city: fields.city,
    state: fields.state,
    postalCode: fields.postalCode ?? "",
    serviceArea: fields.serviceArea,
    phone: formatPhone(fields.phone),
    website: fields.website ?? "",
    description: fields.description,
    acceptsSubWork: fields.acceptsSubWork ? "on" : "",
    services: fields.services.join(","),
    hours: encodeHours(fields.hours),
    licenseNumber: fields.licenseNumber ?? "",
    licenseState: fields.licenseState ?? "",
    insured: fields.insured === null ? "" : fields.insured ? "yes" : "no",
    emergencyService: fields.emergencyService === null ? "" : fields.emergencyService ? "yes" : "no",
    yearFounded: fields.yearFounded ? String(fields.yearFounded) : "",
    serviceRadiusMiles: fields.serviceRadiusMiles ? String(fields.serviceRadiusMiles) : "",
    languages: fields.languages.join(","),
  };
}

const STEP_ONE: readonly (DirectoryFieldKey | "contactEmail")[] = ["businessName", "tradeType", "city", "state", "phone", "contactEmail"];
const STEPS = [
  { id: "basics", label: "Essentials", title: "Your business" },
  { id: "details", label: "Details", title: "Details (all optional)" },
  { id: "send", label: "Send", title: "Check and send" },
] as const;

function stepOfError(errors: DirectoryFieldErrors): number {
  const keys = Object.keys(errors);
  if (keys.length === 0) return 0;
  if (keys.some((key) => (STEP_ONE as readonly string[]).includes(key))) return 0;
  if (keys.every((key) => key === "consent")) return 2;
  return 1;
}

function Field({
  label,
  hint,
  error,
  optional = false,
  className = "",
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly optional?: boolean;
  readonly className?: string;
  readonly children: (props: { id: string; "aria-describedby": string | undefined; "aria-invalid": boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={dirLabel}>
        {label}
        {optional ? <span className="font-normal text-stone-500"> (optional)</span> : null}
      </label>
      <div className="mt-1.5">{children({ id, "aria-describedby": describedBy, "aria-invalid": Boolean(error) })}</div>
      {hint ? (
        <p id={hintId} className={dirHint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={dirError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  note,
  hideTitle = false,
  children,
}: {
  readonly title: string;
  readonly note?: string;
  readonly hideTitle?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-stone-100 pt-5 first:border-t-0 first:pt-0">
      <legend className={hideTitle ? "sr-only" : "float-left w-full text-[15px] font-semibold text-stone-900"}>{title}</legend>
      {note ? <p className="clear-both pt-0.5 text-[13px] text-stone-500">{note}</p> : null}
      <div className="clear-both grid gap-4 pt-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Toggle chips that are real checkboxes, so the form posts them without JavaScript too. */
function ChoiceChips({
  name,
  options,
  selected,
  onChange,
  max,
  legend,
}: {
  readonly name: string;
  readonly options: readonly { value: string; label: string }[];
  readonly selected: readonly string[];
  readonly onChange: (next: string[]) => void;
  readonly max: number;
  readonly legend: string;
}) {
  return (
    <div role="group" aria-label={legend} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors focus-within:ring-2 focus-within:ring-[#C2A05A]/60 ${
              on ? "border-[#0d0f0c] bg-[#0d0f0c] text-[#f3ebdd]" : "border-stone-200 bg-white text-stone-700 hover:border-[#C2A05A]"
            }`}
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={on}
              disabled={!on && selected.length >= max}
              onChange={(event) =>
                onChange(event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value))
              }
              className="sr-only"
            />
            {on ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-[#C2A05A]" /> : null}
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function TriState({
  name,
  value,
  onChange,
  labels,
  legend,
}: {
  readonly name: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly labels: { yes: string; no: string };
  readonly legend: string;
}) {
  const options = [
    { value: "yes", label: labels.yes },
    { value: "no", label: labels.no },
    { value: "", label: "Don't show" },
  ];
  return (
    <div role="radiogroup" aria-label={legend} className="inline-flex flex-wrap rounded-lg border border-stone-200 bg-stone-50 p-1">
      {options.map((option) => (
        <label
          key={option.value || "unset"}
          className={`inline-flex min-h-9 cursor-pointer items-center rounded-md px-3 text-[13px] font-medium transition-colors focus-within:ring-2 focus-within:ring-[#C2A05A]/60 ${
            value === option.value ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="sr-only" />
          {option.label}
        </label>
      ))}
    </div>
  );
}

const DEFAULT_DAY = { open: "08:00", close: "17:00" };

function HoursEditor({ hours, onChange, error }: { readonly hours: DirectoryHours | null; readonly onChange: (next: DirectoryHours | null) => void; readonly error?: string }) {
  if (!hours) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-4">
        <p className="text-sm text-stone-600">Show the days and times you answer the phone.</p>
        <button
          type="button"
          onClick={() =>
            onChange(Object.fromEntries(DIRECTORY_DAYS.map((day, index) => [day.key, index < 5 ? { ...DEFAULT_DAY } : null])) as DirectoryHours)
          }
          className={`mt-3 ${dirSecondaryButton} min-h-9 px-3 text-[13px]`}
        >
          Add hours
        </button>
      </div>
    );
  }
  const set = (key: string, entry: { open: string; close: string } | null) => onChange({ ...hours, [key]: entry } as DirectoryHours);
  return (
    <div className="rounded-xl border border-stone-200 p-3 sm:p-4">
      <ul className="space-y-2">
        {DIRECTORY_DAYS.map((day) => {
          const entry = hours[day.key];
          return (
            <li key={day.key} className="grid grid-cols-[4.5rem_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[6rem_auto_minmax(0,1fr)]">
              <span className="text-sm font-medium text-stone-800">
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.label}</span>
              </span>
              <label className="inline-flex min-h-9 items-center gap-2 text-[13px] text-stone-700">
                <input
                  type="checkbox"
                  checked={entry !== null}
                  onChange={(event) => set(day.key, event.target.checked ? { ...DEFAULT_DAY } : null)}
                  className="h-4 w-4 rounded border-stone-400 accent-[#77591B]"
                />
                Open
              </label>
              {entry ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <input
                    type="time"
                    aria-label={`${day.label} opens`}
                    value={entry.open}
                    onChange={(event) => set(day.key, { ...entry, open: event.target.value })}
                    className={`${dirInput} min-h-9 px-2 py-1 text-sm`}
                  />
                  <span aria-hidden="true" className="text-stone-400">–</span>
                  <input
                    type="time"
                    aria-label={`${day.label} closes`}
                    value={entry.close}
                    onChange={(event) => set(day.key, { ...entry, close: event.target.value })}
                    className={`${dirInput} min-h-9 px-2 py-1 text-sm`}
                  />
                </span>
              ) : (
                <span className="text-[13px] text-stone-400">Closed</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
        <button
          type="button"
          onClick={() => {
            const monday = hours.mon ?? { ...DEFAULT_DAY };
            onChange({ ...hours, mon: monday, tue: { ...monday }, wed: { ...monday }, thu: { ...monday }, fri: { ...monday } });
          }}
          className={`${dirSecondaryButton} min-h-9 px-3 text-[13px]`}
        >
          Same as Monday, Mon to Fri
        </button>
        <button type="button" onClick={() => onChange(null)} className={`min-h-9 rounded-lg px-3 text-[13px] font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-800 ${dirFocus}`}>
          Remove hours
        </button>
      </div>
      {error ? <p className={dirError}>{error}</p> : null}
    </div>
  );
}

const WHAT_NEXT = [
  { icon: Mail, title: "Confirm your email", text: "Press the link we send you. Nothing is public before that." },
  { icon: UserCheck, title: "A person checks it", text: "Usually within one business day." },
  { icon: Globe2, title: "Your listing goes live", text: "We email you the link, and you can change it any time." },
];

export function ListingForm({ action, mode, initial, link, submitLabel, prefill, logoUrl = null, basic = false }: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const starting = useMemo(() => state.values ?? initialValues(initial, prefill), [state.values, initial, prefill]);
  const errors: DirectoryFieldErrors = useMemo(() => state.errors ?? {}, [state.errors]);

  if (mode === "create" && state.status === "done") {
    return <SuccessScreen message={state.message ?? ""} />;
  }

  return (
    // The key remounts the fields with what was just submitted, so a form
    // with one mistake in it keeps everything that was typed and opens on
    // the step with the mistake.
    <EditorBody
      key={JSON.stringify(starting) + JSON.stringify(errors)}
      mode={mode}
      starting={starting}
      errors={errors}
      message={state.message}
      status={state.status}
      formAction={formAction}
      pending={pending}
      link={link}
      submitLabel={submitLabel}
      logoUrl={logoUrl}
      consentWasTicked={state.status === "error" && !errors.consent && Boolean(state.values)}
      basic={basic}
    />
  );
}

function EditorBody({
  mode,
  starting,
  errors,
  message,
  status,
  formAction,
  pending,
  link,
  submitLabel,
  logoUrl,
  consentWasTicked,
  basic,
}: {
  readonly mode: "create" | "edit";
  readonly starting: Values;
  readonly errors: DirectoryFieldErrors;
  readonly message?: string;
  readonly status: DirectoryFormState["status"];
  readonly formAction: (formData: FormData) => void;
  readonly pending: boolean;
  readonly link?: { readonly id: string; readonly token: string };
  readonly submitLabel: string;
  readonly logoUrl: string | null;
  readonly consentWasTicked: boolean;
  readonly basic: boolean;
}) {
  const L = DIRECTORY_LIMITS;
  const D = DIRECTORY_DETAIL_LIMITS;
  const [values, setValues] = useState<Values>(starting);
  const [chosenServices, setServices] = useState<string[]>(() => (starting.services ? starting.services.split(",").filter(Boolean) : []));
  const [languages, setLanguages] = useState<string[]>(() => (starting.languages ? starting.languages.split(",").filter(Boolean) : []));
  const [hours, setHours] = useState<DirectoryHours | null>(() => {
    const parsed = parseHoursInput(starting.hours ?? "");
    return parsed === "invalid" ? null : parsed;
  });
  const [step, setStep] = useState(() => (mode === "create" ? stepOfError(errors) : 0));
  const [localErrors, setLocalErrors] = useState<DirectoryFieldErrors>({});
  const [showPreview, setShowPreview] = useState(false);
  const started = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const shown = { ...errors, ...localErrors };

  const set = (name: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = event.target instanceof HTMLInputElement && event.target.type === "checkbox" ? (event.target.checked ? "on" : "") : event.target.value;
    setValues((current) => ({ ...current, [name]: value }));
    if (mode === "create" && !started.current) {
      started.current = true;
      trackEngagement("cta_click", "dir-form-start");
    }
  };
  const v = (name: string) => values[name] ?? "";

  // Only services the chosen trade offers count; a trade change drops the rest.
  const serviceOptions = servicesForTrade(DIRECTORY_TRADES.find((trade) => trade === values.tradeType) ?? null);
  const services = chosenServices.filter((service) => serviceOptions.some((option) => option.value === service));

  const preview: PreviewValues = {
    businessName: v("businessName"),
    tradeType: v("tradeType"),
    city: v("city"),
    state: v("state"),
    phone: v("phone"),
    website: v("website"),
    description: v("description"),
    serviceArea: v("serviceArea"),
    acceptsSubWork: v("acceptsSubWork") === "on",
    services,
    hours,
    emergencyService: v("emergencyService"),
    yearFounded: v("yearFounded"),
    logoUrl,
  };

  const goTo = (next: number) => {
    if (next > step && step === 0) {
      // The essentials are checked here, so a mistake is found before the
      // optional step rather than at the end. The server checks again.
      const checked = validateListingInput({ ...values, services: [], languages: [], hours: "" });
      const found: DirectoryFieldErrors = {};
      if (!checked.ok) {
        for (const key of STEP_ONE) if (checked.errors[key as DirectoryFieldKey]) found[key] = checked.errors[key as DirectoryFieldKey];
      }
      if (mode === "create" && !normalizeDirectoryEmail(values.contactEmail)) found.contactEmail = "Enter your email address. It is not shown on the listing.";
      setLocalErrors(found);
      if (Object.keys(found).length > 0) return;
    }
    setLocalErrors({});
    setStep(next);
    if (mode === "create" && next === 1) trackEngagement("cta_click", "dir-form-step-details");
    if (mode === "create" && next === 2) trackEngagement("cta_click", "dir-form-step-send");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const visible = (index: number) => mode === "edit" || step === index;

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className={`overflow-hidden ${dirPanel} shadow-[0_40px_100px_-60px_rgba(28,25,23,0.55)]`}>
        {mode === "create" ? (
          <nav aria-label="Steps" className="flex items-center justify-between gap-3 bg-[#0d0f0c] px-3 sm:px-4">
            <ol className="flex overflow-x-auto [scrollbar-width:none]">
              {STEPS.map((item, index) => {
                const active = index === step;
                const done = index < step;
                return (
                  <li key={item.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => (index <= step ? goTo(index) : goTo(Math.min(index, step + 1)))}
                      aria-current={active ? "step" : undefined}
                      className={`relative flex min-h-12 items-center gap-2 px-3 text-[13px] font-semibold transition-colors sm:px-4 ${dirFocus} focus-visible:ring-offset-[#0d0f0c] ${
                        active ? "text-[#fff9ea]" : done ? "text-[#cfc6b6] hover:text-[#fff9ea]" : "text-[#8f8676] hover:text-[#cfc6b6]"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                          active ? "bg-[#A4823A] text-[#080907]" : done ? "bg-[#A4823A]/25 text-[#e8d9ac]" : "bg-white/10 text-[#a99f8f]"
                        }`}
                      >
                        {done ? <Check aria-hidden="true" className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className={active ? "" : "sr-only sm:not-sr-only"}>{item.label}</span>
                      {active ? <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#A4823A]" /> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              onClick={() => setShowPreview((open) => !open)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold text-[#cfc6b6] hover:bg-white/10 lg:hidden ${dirFocus} focus-visible:ring-offset-[#0d0f0c]`}
              aria-expanded={showPreview}
              aria-controls="listing-preview"
            >
              {showPreview ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              Preview
            </button>
          </nav>
        ) : null}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <form
            // Sent by hand rather than through the `action` prop: React resets
            // a form after an action, which put controlled selects (the state)
            // back to their first option while the screen still showed the
            // chosen one. Every field is read from the form at the moment of
            // sending, so what is sent is exactly what is shown.
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              startTransition(() => formAction(data));
            }}
            noValidate
            data-track-submit={mode === "create" ? "dir-form-submit" : undefined} className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:border-r lg:border-stone-200">
            {link ? (
              <>
                <input type="hidden" name="id" value={link.id} />
                <input type="hidden" name="t" value={link.token} />
              </>
            ) : null}
            <input type="hidden" name="hours" value={encodeHours(hours)} />

            {message ? (
              <p
                role={status === "error" ? "alert" : "status"}
                className={[
                  "mb-5 rounded-xl border px-4 py-3 text-sm font-medium",
                  status === "error" ? "border-[#e7b8a2] bg-[#fdf3ee] text-[#8a2f0f]" : "border-[#b9d5b3] bg-[#f1f8ef] text-[#2f5d2a]",
                ].join(" ")}
              >
                {message}
              </p>
            ) : null}

            {mode === "create" ? (
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-stone-900">
                  <span className="text-stone-400">{step + 1}.</span> {STEPS[step].title}
                </h2>
                <span className="text-xs text-stone-500">{step === 0 ? "About a minute" : step === 1 ? "Skip anything you like" : "Last step"}</span>
              </div>
            ) : null}

            {/* ---------------------------------------------------- 1. essentials */}
            <div hidden={!visible(0)} className="space-y-5">
              <Section title="Your business" hideTitle={mode === "create"} note={mode === "create" ? "These five things are all a listing needs." : undefined}>
                <Field label="Business name" error={shown.businessName} className="sm:col-span-2">
                  {(props) => (
                    <input {...props} name="businessName" type="text" autoComplete="organization" maxLength={L.businessName.max} value={v("businessName")} onChange={set("businessName")} className={dirInput} />
                  )}
                </Field>
                <Field label="Trade" error={shown.tradeType}>
                  {(props) => (
                    <select {...props} name="tradeType" value={v("tradeType")} onChange={set("tradeType")} className={dirInput}>
                      <option value="" disabled>
                        Choose a trade
                      </option>
                      {DIRECTORY_TRADES.map((trade) => (
                        <option key={trade} value={trade}>
                          {trade}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Business phone" error={shown.phone}>
                  {(props) => (
                    <input {...props} name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={v("phone")} onChange={set("phone")} className={dirInput} />
                  )}
                </Field>
                <Field label="City" error={shown.city}>
                  {(props) => (
                    <input {...props} name="city" type="text" autoComplete="address-level2" maxLength={L.city.max} value={v("city")} onChange={set("city")} className={dirInput} />
                  )}
                </Field>
                <Field label="State" error={shown.state}>
                  {(props) => (
                    <select {...props} name="state" autoComplete="address-level1" value={v("state")} onChange={set("state")} className={dirInput}>
                      <option value="" disabled>
                        Choose
                      </option>
                      {US_STATES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                {mode === "create" ? (
                  <Field label="Your email" hint="Private. Only for confirming and managing your listing. Never shown." error={shown.contactEmail} className="sm:col-span-2">
                    {(props) => (
                      <input
                        {...props}
                        name="contactEmail"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={L.email.max}
                        value={v("contactEmail")}
                        onChange={set("contactEmail")}
                        className={dirInput}
                      />
                    )}
                  </Field>
                ) : null}
              </Section>
            </div>

            {/* ---------------------------------------------------- 2. details */}
            <div hidden={!visible(1)} className={`space-y-5 ${mode === "edit" ? "mt-6" : ""}`}>
              <Section title="What you do" note="A few plain sentences help people pick you.">
                <div className="sm:col-span-2">
                  <Field
                    label="Description"
                    optional={!basic}
                    hint={basic ? `The work you take on and who you do it for, in at least ${L.description.min} characters.` : "The work you take on and who you do it for."}
                    error={shown.description}
                  >
                    {(props) => (
                      <textarea
                        {...props}
                        name="description"
                        rows={4}
                        maxLength={L.description.max}
                        value={v("description")}
                        onChange={set("description")}
                        className={`${dirInput} min-h-28 resize-y leading-relaxed`}
                      />
                    )}
                  </Field>
                  <p className="mt-1 text-right text-xs tabular-nums text-stone-500" aria-hidden="true">
                    {v("description").length} / {L.description.max}
                  </p>
                </div>
                {!basic ? (
                  <div className="sm:col-span-2">
                    <p className={dirLabel}>
                      Services <span className="font-normal text-stone-500">(optional)</span>
                    </p>
                    <p className={`${dirHint} mb-2`}>{values.tradeType ? "Tick what you do." : "Choose your trade first for its own list."}</p>
                    <ChoiceChips name="services" options={serviceOptions} selected={services} onChange={setServices} max={D.services.max} legend="Services" />
                    {shown.services ? <p className={dirError}>{shown.services}</p> : null}
                  </div>
                ) : null}
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <input
                    id="directory-accepts-sub-work"
                    name="acceptsSubWork"
                    type="checkbox"
                    checked={v("acceptsSubWork") === "on"}
                    onChange={set("acceptsSubWork")}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-400 accent-[#77591B]"
                  />
                  <label htmlFor="directory-accepts-sub-work" className="text-sm leading-snug text-stone-800">
                    We take subcontract work
                    <span className="block text-xs text-stone-500">Other contractors looking for a sub can find you.</span>
                  </label>
                </div>
              </Section>

              <Section title="Where you work">
                <Field label="Cities and areas served" optional hint="For example: Salt Lake and Utah counties." error={shown.serviceArea} className="sm:col-span-2">
                  {(props) => (
                    <input {...props} name="serviceArea" type="text" maxLength={L.serviceArea.max} value={v("serviceArea")} onChange={set("serviceArea")} className={dirInput} />
                  )}
                </Field>
                <Field label="ZIP code" optional error={shown.postalCode}>
                  {(props) => (
                    <input {...props} name="postalCode" type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={v("postalCode")} onChange={set("postalCode")} className={dirInput} />
                  )}
                </Field>
                {!basic ? (
                  <Field label="Travels up to (miles)" optional error={shown.serviceRadiusMiles}>
                    {(props) => (
                      <input {...props} name="serviceRadiusMiles" type="text" inputMode="numeric" maxLength={3} value={v("serviceRadiusMiles")} onChange={set("serviceRadiusMiles")} className={dirInput} />
                    )}
                  </Field>
                ) : null}
              </Section>

              <Section title="Website and hours">
                <Field label="Website" optional hint="Linked from your listing." error={shown.website} className="sm:col-span-2">
                  {(props) => (
                    <input
                      {...props}
                      name="website"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="yourcompany.com"
                      maxLength={L.website.max}
                      value={v("website")}
                      onChange={set("website")}
                      className={dirInput}
                    />
                  )}
                </Field>
                {!basic ? (
                  <div className="sm:col-span-2">
                    <p className={`${dirLabel} mb-2`}>
                      Hours <span className="font-normal text-stone-500">(optional)</span>
                    </p>
                    <HoursEditor hours={hours} onChange={setHours} error={shown.hours} />
                  </div>
                ) : null}
              </Section>

              {!basic ? (
              <Section title="Trust details" note="Shown as your own statements. People are told to check them.">
                <Field label="License number" optional error={shown.licenseNumber}>
                  {(props) => (
                    <input {...props} name="licenseNumber" type="text" maxLength={D.licenseNumber.max} value={v("licenseNumber")} onChange={set("licenseNumber")} className={dirInput} />
                  )}
                </Field>
                <Field label="Licensing state" optional hint="Leave blank to use your business state." error={shown.licenseState}>
                  {(props) => (
                    <select {...props} name="licenseState" value={v("licenseState")} onChange={set("licenseState")} className={dirInput}>
                      <option value="">Same as my business</option>
                      {US_STATES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <div>
                  <p className={`${dirLabel} mb-2`}>Insured?</p>
                  <TriState name="insured" value={v("insured")} onChange={(next) => setValues((current) => ({ ...current, insured: next }))} labels={{ yes: "Yes", no: "No" }} legend="Insured" />
                  {shown.insured ? <p className={dirError}>{shown.insured}</p> : null}
                </div>
                <div>
                  <p className={`${dirLabel} mb-2`}>Emergency calls?</p>
                  <TriState
                    name="emergencyService"
                    value={v("emergencyService")}
                    onChange={(next) => setValues((current) => ({ ...current, emergencyService: next }))}
                    labels={{ yes: "Yes", no: "No" }}
                    legend="Emergency service"
                  />
                  {shown.emergencyService ? <p className={dirError}>{shown.emergencyService}</p> : null}
                </div>
                <Field label="Year founded" optional error={shown.yearFounded}>
                  {(props) => (
                    <input {...props} name="yearFounded" type="text" inputMode="numeric" maxLength={4} placeholder="2012" value={v("yearFounded")} onChange={set("yearFounded")} className={dirInput} />
                  )}
                </Field>
                <div className="sm:col-span-2">
                  <p className={`${dirLabel} mb-2`}>
                    Languages spoken <span className="font-normal text-stone-500">(optional)</span>
                  </p>
                  <ChoiceChips name="languages" options={DIRECTORY_LANGUAGES} selected={languages} onChange={setLanguages} max={D.languages.max} legend="Languages" />
                  {shown.languages ? <p className={dirError}>{shown.languages}</p> : null}
                </div>
              </Section>
              ) : null}
            </div>

            {/* ---------------------------------------------------- 3. send */}
            {mode === "create" ? (
              <div hidden={step !== 2} className="space-y-5">
                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                  <p className="text-sm font-semibold text-stone-900">What happens when you press send</p>
                  <ol className="mt-3 space-y-3">
                    {WHAT_NEXT.map((item, index) => (
                      <li key={item.title} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d0f0c] text-[11px] font-semibold text-[#e8d9ac]">{index + 1}</span>
                        <span className="text-sm leading-snug text-stone-700">
                          <span className="font-semibold text-stone-900">{item.title}.</span> {item.text}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="flex items-start gap-2.5">
                    <input
                      id="directory-consent"
                      name="consent"
                      type="checkbox"
                      defaultChecked={consentWasTicked}
                      aria-invalid={Boolean(shown.consent)}
                      aria-describedby={shown.consent ? "directory-consent-error" : undefined}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-400 accent-[#77591B]"
                    />
                    <label htmlFor="directory-consent" className="text-sm leading-snug text-stone-800">
                      {DIRECTORY_CONSENT_TEXT}
                    </label>
                  </div>
                  {shown.consent ? (
                    <p id="directory-consent-error" className={dirError}>
                      {shown.consent}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Not for people. A filled-in value means a script wrote the form. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Company website
                <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
              </label>
            </div>

            {showPreview ? (
              <div id="listing-preview" className="mt-6 lg:hidden">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Your listing, as people will see it</p>
                <ListingPreview values={preview} compact />
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              {mode === "create" ? (
                <>
                  {step > 0 ? (
                    <button type="button" onClick={() => goTo(step - 1)} className={`${dirSecondaryButton} gap-2`}>
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back
                    </button>
                  ) : (
                    <p className="text-xs leading-relaxed text-stone-500">Free to list. No account.</p>
                  )}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    {step === 1 ? (
                      <button type="button" onClick={() => goTo(2)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 ${dirFocus}`}>
                        Skip for now
                      </button>
                    ) : null}
                    {step < 2 ? (
                      // Distinct keys: React must not turn this same button into the
                      // submit button mid-click, or one press both moves on and sends.
                      <button key="continue" type="button" onClick={() => goTo(step + 1)} className={dirBrassButton}>
                        {step === 0 ? "Continue" : "Continue to send"} <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </button>
                    ) : (
                      <button key="send" type="submit" disabled={pending} className={dirBrassButton}>
                        {pending ? "Sending…" : submitLabel}
                        {!pending ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs leading-relaxed text-stone-500">
                    Changes to a live listing are checked before they show. Your listing stays up in the meantime.
                  </p>
                  <button type="submit" disabled={pending} className={`${dirBrassButton} shrink-0`}>
                    {pending ? "Saving…" : submitLabel}
                  </button>
                </>
              )}
            </div>
          </form>

          <aside aria-label="Preview of your listing" className="hidden bg-stone-50/70 px-5 py-6 lg:block">
            <div className="sticky top-24">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                <Eye aria-hidden="true" className="h-3.5 w-3.5" /> Live preview
              </p>
              <ListingPreview values={preview} />
              <p className="mt-3 text-xs leading-relaxed text-stone-500">
                Your email is never shown.{basic ? "" : " Photos and a logo can be added after you confirm your email."}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ message }: { readonly message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    trackEngagement("cta_click", "dir-form-success");
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  return (
    <div ref={ref} role="status" className={`scroll-mt-24 overflow-hidden ${dirPanel} shadow-[0_40px_100px_-60px_rgba(28,25,23,0.55)]`}>
      <div className="bg-[#0d0f0c] px-6 py-8 text-center sm:px-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#A4823A]/20 ring-1 ring-inset ring-[#C2A05A]/40">
          <Mail aria-hidden="true" className="h-5 w-5 text-[#e8d9ac]" />
        </span>
        <p className="mt-4 text-2xl font-semibold tracking-tight text-[#fff9ea]">Check your email.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#cfc6b6]">{message}</p>
      </div>
      <div className="grid gap-6 px-6 py-7 sm:px-10 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-stone-900">What happens next</p>
          <ol className="mt-4 space-y-4">
            {WHAT_NEXT.map((item, index) => (
              <li key={item.title} className="flex gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${index === 0 ? "bg-[#A4823A] text-[#080907]" : "bg-stone-100 text-stone-500"}`}
                >
                  <item.icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="text-sm leading-snug text-stone-700">
                  <span className="block font-semibold text-stone-900">{item.title}</span>
                  {item.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5">
          <Sparkles aria-hidden="true" className="h-5 w-5 text-[#A4823A]" />
          <p className="mt-3 text-sm font-semibold text-stone-900">While you wait: the calls from your listing need somewhere to go.</p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            Altair Operating System is scheduling, estimates, invoices and time tracking for trade shops. If it fits how
            you work, try it free for 14 days. No credit card.
          </p>
          <Link href="/signup" data-cta="directory-success-trial" className={`mt-4 ${dirSecondaryButton} gap-2`}>
            Start a free trial <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-xs text-stone-500">Your listing is free either way.</p>
        </div>
      </div>
    </div>
  );
}
