"use client";

import { useId, useState, useTransition } from "react";
import { Check, PhoneCall, UserPlus } from "lucide-react";
import { addListingWithPermissionAction, type AddWithPermissionResult } from "@/app/actions/platform-directory";
import {
  DIRECTORY_LIMITS,
  DIRECTORY_PERMISSION_LIMITS,
  DIRECTORY_TRADES,
  US_STATES,
  servicesForTrade,
} from "@/shared/types/directory";

/**
 * "Add a business with permission", on the owner's review screen.
 *
 * For a business the owner has phoned and that said yes. He enters its
 * public details, its email (so it can confirm), who gave permission and
 * when. The business is emailed at once and can confirm, edit or remove the
 * listing. Waiting for its confirmation is the default; publishing straight
 * away is a deliberate second choice. The server checks the admin and every
 * value again (app/actions/platform-directory.ts).
 */

const input =
  "mt-1 min-h-10 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30 aria-[invalid=true]:border-[#b4532a]";
const label = "block text-xs font-medium text-stone-700";
const errorText = "mt-1 text-xs font-medium text-[#9a3412]";

function Field({
  name,
  text,
  error,
  hint,
  className = "",
  children,
}: {
  readonly name: string;
  readonly text: string;
  readonly error?: string;
  readonly hint?: string;
  readonly className?: string;
  readonly children: (props: { id: string; name: string; "aria-invalid": boolean }) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      {children({ id, name, "aria-invalid": Boolean(error) })}
      {hint ? <p className="mt-1 text-[11px] text-stone-500">{hint}</p> : null}
      {error ? <p className={errorText}>{error}</p> : null}
    </div>
  );
}

