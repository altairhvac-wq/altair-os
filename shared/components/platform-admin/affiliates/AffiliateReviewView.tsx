"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { decideAffiliateApplicationAction, type AffiliateReviewActionResult } from "@/app/actions/platform-affiliates";
import type { AffiliateApplicationRecord, AffiliateReviewData } from "@/lib/affiliates/applications";
import {
  AFFILIATES_PATH,
  AFFILIATE_LIMITS,
  AFFILIATE_PROGRAM,
  AFFILIATE_STATUS_LABELS,
  affiliateAudienceSizeLabel,
  affiliatePartnerTypeLabel,
  buildPartnerWelcomeMessage,
  type AffiliateApplicationStatus,
} from "@/shared/types/affiliates";

/**
 * The owner's review screen for affiliate program applications.
 *
 * Applications waiting for a decision come first, then approved partners,
 * then declined ones. Each card shows everything the applicant wrote and the
 * buttons for the decisions that make sense for it.
 *
 * A decision here is a record. Nothing is emailed to the applicant, no code
 * is made in Stripe and nobody is paid: an approved card says so, and shows
 * the welcome message for the owner to send themselves.
 */

const card = "rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-sm";
const primary =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0A0A0A] px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60";
const secondary =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60";
const input =
  "min-h-10 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30";

type Outcome = AffiliateReviewActionResult & { name: string };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(value),
  );
}

/** "Dana Whitfield" suggests DANA; the owner can type anything else. */
function suggestCode(fullName: string): string {
  const [first = ""] = fullName.split(" ");
  return first.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, AFFILIATE_LIMITS.partnerCode.max);
}

function Answer({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-stone-900">{children}</dd>
    </div>
  );
}

function ExternalLink({ href }: { readonly href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline underline-offset-2">
      {href}
    </a>
  );
}

