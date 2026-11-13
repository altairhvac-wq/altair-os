"use client";

import { useActionState, useId, useState } from "react";
import type { DirectoryFormState } from "@/app/actions/directory";
import {
  dirCard,
  dirError,
  dirHint,
  dirInput,
  dirLabel,
  dirPrimaryButton,
} from "@/shared/components/directory/directory-styles";
import {
  DIRECTORY_CONSENT_TEXT,
  DIRECTORY_LIMITS,
  DIRECTORY_TRADES,
  US_STATES,
  formatPhone,
  type DirectoryFieldErrors,
  type DirectoryListingFields,
} from "@/shared/types/directory";

/**
 * The listing form, used twice: to list a business, and to edit one from the
 * manage link. Same fields, same rules, same component, so the two cannot
 * ask for different things.
 *
 * One screen, three short groups. Every field has a visible label; a mistake
 * is described under the field it belongs to and announced once at the top.
 * After a failed submit everything that was typed is still there.
 *
 * The form works without JavaScript (it posts to a Server Action); the
 * character count is the only part that needs it.
 */

type Action = (state: DirectoryFormState, formData: FormData) => Promise<DirectoryFormState>;

type Props = {
  readonly action: Action;
  readonly mode: "create" | "edit";
  /** Edit mode: the listing as it stands, and the signed link that proves whose it is. */
  readonly initial?: DirectoryListingFields;
  readonly link?: { readonly id: string; readonly token: string };
  readonly submitLabel: string;
};

const INITIAL: DirectoryFormState = { status: "idle" };

function initialValues(fields?: DirectoryListingFields): Record<string, string> {
  if (!fields) return {};
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
  };
}

