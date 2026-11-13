"use client";

import { useId, useState } from "react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import type { CalculatorSlug } from "@/shared/lib/resources/calculator-summaries";
import { RESOURCE_LIST_CONSENT_TEXT } from "@/shared/lib/resources/email-list";

/**
 * "Email me these results", under a calculator's result.
 *
 * ============ WHAT IS SENT ============
 * The calculator's name, the numbers in the fields and the address typed
 * here. The result itself is NOT sent: the server works it out again from the
 * numbers (shared/lib/resources/calculator-summaries.ts), so the email cannot
 * be made to state a figure the calculator would not have produced.
 *
 * The address is used for that one email. It is kept only when the box is
 * ticked, and then only as "pending" until the link in the email is pressed.
 * The box starts unticked.
 */

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; note: string }
  | { kind: "error"; message: string };

const LIST_NOTES: Record<string, string> = {
  requested: " If you are new to the list, press the confirm link in that email.",
  unavailable: " We could not add you to the list just now; your result is still on its way.",
};

export function ResultsEmailForm({
  slug,
  values,
}: {
  readonly slug: CalculatorSlug;
  readonly values: Record<string, string>;
}) {
  const emailId = useId();
  const subscribeId = useId();
  const statusId = useId();
  const [email, setEmail] = useState("");
  const [subscribe, setSubscribe] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.kind === "sending") return;
    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/resources/email-results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, values, email, subscribe, website }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; list?: string }
        | null;
      if (!response.ok || !body?.ok) {
        setStatus({
          kind: "error",
          message: body?.error ?? "We could not send the email. Please try again in a moment.",
        });
        return;
      }
      trackEngagement("results_email_requested", slug, { repeat: true });
      setStatus({ kind: "sent", note: LIST_NOTES[body.list ?? ""] ?? "" });
    } catch {
      setStatus({ kind: "error", message: "We could not reach the server. Check your connection and try again." });
    }
  };

  return (
    <form
      onSubmit={submit}
      aria-label="Email me these results"
      className="mt-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-5 shadow-sm"
    >
      <label htmlFor={emailId} className="block text-sm font-semibold text-stone-900">
        Email me these results
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row lg:flex-col">
        <input
          id={emailId}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
          placeholder="you@yourcompany.com"
          value={email}
          aria-describedby={statusId}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status.kind !== "idle" && status.kind !== "sending") setStatus({ kind: "idle" });
          }}
          className="min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30"
        />
        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] px-5 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/60 disabled:opacity-60"
        >
          {status.kind === "sending" ? "Sending…" : "Send"}
        </button>
      </div>

      {/* Not for people. A filled-in value means a script wrote the form. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex items-start gap-2.5">
        <input
          id={subscribeId}
          type="checkbox"
          checked={subscribe}
          onChange={(event) => setSubscribe(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-400 accent-[#77591B]"
        />
        <label htmlFor={subscribeId} className="text-xs leading-relaxed text-stone-700">
          {RESOURCE_LIST_CONSENT_TEXT}
        </label>
      </div>

      <p id={statusId} role="status" aria-live="polite" className="mt-3 text-xs leading-relaxed">
        {status.kind === "sent" ? (
          <span className="font-medium text-[#2f5d2a]">Sent. Check your inbox in a minute.{status.note}</span>
        ) : status.kind === "error" ? (
          <span className="font-medium text-[#9a3412]">{status.message}</span>
        ) : (
          <span className="text-stone-500">
            We send the numbers above to our server to write the email and do not keep them. Your address is kept
            only if you tick the box.
          </span>
        )}
      </p>
    </form>
  );
}
