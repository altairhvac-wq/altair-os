"use client";

import { useActionState, useId, useState } from "react";
import { MailCheck, Send } from "lucide-react";
import { sendContactMessageAction, type ContactFormState } from "@/app/actions/contact";
import { CONTACT_MESSAGE_MAX, CONTACT_TOPICS } from "@/shared/lib/site/contact-topics";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

/**
 * "Write to us" on /contact.
 *
 * Since 2026-11-24 the message is SENT from the site (app/actions/contact.ts)
 * to the support inbox, with the visitor's address as reply-to. Before, it
 * only opened the visitor's own email app, and with no email app set up
 * nothing happened at all. Nothing typed here is stored.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const field =
  "mt-1.5 block w-full rounded-lg border border-[rgba(230,227,220,0.16)] bg-[rgba(8,9,7,0.6)] px-3.5 py-3 text-[15px] text-[#fff9ea] placeholder:text-[#6f6656] transition-colors focus:border-[#c2a05a]/70 focus:outline-none focus:ring-2 focus:ring-[#c2a05a]/25";
const label = "text-[13px] font-semibold text-[#e8d9ac]";
const errorText = "mt-2 text-sm font-medium text-[#f0a58f]";

const INITIAL: ContactFormState = { status: "idle" };

export function ContactComposer({ defaultTopic = "trial" }: { defaultTopic?: string }) {
  const ids = useId();
  const [state, action, pending] = useActionState(sendContactMessageAction, INITIAL);
  const [length, setLength] = useState(state.values?.message.length ?? 0);
  const v = state.values;

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-xl border border-[rgba(194,160,90,0.3)] bg-[rgba(194,160,90,0.06)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <MailCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#c2a05a]" />
          <div>
            <p className="text-base font-semibold text-[#fff9ea]">Message sent</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#c9bfae]">{state.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Keyed on what came back, so a select keeps the visitor's choice after an error (React does not re-apply a
    // changed defaultValue to a mounted select).
    <form key={v ? `${v.topic}|${v.email}` : "new"} action={action} noValidate data-track-submit="contact-form" className="space-y-4">
      {/* People never see or fill this; app/actions/contact.ts drops anything that does. */}
      <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${ids}-website`}>Leave this empty</label>
        <input id={`${ids}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor={`${ids}-topic`} className={label}>
          What is it about?
        </label>
        <select
          id={`${ids}-topic`}
          name="topic"
          defaultValue={v?.topic ?? defaultTopic}
          className={`${field} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c2a05a' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-10`}
        >
          {CONTACT_TOPICS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-name`} className={label}>
            Your name <span className="font-normal text-[#8e826f]">(optional)</span>
          </label>
          <input id={`${ids}-name`} name="name" defaultValue={v?.name} autoComplete="name" maxLength={80} className={field} />
        </div>
        <div>
          <label htmlFor={`${ids}-company`} className={label}>
            Company <span className="font-normal text-[#8e826f]">(optional)</span>
          </label>
          <input id={`${ids}-company`} name="company" defaultValue={v?.company} autoComplete="organization" maxLength={100} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor={`${ids}-email`} className={label}>
          Your email
        </label>
        <input
          id={`${ids}-email`}
          name="email"
          type="email"
          inputMode="email"
          defaultValue={v?.email}
          autoComplete="email"
          maxLength={254}
          aria-invalid={state.errors?.email ? true : undefined}
          aria-describedby={state.errors?.email ? `${ids}-email-error` : undefined}
          className={field}
        />
        {state.errors?.email ? (
          <p id={`${ids}-email-error`} className={errorText}>
            {state.errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${ids}-message`} className={label}>
            Your message
          </label>
          <span className="text-xs tabular-nums text-[#8e826f]" aria-hidden="true">
            {length}/{CONTACT_MESSAGE_MAX}
          </span>
        </div>
        <textarea
          id={`${ids}-message`}
          name="message"
          defaultValue={v?.message}
          onChange={(event) => setLength(event.target.value.length)}
          rows={5}
          maxLength={CONTACT_MESSAGE_MAX}
          aria-invalid={state.errors?.message ? true : undefined}
          aria-describedby={state.errors?.message ? `${ids}-message-error` : `${ids}-help`}
          placeholder="How many people are on your team, what you use today, and what you want to know."
          className={`${field} resize-y leading-relaxed`}
        />
        {state.errors?.message ? (
          <p id={`${ids}-message-error`} className={errorText}>
            {state.errors.message}
          </p>
        ) : (
          <p id={`${ids}-help`} className="mt-2 text-xs leading-relaxed text-[#8e826f]">
            It goes straight to {SUPPORT_EMAIL}, and the founder reads it.
          </p>
        )}
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className="rounded-lg border border-[#f0a58f]/40 bg-[#f0a58f]/10 px-3.5 py-2.5 text-sm text-[#f6c9bb]">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#a4823a] px-6 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] disabled:opacity-60 sm:w-auto ${focusRing}`}
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