function Field({
  name,
  label,
  hint,
  error,
  optional = false,
  children,
}: {
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly optional?: boolean;
  readonly children: (props: { id: string; "aria-describedby": string | undefined; "aria-invalid": boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div data-field={name}>
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

function Group({ title, note, children }: { readonly title: string; readonly note?: string; readonly children: React.ReactNode }) {
  return (
    <fieldset className={`px-5 py-6 sm:px-7 ${dirCard}`}>
      <legend className="float-left w-full text-base font-semibold text-[#0A0A0A]">{title}</legend>
      {note ? <p className="clear-both pt-1 text-sm text-stone-600">{note}</p> : null}
      <div className="clear-both grid gap-5 pt-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function ListingForm({ action, mode, initial, link, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const values = state.values ?? initialValues(initial);
  const errors: DirectoryFieldErrors = state.errors ?? {};
  const [descriptionLength, setDescriptionLength] = useState((values.description ?? "").length);
  const L = DIRECTORY_LIMITS;

  // A finished "create" replaces the form with the next step. A finished
  // edit keeps the form, so another change is one click away.
  if (mode === "create" && state.status === "done") {
    return (
      <div role="status" className={`px-6 py-8 text-center ${dirCard}`}>
        <p className="text-lg font-semibold text-[#0A0A0A]">Almost there.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-700">{state.message}</p>
      </div>
    );
  }

  return (
    // The key remounts the fields with what was just submitted, so a form
    // with one mistake in it keeps everything else that was typed.
    <form key={JSON.stringify(values)} action={formAction} noValidate className="space-y-5">
      {link ? (
        <>
          <input type="hidden" name="id" value={link.id} />
          <input type="hidden" name="t" value={link.token} />
        </>
      ) : null}

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={[
            "rounded-xl border px-4 py-3 text-sm font-medium",
            state.status === "error"
              ? "border-[#e7b8a2] bg-[#fdf3ee] text-[#8a2f0f]"
              : "border-[#b9d5b3] bg-[#f1f8ef] text-[#2f5d2a]",
          ].join(" ")}
        >
          {state.message}
        </p>
      ) : null}

      <Group title="Your business">
        <div className="sm:col-span-2">
          <Field name="businessName" label="Business name" error={errors.businessName}>
            {(props) => (
              <input
                {...props}
                name="businessName"
                type="text"
                autoComplete="organization"
                maxLength={L.businessName.max}
                defaultValue={values.businessName ?? ""}
                className={dirInput}
              />
            )}
          </Field>
        </div>
        <Field name="tradeType" label="Trade" error={errors.tradeType}>
          {(props) => (
            <select {...props} name="tradeType" defaultValue={values.tradeType ?? ""} className={dirInput}>
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
        <div className="flex items-start gap-2.5 sm:pt-8">
          <input
            id="directory-accepts-sub-work"
            name="acceptsSubWork"
            type="checkbox"
            defaultChecked={values.acceptsSubWork === "on"}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-400 accent-[#77591B]"
          />
          <label htmlFor="directory-accepts-sub-work" className="text-sm leading-snug text-stone-800">
            We take subcontract work
            <span className="block text-xs text-stone-500">Shown on your listing so other contractors can find you.</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <Field
            name="description"
            label="What you do"
            hint="A few plain sentences: the work you take on and who you do it for."
            error={errors.description}
          >
            {(props) => (
              <textarea
                {...props}
                name="description"
                rows={4}
                maxLength={L.description.max}
                defaultValue={values.description ?? ""}
                onChange={(event) => setDescriptionLength(event.target.value.length)}
                className={`${dirInput} min-h-28 resize-y leading-relaxed`}
              />
            )}
          </Field>
          <p className="mt-1 text-right text-xs tabular-nums text-stone-500" aria-hidden="true">
            {descriptionLength} / {L.description.max}
          </p>
        </div>
      </Group>

      <Group title="Where you work">
        <Field name="city" label="City" error={errors.city}>
          {(props) => (
            <input
              {...props}
              name="city"
              type="text"
              autoComplete="address-level2"
              maxLength={L.city.max}
              defaultValue={values.city ?? ""}
              className={dirInput}
            />
          )}
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-4">
          <Field name="state" label="State" error={errors.state}>
            {(props) => (
              <select {...props} name="state" autoComplete="address-level1" defaultValue={values.state ?? ""} className={dirInput}>
                <option value="" disabled>
                  Choose
                </option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="postalCode" label="ZIP" optional error={errors.postalCode}>
            {(props) => (
              <input
                {...props}
                name="postalCode"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                defaultValue={values.postalCode ?? ""}
                className={dirInput}
              />
            )}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            name="serviceArea"
            label="Service area"
            optional
            hint="The towns or counties you cover, for example: Salt Lake and Utah counties."
            error={errors.serviceArea}
          >
            {(props) => (
              <input
                {...props}
                name="serviceArea"
                type="text"
                maxLength={L.serviceArea.max}
                defaultValue={values.serviceArea ?? ""}
                className={dirInput}
              />
            )}
          </Field>
        </div>
      </Group>

      <Group title="How people reach you" note="The phone number and website are shown on your listing.">
        <Field name="phone" label="Business phone" error={errors.phone}>
          {(props) => (
            <input
              {...props}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              defaultValue={values.phone ?? ""}
              className={dirInput}
            />
          )}
        </Field>
        <Field name="website" label="Website" optional error={errors.website}>
          {(props) => (
            <input
              {...props}
              name="website"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="yourcompany.com"
              maxLength={L.website.max}
              defaultValue={values.website ?? ""}
              className={dirInput}
            />
          )}
        </Field>
      </Group>

      {mode === "create" ? (
        <Group title="Your email" note="Private. We use it to confirm the listing and to let you edit or remove it. It is never shown.">
          <div className="sm:col-span-2">
            <Field name="contactEmail" label="Email address" error={errors.contactEmail}>
              {(props) => (
                <input
                  {...props}
                  name="contactEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={L.email.max}
                  defaultValue={values.contactEmail ?? ""}
                  className={dirInput}
                />
              )}
            </Field>
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-start gap-2.5">
              <input
                id="directory-consent"
                name="consent"
                type="checkbox"
                // Still ticked after a submit that failed for another reason.
                defaultChecked={state.status === "error" && !errors.consent && Boolean(state.values)}
                aria-invalid={Boolean(errors.consent)}
                aria-describedby={errors.consent ? "directory-consent-error" : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-400 accent-[#77591B]"
              />
              <label htmlFor="directory-consent" className="text-sm leading-snug text-stone-800">
                {DIRECTORY_CONSENT_TEXT}
              </label>
            </div>
            {errors.consent ? (
              <p id="directory-consent-error" className={dirError}>
                {errors.consent}
              </p>
            ) : null}
          </div>
        </Group>
      ) : null}

      {/* Not for people. A filled-in value means a script wrote the form. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-stone-500">
          {mode === "create"
            ? "Free. No account. A person checks each listing before it shows."
            : "Changes to a live listing are checked before they show. Your listing stays up in the meantime."}
        </p>
        <button type="submit" disabled={pending} className={`${dirPrimaryButton} shrink-0`}>
          {pending ? "Sending…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
