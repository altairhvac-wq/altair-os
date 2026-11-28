"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookOpen } from "lucide-react";
import {
  disconnectQuickBooksAction,
  markQuickBooksRecordHandledAction,
  retryQuickBooksRecordAction,
  sendQuickBooksNowAction,
  startQuickBooksConnectAction,
  type QuickBooksActionResult,
} from "@/app/actions/quickbooks";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { StatusPill } from "@/shared/design-system/components/StatusPill";

/**
 * The QuickBooks Online row of Settings > Integrations (design screens 1 and 3).
 *
 * The page decides the state and formats every date in the company's time
 * zone; this component lays it out and calls the actions. The actions check
 * permission themselves, so this is presentation, not authorisation.
 */

export type QuickBooksAttentionView = {
  readonly id: string;
  readonly title: string;
  readonly sentence: string;
  readonly href: string | null;
  readonly canRetry: boolean;
  readonly canMarkHandled: boolean;
};

export type QuickBooksPanelView =
  | { readonly kind: "not_connected" }
  | { readonly kind: "setup"; readonly companyName: string | null }
  | { readonly kind: "reauth_required"; readonly companyName: string | null }
  | {
      readonly kind: "active";
      readonly companyName: string | null;
      /** "Last sent 9:14 AM today. Connected by Dana Whitfield on Nov 28." */
      readonly summary: string;
      readonly sent: { readonly customer: number; readonly item: number; readonly invoice: number; readonly payment: number };
      readonly waiting: number;
      readonly attention: readonly QuickBooksAttentionView[];
      readonly attentionTotal: number;
      readonly accountsLine: string | null;
    };

const linkClass =
  "text-xs font-semibold text-altair-ink underline decoration-altair-border-strong underline-offset-2 hover:decoration-altair-ink disabled:opacity-60";

type Flash = { tone: "success" | "error" | "info"; message: string } | null;

