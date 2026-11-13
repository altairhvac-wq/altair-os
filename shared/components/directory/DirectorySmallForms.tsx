"use client";

import { useActionState, useId } from "react";
import {
  reportListingAction,
  requestManageLinkAction,
  type DirectoryFormState,
  type DirectoryReportState,
} from "@/app/actions/directory";
import {
  dirError,
  dirInput,
  dirLabel,
  dirPrimaryButton,
  dirSecondaryButton,
} from "@/shared/components/directory/directory-styles";
import { DIRECTORY_LIMITS, DIRECTORY_REPORT_REASONS } from "@/shared/types/directory";

/** The two small forms of the public directory: "email me my manage link" and "report this listing". */

function Trap() {
  // Not for people. A filled-in value means a script wrote the form.
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Company website
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

function Notice({ state }: { readonly state: { status: string; message?: string } }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`text-sm font-medium ${state.status === "error" ? "text-[#9a3412]" : "text-[#2f5d2a]"}`}
    >
      {state.message}
    </p>
  );
}

const LINK_INITIAL: DirectoryFormState = { status: "idle" };

export function ManageLinkRequestForm() {
  const [state, action, pending] = useActionState(requestManageLinkAction, LINK_INITIAL);
  const id = useId();
  if (state.status === "done") return <Notice state={state} />;
  return (
    <form action={action} noValidate className="space-y-3">
      <div>
        <label htmlFor={id} className={dirLabel}>
          The email address you listed with
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id={id}
            name="contactEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={DIRECTORY_LIMITS.email.max}
            aria-invalid={Boolean(state.errors?.contactEmail)}
            className={dirInput}
          />
          <button type="submit" disabled={pending} className={`${dirPrimaryButton} shrink-0`}>
            {pending ? "Sending…" : "Email me the link"}
          </button>
        </div>
        {state.errors?.contactEmail ? <p className={dirError}>{state.errors.contactEmail}</p> : null}
      </div>
      <Trap />
      <Notice state={state} />
    </form>
  );
}

const REPORT_INITIAL: DirectoryReportState = { status: "idle" };

export function ReportListingForm({ slug }: { readonly slug: string }) {
  const [state, action, pending] = useActionState(reportListingAction, REPORT_INITIAL);
  const reasonId = useId();
  const noteId = useId();
  if (state.status === "done") return <Notice state={state} />;
  return (
    <form action={action} noValidate className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label htmlFor={reasonId} className={dirLabel}>
          What is wrong with it?
        </label>
        <select id={reasonId} name="reason" defaultValue="" className={`mt-1.5 ${dirInput}`}>
          <option value="" disabled>
            Choose one
          </option>
          {DIRECTORY_REPORT_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={noteId} className={dirLabel}>
          Anything we should know <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <textarea id={noteId} name="note" rows={2} maxLength={DIRECTORY_LIMITS.reportNote.max} className={`mt-1.5 ${dirInput}`} />
      </div>
      <Trap />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={dirSecondaryButton}>
          {pending ? "Sending…" : "Send report"}
        </button>
        <Notice state={state} />
      </div>
    </form>
  );
}
