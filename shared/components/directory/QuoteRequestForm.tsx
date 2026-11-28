"use client";

import { useActionState, useState } from "react";
import { CircleCheck, HardHat, Home, Send } from "lucide-react";
import { sendQuoteRequestAction, type QuoteFormState } from "@/app/actions/directory-quote";
import { dirBrassButton, dirError, dirFocus, dirInput, dirLabel } from "@/shared/components/directory/directory-styles";
import { QUOTE_LIMITS, QUOTE_TIMING_OPTIONS, type QuoteRequestKind } from "@/shared/types/directory-quote";

/**
 * "Request a quote" on a listing page (migration 216). A homeowner asks for a
 * quote; when the business takes subcontract work, a contractor can switch to
 * "I have sub work" instead. The request goes to this one business only.
 *
 * Plain form fields posted to a Server Action, so the server re-checks every
 * one; this component only keeps what was typed and shows the answer.
 */
export function QuoteRequestForm({
  slug,
  businessName,
  phoneDisplay,
  acceptsSubWork,
  initialKind = "customer",
}: {
  readonly slug: string;
  readonly businessName: string;
  readonly phoneDisplay: string;
  readonly acceptsSubWork: boolean;
  readonly initialKind?: QuoteRequestKind;
}) {
  const [state, action, pending] = useActionState<QuoteFormState, FormData>(sendQuoteRequestAction, { status: "idle" });
  const [kind, setKind] = useState<QuoteRequestKind>(acceptsSubWork ? initialKind : "customer");
  const values = state.values ?? {};
  const errors = state.errors ?? {};
  const sub = kind === "sub";

  if (state.status === "done") {
    return (
      <div role="status" className="rounded-2xl border border-[#C2A05A]/45 bg-[#FBF6EA] px-5 py-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-[#3b2f14]">
          <CircleCheck aria-hidden="true" className="h-5 w-5 text-[#77591B]" /> Sent to {businessName}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#5c4614]">
          They will reach out by phone. Need it sooner? Call {phoneDisplay}.
        </p>
      </div>
    );
  }

  const field = (name: keyof typeof errors) => (errors[name] ? { "aria-invalid": true, "aria-describedby": `quote-${name}-error` } : {});
  const error = (name: keyof typeof errors) =>
    errors[name] ? (
      <p id={`quote-${name}-error`} className={dirError}>
        {errors[name]}
      </p>
    ) : null;

  return (
    <form action={action} id="request" className="relative rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)]" data-track-submit="dir-quote-submit">
      <h2 className="text-base font-semibold text-[#0A0A0A]">{sub ? "Offer sub work" : "Request a quote"}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-stone-600">Sent straight to {businessName}. They contact you.</p>

      {acceptsSubWork ? (
        <div role="group" aria-label="Who is asking" className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
          {(
            [
              ["customer", Home, "I need a quote"],
              ["sub", HardHat, "I have sub work"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold transition-colors ${dirFocus} ${
                kind === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      ) : null}

      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="kind" value={kind} />
      {/* Left empty by people; filled by simple scripts. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="quote-details" className={dirLabel}>
            {sub ? "The work: trade, scope and where" : "What do you need?"}
          </label>
          <textarea
            id="quote-details"
            name="details"
            rows={3}
            maxLength={QUOTE_LIMITS.details.max}
            defaultValue={values.details ?? ""}
            placeholder={sub ? "Rough-in for 12 townhomes in Lehi, plans ready" : "Furnace is running but not heating upstairs"}
            className={`mt-1 ${dirInput} min-h-[5.5rem] py-2`}
            required
            {...field("details")}
          />
          {error("details")}
        </div>
        {sub ? (
          <div>
            <label htmlFor="quote-company" className={dirLabel}>
              Your company
            </label>
            <input id="quote-company" name="company" type="text" maxLength={QUOTE_LIMITS.company.max} autoComplete="organization" defaultValue={values.company ?? ""} className={`mt-1 ${dirInput}`} {...field("company")} />
            {error("company")}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quote-name" className={dirLabel}>
              Your name
            </label>
            <input id="quote-name" name="name" type="text" maxLength={QUOTE_LIMITS.name.max} autoComplete="name" defaultValue={values.name ?? ""} className={`mt-1 ${dirInput}`} required {...field("name")} />
            {error("name")}
          </div>
          <div>
            <label htmlFor="quote-phone" className={dirLabel}>
              Phone
            </label>
            <input id="quote-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={values.phone ?? ""} className={`mt-1 ${dirInput}`} required {...field("phone")} />
            {error("phone")}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quote-email" className={dirLabel}>
              Email <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <input id="quote-email" name="email" type="email" autoComplete="email" defaultValue={values.email ?? ""} className={`mt-1 ${dirInput}`} {...field("email")} />
            {error("email")}
          </div>
          <div>
            <label htmlFor="quote-place" className={dirLabel}>
              City or ZIP
            </label>
            <input id="quote-place" name="place" type="text" maxLength={QUOTE_LIMITS.place.max} autoComplete="address-level2" defaultValue={values.place ?? ""} className={`mt-1 ${dirInput}`} {...field("place")} />
            {error("place")}
          </div>
        </div>
        <div>
          <label htmlFor="quote-timing" className={dirLabel}>
            {sub ? "When does it start?" : "Best time to call"}
          </label>
          <select key={kind} id="quote-timing" name="timing" defaultValue={values.timing ?? QUOTE_TIMING_OPTIONS[kind][0]} className={`mt-1 ${dirInput}`}>
            {QUOTE_TIMING_OPTIONS[kind].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-4 rounded-lg border border-[#e7c9a8] bg-[#fdf6ee] px-3 py-2 text-sm text-[#7a3d10]">
          {state.message}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`mt-4 w-full ${dirBrassButton}`}>
        <Send aria-hidden="true" className="h-4 w-4" /> {pending ? "Sending…" : sub ? "Send to this business" : "Send request"}
      </button>
      <p className="mt-2.5 text-[12px] leading-relaxed text-stone-500">Your details go only to {businessName}. Nobody else sees them.</p>
    </form>
  );
}