export function QuickBooksPanel({ view, flash: initialFlash }: { view: QuickBooksPanelView; flash?: Flash }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<Flash>(initialFlash ?? null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  function run(action: () => Promise<QuickBooksActionResult>) {
    startTransition(async () => {
      const result = await action();
      setFlash(result.error ? { tone: "error", message: result.error } : result.notice ? { tone: "success", message: result.notice } : null);
      router.refresh();
    });
  }

  function connect() {
    startTransition(async () => {
      const result = await startQuickBooksConnectAction();
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setFlash({ tone: "error", message: result.error ?? "QuickBooks could not be reached. Try again." });
    });
  }

  const status =
    view.kind === "active"
      ? { label: "Connected", tone: "success" as const }
      : view.kind === "setup"
        ? { label: "Finish setting up", tone: "warning" as const }
        : view.kind === "reauth_required"
          ? { label: "Connect again", tone: "danger" as const }
          : { label: "Not connected", tone: "neutral" as const };

  return (
    <div data-testid="integration-quickbooks" className="rounded-2xl border border-altair-border bg-altair-paper-elevated px-4 py-3.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-altair-brass" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-altair-ink">QuickBooks Online</span>
            <StatusPill tone={status.tone} size="sm">
              {status.label}
            </StatusPill>
            {view.kind === "active" && view.attentionTotal > 0 ? (
              <StatusPill tone="warning" size="sm">
                {view.attentionTotal} need{view.attentionTotal === 1 ? "s" : ""} attention
              </StatusPill>
            ) : null}
          </div>

          {flash ? (
            <SettingsAlertBanner tone={flash.tone} className="mt-2">
              {flash.message}
            </SettingsAlertBanner>
          ) : null}

          {view.kind === "not_connected" ? (
            <>
              <p className="mt-0.5 text-xs leading-5 text-altair-ink-secondary">
                Customers, invoices and payments go from Altair into your QuickBooks on their own, so nobody types them twice. Altair only sends. It never changes anything you made in QuickBooks.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <button type="button" onClick={connect} disabled={pending} className={buttonClassName("primary", "sm")}>
                  {pending ? "Opening QuickBooks…" : "Connect QuickBooks"}
                </button>
                <span className="text-xs text-altair-ink-muted">You sign in on Intuit&apos;s own page.</span>
              </div>
            </>
          ) : null}

          {view.kind === "setup" ? (
            <>
              <p className="mt-0.5 text-xs leading-5 text-altair-ink-secondary">
                Signed in to {view.companyName ? <b>{view.companyName}</b> : "QuickBooks"}. Nothing is sent until you answer three questions.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href="/settings/integrations/quickbooks" className={buttonClassName("primary", "sm")}>
                  Finish setting up
                </Link>
                <button type="button" onClick={() => run(disconnectQuickBooksAction)} disabled={pending} className={linkClass}>
                  Cancel and disconnect
                </button>
              </div>
            </>
          ) : null}

          {view.kind === "reauth_required" ? (
            <>
              <p className="mt-0.5 text-xs leading-5 text-altair-ink-secondary">
                QuickBooks stopped accepting Altair&apos;s access{view.companyName ? ` to ${view.companyName}` : ""}. This happens after 100 days without use, or when someone disconnects Altair inside QuickBooks. Nothing is lost: changes are waiting and go as soon as you connect again.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" onClick={connect} disabled={pending} className={buttonClassName("primary", "sm")}>
                  {pending ? "Opening QuickBooks…" : "Connect again"}
                </button>
                <button type="button" onClick={() => run(disconnectQuickBooksAction)} disabled={pending} className={linkClass}>
                  Disconnect instead
                </button>
              </div>
            </>
          ) : null}

          {view.kind === "active" ? (
            <>
              <p className="mt-0.5 text-xs leading-5 text-altair-ink-secondary">
                Sending to {view.companyName ? <b>{view.companyName}</b> : "your QuickBooks"}. {view.summary}
              </p>
              {view.accountsLine ? <p className="mt-0.5 text-xs leading-5 text-altair-ink-muted">{view.accountsLine}</p> : null}

              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["customers sent", view.sent.customer],
                    ["price book items", view.sent.item],
                    ["invoices sent", view.sent.invoice],
                    ["payments sent", view.sent.payment],
                  ] as const
                ).map(([label, count]) => (
                  <div key={label} className="rounded-xl border border-altair-border bg-altair-paper px-3 py-2">
                    <dd className="text-lg font-bold tabular-nums text-altair-ink">{count.toLocaleString("en-US")}</dd>
                    <dt className="text-[11px] text-altair-ink-muted">{label}</dt>
                  </div>
                ))}
              </dl>
              {view.waiting > 0 ? (
                <p className="mt-2 text-xs text-altair-ink-secondary">
                  {view.waiting} waiting to go. They usually reach QuickBooks within a minute.
                </p>
              ) : null}

              {view.attention.length > 0 ? (
                <section className="mt-3" aria-labelledby="quickbooks-attention-heading">
                  <h4 id="quickbooks-attention-heading" className="text-sm font-semibold text-altair-ink">
                    Needs attention
                  </h4>
                  <p className="text-xs text-altair-ink-muted">Each one says what happened and what to do. Nothing else is held up by them.</p>
                  <ul className="mt-1">
                    {view.attention.map((item) => (
                      <li key={item.id} className="border-t border-altair-border py-2.5 first:border-t-0">
                        <p className="text-[13px] font-semibold text-altair-ink">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-altair-ink-secondary">{item.sentence}</p>
                        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          {item.href ? (
                            <Link href={item.href} className={linkClass}>
                              Open
                            </Link>
                          ) : null}
                          {item.canRetry ? (
                            <button type="button" disabled={pending} onClick={() => run(() => retryQuickBooksRecordAction(item.id))} className={linkClass}>
                              Try again
                            </button>
                          ) : null}
                          {item.canMarkHandled ? (
                            <button type="button" disabled={pending} onClick={() => run(() => markQuickBooksRecordHandledAction(item.id))} className={linkClass}>
                              Mark as handled
                            </button>
                          ) : null}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {view.attentionTotal > view.attention.length ? (
                    <p className="text-xs text-altair-ink-muted">
                      Showing the newest {view.attention.length} of {view.attentionTotal}.
                    </p>
                  ) : null}
                </section>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" disabled={pending} onClick={() => run(sendQuickBooksNowAction)} className={buttonClassName("secondary", "sm")}>
                  {pending ? "Working…" : "Send waiting records now"}
                </button>
                {confirmDisconnect ? (
                  <>
                    <button type="button" disabled={pending} onClick={() => run(disconnectQuickBooksAction)} className={buttonClassName("destructive", "sm")}>
                      Yes, disconnect
                    </button>
                    <button type="button" disabled={pending} onClick={() => setConfirmDisconnect(false)} className={buttonClassName("quiet", "sm")}>
                      Keep connected
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={pending} onClick={() => setConfirmDisconnect(true)} className={buttonClassName("quiet", "sm")}>
                    Disconnect
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-altair-ink-muted">
                Disconnect stops sending and removes Altair&apos;s access key at once. What is already in QuickBooks stays there.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
