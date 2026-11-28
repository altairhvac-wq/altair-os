"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { submitAffiliateApplicationAction, type AffiliateFormState } from "@/app/actions/affiliates";
import {
  dirCard,
  dirError,
  dirHint,
  dirInput,
  dirLabel,
  dirPrimaryButton,
} from "@/shared/components/directory/directory-styles";
import {
  AFFILIATE_AUDIENCE_SIZES,
  AFFILIATE_LIMITS,
  AFFILIATE_PARTNER_TYPES,
  AFFILIATE_RULES_TEXT,
  type AffiliateFieldErrors,
} from "@/shared/types/affiliates";
import { US_STATES } from "@/shared/types/directory";

/**
 * The affiliate program application: one screen, three short groups, the
 * same fields and look as the directory's listing form.
 *
 * Every field has a visible label; a mistake is described under the field it
 * belongs to and announced once at the top, and everything else that was
 * typed is still there. When the application is in, the form is replaced by
 * what happens next, so it cannot be sent twice by accident.
 *
 * The form works without JavaScript (it posts to a Server Action). The two
 * character counts and the "how long was this open" field are the only parts
 * that need it, and the action does not require either.
 */

const INITIAL: AffiliateFormState = { status: "idle" };

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

function CountedTextarea({
  name,
  max,
  defaultValue,
  fieldProps,
}: {
  readonly name: string;
  readonly max: number;
  readonly defaultValue: string;
  readonly fieldProps: { id: string; "aria-describedby": string | undefined; "aria-invalid": boolean };
}) {
  const [length, setLength] = useState(defaultValue.length);
  return (
    <>
      <textarea
        {...fieldProps}
        name={name}
        rows={3}
        maxLength={max}
        defaultValue={defaultValue}
        onChange={(event) => setLength(event.target.value.length)}
        className={`${dirInput} min-h-24 resize-y leading-relaxed`}
      />
      <p className="mt-1 text-right text-xs tabular-nums text-stone-500" aria-hidden="true">
        {length} / {max}
      </p>
    </>
  );
}