function WelcomeMessage({ application, siteOrigin }: { readonly application: AffiliateApplicationRecord; readonly siteOrigin: string }) {
  const [copied, setCopied] = useState(false);
  if (!application.partnerCode) return null;
  const message = buildPartnerWelcomeMessage({
    fullName: application.fields.fullName,
    partnerCode: application.partnerCode,
    siteOrigin,
  });
  const mailto = `mailto:${application.email}?subject=${encodeURIComponent("Welcome to the Altair Operating System partner program")}&body=${encodeURIComponent(message)}`;
  return (
    <div className="mt-4 rounded-xl border border-[#C2A05A]/40 bg-[#FBF6EA] px-4 py-4">
      <p className="text-sm font-semibold text-[#3d2f0e]">Two things left for you to do. Nothing has been sent.</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-[#3d2f0e]">
        <li>
          In Stripe, make a promotion code <span className="font-mono font-semibold">{application.partnerCode}</span> on a coupon for
          one free month, limited to first-time customers.
        </li>
        <li>Send this welcome message. Change any of it first.</li>
      </ol>
      <textarea
        readOnly
        aria-label={`Welcome message for ${application.fields.fullName}`}
        value={message}
        rows={22}
        className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-stone-800"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondary}
          onClick={() => {
            void navigator.clipboard.writeText(message).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {copied ? "Copied" : "Copy the message"}
        </button>
        <a href={mailto} className={secondary}>
          Open it in my email
        </a>
      </div>
    </div>
  );
}

function ApplicationCard({
  application,
  siteOrigin,
  onOutcome,
}: {
  readonly application: AffiliateApplicationRecord;
  readonly siteOrigin: string;
  readonly onOutcome: (outcome: Outcome | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState(application.partnerCode ?? suggestCode(application.fields.fullName));
  const [note, setNote] = useState(application.reviewNote ?? "");
  const { fields } = application;

  // The result is reported to the page, not kept here: after a decision this
  // card moves to another section, and a message kept in the card would
  // vanish at the moment it matters.
  const decide = (status: AffiliateApplicationStatus) => {
    onOutcome(null);
    startTransition(async () => {
      const result = await decideAffiliateApplicationAction({
        applicationId: application.id,
        status,
        partnerCode: code,
        note,
      });
      onOutcome({ ...result, name: fields.fullName });
    });
  };

  return (
    <li className={card}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold text-[#0A0A0A]">{fields.fullName}</h3>
          <p className="mt-0.5 break-words text-sm text-stone-600">
            {fields.businessName} · {affiliatePartnerTypeLabel(fields.partnerType)} · {fields.state}
          </p>
        </div>
        <p className="text-xs text-stone-500">Applied {formatDate(application.createdAt)}</p>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Answer label="Email">
          <a href={`mailto:${application.email}`} className="break-all underline underline-offset-2">
            {application.email}
          </a>
        </Answer>
        <Answer label="How many people">{affiliateAudienceSizeLabel(fields.audienceSize)}</Answer>
        <Answer label="Where to see their work">
          <ExternalLink href={fields.audienceUrl} />
        </Answer>
        <Answer label="LinkedIn">{fields.linkedinUrl ? <ExternalLink href={fields.linkedinUrl} /> : "(none given)"}</Answer>
        <div className="sm:col-span-2">
          <Answer label="Who their audience is">{fields.audienceDescription}</Answer>
        </div>
        <div className="sm:col-span-2">
          <Answer label="How they would share it">{fields.promotionPlan}</Answer>
        </div>
        <div className="sm:col-span-2">
          <Answer label="Software companies they already work with">{fields.existingPartnerships || "(none given)"}</Answer>
        </div>
      </dl>

      {application.status === "approved" ? <WelcomeMessage application={application} siteOrigin={siteOrigin} /> : null}

      <div className="mt-4 border-t border-stone-200 pt-4">
        <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
          {application.status === "new" ? (
            <label className="block text-xs font-medium text-stone-700">
              Partner code
              <input
                type="text"
                value={code}
                maxLength={AFFILIATE_LIMITS.partnerCode.max}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className={`${input} mt-1 font-mono uppercase`}
              />
            </label>
          ) : null}
          <label className={`block text-xs font-medium text-stone-700 ${application.status === "new" ? "" : "sm:col-span-2"}`}>
            Note to yourself (never shown to them)
            <input
              type="text"
              value={note}
              maxLength={AFFILIATE_LIMITS.reviewNote.max}
              onChange={(event) => setNote(event.target.value)}
              className={`${input} mt-1`}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {application.status === "new" ? (
            <>
              <button type="button" disabled={pending} className={primary} onClick={() => decide("approved")}>
                Approve
              </button>
              <button type="button" disabled={pending} className={secondary} onClick={() => decide("declined")}>
                Decline
              </button>
            </>
          ) : (
            <button type="button" disabled={pending} className={secondary} onClick={() => decide("new")}>
              Move back to waiting
            </button>
          )}
        </div>
        {application.status === "new" ? (
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Neither button sends anything. Reply to them yourself from your own email.
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Section({
  title,
  empty,
  applications,
  siteOrigin,
  onOutcome,
}: {
  readonly title: string;
  readonly empty: string;
  readonly applications: AffiliateApplicationRecord[];
  readonly siteOrigin: string;
  readonly onOutcome: (outcome: Outcome | null) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-[#0A0A0A]">
        {title} <span className="font-normal text-stone-500">({applications.length})</span>
      </h2>
      {applications.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} siteOrigin={siteOrigin} onOutcome={onOutcome} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function AffiliateReviewView({ data, siteOrigin }: { readonly data: AffiliateReviewData; readonly siteOrigin: string }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  if (!data.available) {
    return (
      <div className={card}>
        <h1 className="text-xl font-semibold text-[#0A0A0A]">Affiliate applications</h1>
        <p className="mt-2 text-sm text-stone-700">
          Applications are not set up in the database yet. Run migration 213 in Supabase, then reload this page.
        </p>
      </div>
    );
  }

  const byStatus = (status: AffiliateApplicationStatus) => data.applications.filter((application) => application.status === status);
  const waiting = byStatus("new");
  const placesLeft = Math.max(AFFILIATE_PROGRAM.foundingPlaces - data.approvedCount, 0);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Affiliate applications</h1>
          <p className="mt-1 text-sm text-stone-600">
            {waiting.length === 0
              ? "Nothing is waiting for you."
              : `${waiting.length} ${waiting.length === 1 ? "application is" : "applications are"} ${AFFILIATE_STATUS_LABELS.new.toLowerCase()}.`}{" "}
            {data.approvedCount} of {AFFILIATE_PROGRAM.foundingPlaces} founding places filled, {placesLeft} left.
          </p>
        </div>
        <Link href={AFFILIATES_PATH} target="_blank" className={secondary}>
          Open the public page
        </Link>
      </div>

      {outcome ? (
        <div
          role="status"
          className={[
            "mt-5 rounded-xl border px-4 py-3 text-sm font-semibold",
            outcome.error ? "border-[#e7b8a2] bg-[#fdf3ee] text-[#8a2f0f]" : "border-[#b9d5b3] bg-[#f1f8ef] text-[#2f5d2a]",
          ].join(" ")}
        >
          {outcome.name}: {outcome.error ?? outcome.success}
        </div>
      ) : null}

      <Section title="Waiting for you" empty="No applications waiting." applications={waiting} siteOrigin={siteOrigin} onOutcome={setOutcome} />
      <Section title="Approved partners" empty="No partners yet." applications={byStatus("approved")} siteOrigin={siteOrigin} onOutcome={setOutcome} />
      <Section title="Declined" empty="None." applications={byStatus("declined")} siteOrigin={siteOrigin} onOutcome={setOutcome} />
    </div>
  );
}
