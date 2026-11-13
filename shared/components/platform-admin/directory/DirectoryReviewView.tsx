"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  approveListingAction,
  approveListingChangesAction,
  discardListingChangesAction,
  rejectListingAction,
  removeListingAsOwnerAction,
  resolveListingReportsAction,
  type DirectoryReviewActionResult,
} from "@/app/actions/platform-directory";
import type { DirectoryReviewData, DirectoryReviewItem } from "@/lib/directory/listings";
import {
  DIRECTORY_FIELD_LABELS,
  DIRECTORY_PATH,
  DIRECTORY_REPORT_REASONS,
  DIRECTORY_STATUS_LABELS,
  directoryListingPath,
  formatPhone,
  type DirectoryFieldKey,
  type DirectoryListingFields,
} from "@/shared/types/directory";

/**
 * The owner's review screen for the public directory.
 *
 * Ordered by what needs a decision: new listings first, then edits to live
 * listings, then reported listings, then everything else. Each card shows
 * exactly what would be public, plus the private email, and the buttons for
 * the decisions that make sense for it. Nothing here is public until
 * "Approve" is pressed.
 */

const card = "rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-sm";
const primary =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0A0A0A] px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60";
const secondary =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60";
const danger =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-[#e7b8a2] bg-white px-4 text-sm font-semibold text-[#8a2f0f] hover:bg-[#fdf3ee] disabled:opacity-60";

function show(key: DirectoryFieldKey, fields: DirectoryListingFields): string {
  switch (key) {
    case "phone":
      return formatPhone(fields.phone);
    case "acceptsSubWork":
      return fields.acceptsSubWork ? "Yes" : "No";
    case "postalCode":
      return fields.postalCode ?? "(none)";
    case "website":
      return fields.website ?? "(none)";
    case "serviceArea":
      return fields.serviceArea || "(none)";
    default:
      return String(fields[key]);
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(value),
  );
}

function Details({ fields }: { readonly fields: DirectoryListingFields }) {
  return (
    <>
      <p className="mt-1 text-sm text-stone-600">
        {fields.tradeType} · {fields.city}, {fields.state}
        {fields.postalCode ? ` ${fields.postalCode}` : ""}
        {fields.acceptsSubWork ? " · Takes subcontract work" : ""}
      </p>
      <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-stone-800">{fields.description}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-stone-500">Phone</dt>
          <dd className="font-medium tabular-nums text-stone-900">{formatPhone(fields.phone)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-stone-500">Website</dt>
          <dd className="min-w-0 break-all font-medium text-stone-900">
            {fields.website ? (
              <a href={fields.website} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
                {fields.website}
              </a>
            ) : (
              "(none)"
            )}
          </dd>
        </div>
        {fields.serviceArea ? (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="text-stone-500">Service area</dt>
            <dd className="font-medium text-stone-900">{fields.serviceArea}</dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}

type Kind = "new" | "edit" | "reported" | "other";
type Outcome = DirectoryReviewActionResult & { businessName: string };

function ListingCard({
  item,
  kind,
  onOutcome,
}: {
  readonly item: DirectoryReviewItem;
  readonly kind: Kind;
  readonly onOutcome: (outcome: Outcome | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  // The result is reported to the page, not kept here: after a decision this
  // card moves to another section, and a message kept in the card would
  // vanish at the moment it matters.
  const run = (action: () => Promise<DirectoryReviewActionResult>) => {
    onOutcome(null);
    startTransition(async () => {
      const result = await action();
      onOutcome({ ...result, businessName: item.fields.businessName });
    });
  };

  return (
    <li className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-lg font-semibold text-[#0A0A0A]">{item.fields.businessName}</h3>
        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
          {DIRECTORY_STATUS_LABELS[item.status]}
        </span>
      </div>
      <Details fields={item.fields} />

      {kind === "edit" && item.pendingFields ? (
        <div className="mt-4 rounded-xl border border-[#C2A05A]/40 bg-[#FBF6EA] px-4 py-3">
          <p className="text-sm font-semibold text-[#5c4614]">They want to change:</p>
          <ul className="mt-2 space-y-2 text-sm">
            {item.pendingChangedKeys.map((key) => (
              <li key={key}>
                <span className="font-medium text-stone-900">{DIRECTORY_FIELD_LABELS[key]}</span>
                <span className="block whitespace-pre-line break-words text-stone-600">
                  <span className="text-stone-500">Now: </span>
                  {show(key, item.fields)}
                </span>
                <span className="block whitespace-pre-line break-words text-stone-900">
                  <span className="text-stone-500">New: </span>
                  {show(key, item.pendingFields as DirectoryListingFields)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.openReports.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#e7b8a2] bg-[#fdf3ee] px-4 py-3">
          <p className="text-sm font-semibold text-[#8a2f0f]">
            Reported {item.openReports.length === 1 ? "once" : `${item.openReports.length} times`}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-stone-800">
            {item.openReports.map((report) => (
              <li key={report.id}>
                {DIRECTORY_REPORT_REASONS.find((reason) => reason.value === report.reason)?.label ?? report.reason}
                {report.note ? <span className="text-stone-600">: {report.note}</span> : null}
                <span className="text-stone-500"> ({formatDate(report.createdAt)})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-stone-500">
        Private email: <span className="font-medium text-stone-700">{item.contactEmail}</span> · Sent {formatDate(item.createdAt)}
        {item.status === "published" ? (
          <>
            {" · "}
            <Link href={directoryListingPath(item.slug)} target="_blank" className="font-medium text-[#77591B] underline-offset-2 hover:underline">
              Open the public page
            </Link>
          </>
        ) : null}
        {item.reviewNote ? ` · Your note: ${item.reviewNote}` : ""}
      </p>

      {item.status !== "removed" && item.status !== "pending_email" ? (
        <div className="mt-4 border-t border-stone-100 pt-4">
          {kind !== "edit" || item.status !== "published" ? null : (
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" disabled={pending} className={primary} onClick={() => run(() => approveListingChangesAction(item.id))}>
                Approve the change
              </button>
              <button type="button" disabled={pending} className={secondary} onClick={() => run(() => discardListingChangesAction(item.id))}>
                Decline the change
              </button>
            </div>
          )}
          <label className="block text-xs font-medium text-stone-600" htmlFor={`note-${item.id}`}>
            Note to the business (optional, sent with a decline or a take-down)
          </label>
          <input
            id={`note-${item.id}`}
            type="text"
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {item.status === "pending_review" || item.status === "rejected" ? (
              <button type="button" disabled={pending} className={primary} onClick={() => run(() => approveListingAction(item.id))}>
                Approve and publish
              </button>
            ) : null}
            {item.status === "pending_review" ? (
              <button type="button" disabled={pending} className={secondary} onClick={() => run(() => rejectListingAction(item.id, note))}>
                Decline
              </button>
            ) : null}
            {item.openReports.length > 0 ? (
              <button type="button" disabled={pending} className={secondary} onClick={() => run(() => resolveListingReportsAction(item.id))}>
                Clear reports, keep listing
              </button>
            ) : null}
            {item.status === "published" ? (
              <button type="button" disabled={pending} className={danger} onClick={() => run(() => removeListingAsOwnerAction(item.id, note))}>
                Take down
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {pending ? (
        <p role="status" className="mt-3 text-sm text-stone-500">
          Working…
        </p>
      ) : null}
    </li>
  );
}

function Section({
  title,
  empty,
  items,
  kind,
  onOutcome,
}: {
  readonly title: string;
  readonly empty: string;
  readonly items: DirectoryReviewItem[];
  readonly kind: Kind;
  readonly onOutcome: (outcome: Outcome | null) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-[#0A0A0A]">
        {title} <span className="font-normal text-stone-500">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <ListingCard key={item.id} item={item} kind={kind} onOutcome={onOutcome} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function DirectoryReviewView({ data }: { readonly data: DirectoryReviewData }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  if (data.items === null) {
    return (
      <div className={card}>
        <h1 className="text-xl font-semibold text-[#0A0A0A]">Contractor directory</h1>
        <p className="mt-2 text-sm text-stone-700">
          The directory is not set up in the database yet. Run migration 210 in Supabase, then reload this page.
        </p>
      </div>
    );
  }

  const fresh = data.items.filter((item) => item.status === "pending_review");
  const edits = data.items.filter((item) => item.status === "published" && item.pendingFields);
  const reported = data.items.filter((item) => item.status === "published" && !item.pendingFields && item.openReports.length > 0);
  const live = data.items.filter((item) => item.status === "published" && !item.pendingFields && item.openReports.length === 0);
  const waitingOnEmail = data.items.filter((item) => item.status === "pending_email");
  const closed = data.items.filter((item) => item.status === "rejected" || item.status === "removed");
  const needsYou = fresh.length + edits.length + reported.length;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Contractor directory</h1>
          <p className="mt-1 text-sm text-stone-600">
            {needsYou === 0 ? "Nothing is waiting for you." : `${needsYou} ${needsYou === 1 ? "thing needs" : "things need"} your decision.`}{" "}
            {data.counts.published} live, {data.counts.pending_email} waiting for the business to confirm its email.
          </p>
        </div>
        <Link href={DIRECTORY_PATH} target="_blank" className={secondary}>
          Open the public directory
        </Link>
      </div>

      {outcome ? (
        <div
          role="status"
          className={[
            "mt-5 rounded-xl border px-4 py-3 text-sm",
            outcome.error ? "border-[#e7b8a2] bg-[#fdf3ee] text-[#8a2f0f]" : "border-[#b9d5b3] bg-[#f1f8ef] text-[#2f5d2a]",
          ].join(" ")}
        >
          <p className="font-semibold">
            {outcome.businessName}: {outcome.error ?? outcome.success}
          </p>
          {outcome.warning ? <p className="mt-1 text-[#8a2f0f]">{outcome.warning}</p> : null}
        </div>
      ) : null}

      <Section title="New listings to approve" empty="No new listings." items={fresh} kind="new" onOutcome={setOutcome} />
      <Section title="Changes to live listings" empty="No changes waiting." items={edits} kind="edit" onOutcome={setOutcome} />
      <Section title="Reported listings" empty="No reports." items={reported} kind="reported" onOutcome={setOutcome} />
      <Section title="Live" empty="No live listings yet." items={live} kind="other" onOutcome={setOutcome} />
      <Section
        title="Waiting for the business to confirm its email"
        empty="None."
        items={waitingOnEmail}
        kind="other"
        onOutcome={setOutcome}
      />
      <Section title="Declined or removed" empty="None." items={closed} kind="other" onOutcome={setOutcome} />
    </div>
  );
}