export function AffiliateApplicationForm() {
  const [state, formAction, pending] = useActionState(submitAffiliateApplicationAction, INITIAL);
  const values = state.values ?? {};
  const errors: AffiliateFieldErrors = state.errors ?? {};
  const L = AFFILIATE_LIMITS;

  // When the page was opened, so the action can tell a person from a script
  // that posts the form the instant it loads.
  const openedAt = useRef<number | null>(null);
  const elapsedField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  if (state.status === "done") {
    return (
      <div role="status" className={`px-6 py-8 text-center ${dirCard}`}>
        <p className="text-lg font-semibold text-[#0A0A0A]">Your application is in.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-700">{state.message}</p>
      </div>
    );
  }

  return (
    // The key remounts the fields with what was just submitted, so a form
    // with one mistake in it keeps everything else that was typed.
    <form
      key={JSON.stringify(values)}
      action={formAction}
      noValidate
      className="space-y-5"
      onSubmit={() => {
        if (elapsedField.current && openedAt.current !== null) {
          elapsedField.current.value = String(Date.now() - openedAt.current);
        }
      }}
    >
      {state.message ? (
        <p role="alert" className="rounded-xl border border-[#e7b8a2] bg-[#fdf3ee] px-4 py-3 text-sm font-medium text-[#8a2f0f]">
          {state.message}
        </p>
      ) : null}

      <Group title="About you">
        <Field name="fullName" label="Your name" error={errors.fullName}>
          {(props) => (
            <input
              {...props}
              name="fullName"
              type="text"
              autoComplete="name"
              maxLength={L.fullName.max}
              defaultValue={values.fullName ?? ""}
              className={dirInput}
            />
          )}
        </Field>
        <Field name="email" label="Email address" hint="Private. We use it to reply to you." error={errors.email}>
          {(props) => (
            <input
              {...props}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              defaultValue={values.email ?? ""}
              className={dirInput}
            />
          )}
        </Field>
        <Field name="businessName" label="Business, channel or show name" error={errors.businessName}>
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
        <Field name="state" label="State" hint="The program is open to people in the United States for now." error={errors.state}>
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
        <div className="sm:col-span-2">
          <Field name="partnerType" label="What you do" error={errors.partnerType}>
            {(props) => (
              <select {...props} name="partnerType" defaultValue={values.partnerType ?? ""} className={dirInput}>
                <option value="" disabled>
                  Choose one
                </option>
                {AFFILIATE_PARTNER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Group>

      <Group title="The people you reach">
        <Field
          name="audienceUrl"
          label="Where we can see your work"
          hint="Your site, channel, show or page."
          error={errors.audienceUrl}
        >
          {(props) => (
            <input
              {...props}
              name="audienceUrl"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="yoursite.com"
              maxLength={L.url.max}
              defaultValue={values.audienceUrl ?? ""}
              className={dirInput}
            />
          )}
        </Field>
        <Field name="linkedinUrl" label="LinkedIn profile" optional error={errors.linkedinUrl}>
          {(props) => (
            <input
              {...props}
              name="linkedinUrl"
              type="text"
              inputMode="url"
              placeholder="linkedin.com/in/yourname"
              maxLength={L.url.max}
              defaultValue={values.linkedinUrl ?? ""}
              className={dirInput}
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field name="audienceSize" label="About how many people" error={errors.audienceSize}>
            {(props) => (
              <select {...props} name="audienceSize" defaultValue={values.audienceSize ?? ""} className={dirInput}>
                <option value="" disabled>
                  Choose a range
                </option>
                {AFFILIATE_AUDIENCE_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            name="audienceDescription"
            label="Who they are"
            hint="For example: owners of one to five truck HVAC shops in the Midwest."
            error={errors.audienceDescription}
          >
            {(props) => (
              <CountedTextarea
                name="audienceDescription"
                max={L.audienceDescription.max}
                defaultValue={values.audienceDescription ?? ""}
                fieldProps={props}
              />
            )}
          </Field>
        </div>
      </Group>

      <Group title="How you would share it">
        <div className="sm:col-span-2">
          <Field
            name="promotionPlan"
            label="How you would tell them about it"
            hint="A video, a newsletter, a word to your clients. Whatever you would really do."
            error={errors.promotionPlan}
          >
            {(props) => (
              <CountedTextarea
                name="promotionPlan"
                max={L.promotionPlan.max}
                defaultValue={values.promotionPlan ?? ""}
                fieldProps={props}
              />
            )}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            name="existingPartnerships"
            label="Software companies you already work with"
            optional
            hint="Sponsors, partner programs or resale deals. It does not rule you out. We ask so nobody is surprised later."
            error={errors.existingPartnerships}
          >
            {(props) => (
              <input
                {...props}
                name="existingPartnerships"
                type="text"
                maxLength={L.existingPartnerships.max}
                defaultValue={values.existingPartnerships ?? ""}
                className={dirInput}
              />
            )}
          </Field>
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-start gap-2.5">
            <input
              id="affiliate-rules"
              name="rules"
              type="checkbox"
              // Still ticked after a submit that failed for another reason.
              defaultChecked={state.status === "error" && !errors.rules && Boolean(state.values)}
              aria-invalid={Boolean(errors.rules)}
              aria-describedby={errors.rules ? "affiliate-rules-error" : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-400 accent-[#77591B]"
            />
            <label htmlFor="affiliate-rules" className="text-sm leading-snug text-stone-800">
              {AFFILIATE_RULES_TEXT}
            </label>
          </div>
          {errors.rules ? (
            <p id="affiliate-rules-error" className={dirError}>
              {errors.rules}
            </p>
          ) : null}
        </div>
      </Group>

      {/* Not for people. A filled-in value means a script wrote the form. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input ref={elapsedField} type="hidden" name="elapsed_ms" defaultValue="" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-stone-500">
          Applying does not commit you to anything. A person reads every application.
        </p>
        <button type="submit" disabled={pending} className={`${dirPrimaryButton} shrink-0`}>
          {pending ? "Sending…" : "Send my application"}
        </button>
      </div>
    </form>
  );
}
