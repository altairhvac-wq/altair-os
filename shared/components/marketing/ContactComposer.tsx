"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, Copy, Mail, MailCheck } from "lucide-react";
import { CONTACT_MESSAGE_MAX, CONTACT_TOPICS, type ContactTopic } from "@/shared/lib/site/contact-topics";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

/**
 * "Write to us" on /contact.
 *
 * ============ NOTHING IS SENT FROM HERE ============
 * The page has no contact form on the server, and this is not one: it puts
 * the visitor's words into their own email app (a mailto: link) addressed to
 * the support inbox, with the topic as the subject. Nothing typed here
 * leaves the browser until they press Send in their email app, so there is
 * nothing to store, rate-limit or leak. If no email app opens, the message
 * can be copied instead.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const field =
  "mt-1.5 block w-full rounded-lg border border-[rgba(230,227,220,0.16)] bg-[rgba(8,9,7,0.6)] px-3.5 py-3 text-[15px] text-[#fff9ea] placeholder:text-[#6f6656] transition-colors focus:border-[#c2a05a]/70 focus:outline-none focus:ring-2 focus:ring-[#c2a05a]/25";
const label = "text-[13px] font-semibold text-[#e8d9ac]";

type Status = "editing" | "opened";

export function ContactComposer() {
  const ids = useId();
  const [topic, setTopic] = useState<ContactTopic>("trial");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("editing");
  const [copied, setCopied] = useState(false);

  const subject = CONTACT_TOPICS.find((entry) => entry.value === topic)?.subject ?? "Question";
  const signature = [name.trim(), company.trim()].filter(Boolean).join(", ");
  const body = `${message.trim()}${signature ? `\n\n${signature}` : ""}`;
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 5) {
      setError("Write a line or two first, so we know how to help.");
      return;
    }
    setError(null);
    setStatus("opened");
    window.location.href = mailto;
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(`To: ${SUPPORT_EMAIL}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  if (status === "opened") {
    return (
      <div role="status" className="rounded-xl border border-[rgba(194,160,90,0.3)] bg-[rgba(194,160,90,0.06)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <MailCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#c2a05a]" />
          <div>
            <p className="text-base font-semibold text-[#fff9ea]">Your email app should now be open</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#c9bfae]">
              The message is addressed to {SUPPORT_EMAIL} and ready. It is not sent until you press Send there. If
              nothing opened, copy it and paste it into any email.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={copyMessage}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#a4823a] px-5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing}`}
          >
            {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
            {copied ? "Copied" : "Copy the message"}
          </button>
          <button
            type="button"
            onClick={() => setStatus("editing")}
            className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-5 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[rgba(230,227,220,0.32)] ${focusRing}`}
          >
            Edit the message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${ids}-topic`} className={label}>
          What is it about?
        </label>
        <select
          id={`${ids}-topic`}
          value={topic}
          onChange={(event) => setTopic(event.target.value as ContactTopic)}
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
          <input
            id={`${ids}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={80}
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${ids}-company`} className={label}>
            Company <span className="font-normal text-[#8e826f]">(optional)</span>
          </label>
          <input
            id={`${ids}-company`}
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            autoComplete="organization"
            maxLength={100}
            className={field}
          />
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${ids}-message`} className={label}>
            Your message
          </label>
          <span className="text-xs tabular-nums text-[#8e826f]" aria-hidden="true">
            {message.length}/{CONTACT_MESSAGE_MAX}
          </span>
        </div>
        <textarea
          id={`${ids}-message`}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            if (error) setError(null);
          }}
          rows={5}
          maxLength={CONTACT_MESSAGE_MAX}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${ids}-error` : `${ids}-help`}
          placeholder="How many people are on your team, what you use today, and what you want to know."
          className={`${field} resize-y leading-relaxed`}
        />
        {error ? (
          <p id={`${ids}-error`} className="mt-2 text-sm font-medium text-[#f0a58f]">
            {error}
          </p>
        ) : (
          <p id={`${ids}-help`} className="mt-2 text-xs leading-relaxed text-[#8e826f]">
            This opens your own email app with the message filled in. Nothing is sent until you press Send there.
          </p>
        )}
      </div>
      <button
        type="submit"
        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#a4823a] px-6 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] sm:w-auto ${focusRing}`}
      >
        <Mail aria-hidden="true" className="h-4 w-4" />
        Write it in my email app
      </button>
    </form>
  );
}