/** Today on the admin's own calendar, as YYYY-MM-DD. */
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function AddWithPermissionForm({
  onDone,
  available = true,
}: {
  readonly onDone?: (result: AddWithPermissionResult) => void;
  /** False until migration 214 is applied (it stores who gave permission). */
  readonly available?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<AddWithPermissionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [trade, setTrade] = useState("");
  const [publish, setPublish] = useState<"wait" | "now">("wait");
  const [formKey, setFormKey] = useState(0);
  const errors = result?.errors ?? {};
  const values = result?.values ?? {};
  const v = (name: string, fallback = "") => values[name] ?? fallback;

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FBF6EA] ring-1 ring-inset ring-[#C2A05A]/40">
            <PhoneCall aria-hidden="true" className="h-4 w-4 text-[#77591B]" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[#0A0A0A]">Add a business with permission</h2>
            <p className="mt-0.5 text-sm text-stone-600">For a business you spoke with that said yes. It is emailed straight away and can confirm, edit or remove it.</p>
          </div>
        </div>
        {available ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
        >
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          {open ? "Close" : "Add a business"}
        </button>
        ) : (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">Needs the directory update (migration 214). It appears here once that has been run.</p>
        )}
      </div>

      {result?.success ? (
        <div role="status" className="mx-5 mb-4 rounded-xl border border-[#b9d5b3] bg-[#f1f8ef] px-4 py-3 text-sm text-[#2f5d2a]">
          <p className="font-semibold">{result.success}</p>
          {result.warning ? <p className="mt-1 text-[#8a2f0f]">{result.warning}</p> : null}
        </div>
      ) : null}

      {open && available ? (
        <form
          key={formKey}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(async () => {
              const next = await addListingWithPermissionAction(data);
              setResult(next);
              onDone?.(next);
              if (next.success) {
                setOpen(false);
                setTrade("");
                setPublish("wait");
                setFormKey((key) => key + 1);
              }
            });
          }}
          className="border-t border-stone-100 px-5 py-5"
        >
          {result?.error ? (
            <p role="alert" className="mb-4 rounded-xl border border-[#e7b8a2] bg-[#fdf3ee] px-4 py-3 text-sm font-medium text-[#8a2f0f]">
              {result.error}
            </p>
          ) : null}

          <fieldset>
            <legend className="float-left w-full text-sm font-semibold text-stone-900">The permission</legend>
            <div className="clear-both grid gap-4 pt-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <Field name="permissionGivenBy" text="Who said yes (name and role)" error={errors.givenBy} hint="For example: Dana Ruiz (owner)">
                {(props) => <input {...props} type="text" maxLength={DIRECTORY_PERMISSION_LIMITS.givenBy.max} defaultValue={v("permissionGivenBy")} className={input} />}
              </Field>
              <Field name="permissionGivenAt" text="Date they agreed" error={errors.givenAt}>
                {(props) => <input {...props} type="date" max={today()} defaultValue={v("permissionGivenAt", today())} className={input} />}
              </Field>
              <Field name="permissionNote" text="Note (optional, private)" error={errors.note} className="sm:col-span-2">
                {(props) => <input {...props} type="text" maxLength={DIRECTORY_PERMISSION_LIMITS.note.max} defaultValue={v("permissionNote")} placeholder="For example: called the office line, asked to list the residential side only" className={input} />}
              </Field>
            </div>
          </fieldset>

          <fieldset className="mt-6 border-t border-stone-100 pt-5">
            <legend className="float-left w-full text-sm font-semibold text-stone-900">What the listing shows</legend>
            <p className="clear-both pt-0.5 text-xs text-stone-500">Public details only, as they agreed. They add their own description and photos.</p>
            <div className="clear-both grid gap-4 pt-3 sm:grid-cols-2">
              <Field name="businessName" text="Business name" error={errors.businessName} className="sm:col-span-2">
                {(props) => <input {...props} type="text" maxLength={DIRECTORY_LIMITS.businessName.max} defaultValue={v("businessName")} className={input} />}
              </Field>
              <Field name="tradeType" text="Main trade" error={errors.tradeType}>
                {(props) => (
                  <select {...props} defaultValue={v("tradeType")} onChange={(event) => setTrade(event.target.value)} className={input}>
                    <option value="">Choose a trade</option>
                    {DIRECTORY_TRADES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field name="phone" text="Business phone" error={errors.phone}>
                {(props) => <input {...props} type="tel" maxLength={20} defaultValue={v("phone")} className={input} />}
              </Field>
              <Field name="city" text="City" error={errors.city}>
                {(props) => <input {...props} type="text" maxLength={DIRECTORY_LIMITS.city.max} defaultValue={v("city")} className={input} />}
              </Field>
              <Field name="state" text="State" error={errors.state}>
                {(props) => (
                  <select {...props} defaultValue={v("state")} className={input}>
                    <option value="">Choose</option>
                    {US_STATES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field name="website" text="Website (optional)" error={errors.website}>
                {(props) => <input {...props} type="text" inputMode="url" maxLength={DIRECTORY_LIMITS.website.max} defaultValue={v("website")} placeholder="theircompany.com" className={input} />}
              </Field>
              <Field name="serviceArea" text="Service area (optional)" error={errors.serviceArea}>
                {(props) => <input {...props} type="text" maxLength={DIRECTORY_LIMITS.serviceArea.max} defaultValue={v("serviceArea")} className={input} />}
              </Field>
              {trade ? (
                <div className="sm:col-span-2">
                  <p className={label}>Other trades and services (optional)</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {servicesForTrade(DIRECTORY_TRADES.find((item) => item === trade) ?? null).map((option) => (
                      <label key={option.value} className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 px-2.5 text-xs text-stone-700 has-[:checked]:border-[#0d0f0c] has-[:checked]:bg-[#0d0f0c] has-[:checked]:text-[#f3ebdd]">
                        <input type="checkbox" name="services" value={option.value} className="sr-only" />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  {errors.services ? <p className={errorText}>{errors.services}</p> : null}
                </div>
              ) : null}
              <Field
                name="contactEmail"
                text="The business's email (private)"
                error={errors.contactEmail}
                hint="We send their confirm and manage link here. Never shown."
                className="sm:col-span-2"
              >
                {(props) => <input {...props} type="email" inputMode="email" maxLength={DIRECTORY_LIMITS.email.max} defaultValue={v("contactEmail")} className={input} />}
              </Field>
            </div>
          </fieldset>

          <fieldset className="mt-6 border-t border-stone-100 pt-5">
            <legend className="float-left w-full text-sm font-semibold text-stone-900">When it goes live</legend>
            <div className="clear-both grid gap-2 pt-3 sm:grid-cols-2">
              {(
                [
                  { value: "wait", title: "Wait for the business to confirm", text: "Recommended. It goes live after they press the emailed link and you approve it." },
                  { value: "now", title: "Publish now", text: "Live straight away, marked “Is this your business? Confirm or edit your listing” until they confirm." },
                ] as const
              ).map((choice) => (
                <label
                  key={choice.value}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${publish === choice.value ? "border-[#0d0f0c] bg-stone-50" : "border-stone-200"}`}
                >
                  <input
                    type="radio"
                    name="publish"
                    value={choice.value}
                    checked={publish === choice.value}
                    onChange={() => setPublish(choice.value)}
                    className="mt-0.5 h-4 w-4 accent-[#77591B]"
                  />
                  <span>
                    <span className="block font-semibold text-stone-900">{choice.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-stone-600">{choice.text}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-stone-500">Only add a business that said yes. They can remove it in one step.</p>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0A0A0A] px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
            >
              <Check aria-hidden="true" className="h-4 w-4" />
              {pending ? "Adding…" : publish === "now" ? "Add, publish and email them" : "Add and email the business"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
