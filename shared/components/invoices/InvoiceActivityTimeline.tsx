import {
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  History,
  Pencil,
  Receipt,
  Send,
} from "lucide-react";
import type {
  InvoiceActivity,
  InvoiceActivityType,
} from "@/shared/types/invoice-activity";
import {
  formatInvoiceActivityAttribution,
  formatInvoiceActivityDetails,
  formatInvoiceActivityLabel,
  formatInvoiceActivityTimestamp,
} from "@/shared/types/invoice-activity";
import { adminCardSectionClass } from "@/shared/lib/admin-density";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";

type InvoiceActivityTimelineProps = {
  activities: InvoiceActivity[];
  northStar?: boolean;
};

const ACTIVITY_ICONS: Record<InvoiceActivityType, typeof History> = {
  invoice_created: ClipboardList,
  invoice_sent: Send,
  invoice_email_resent: Send,
  status_changed: ArrowRightLeft,
  invoice_converted_from_estimate: Receipt,
  invoice_voided: Ban,
  invoice_cancelled: Ban,
  invoice_updated: Pencil,
  payment_recorded: DollarSign,
  invoice_paid: CheckCircle2,
};

const ACTIVITY_ICON_STYLES: Record<InvoiceActivityType, string> = {
  invoice_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  invoice_sent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  invoice_email_resent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  status_changed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  invoice_converted_from_estimate: "bg-violet-50 text-violet-700 ring-violet-600/15",
  invoice_voided: "bg-slate-100 text-slate-500 ring-slate-400/15",
  invoice_cancelled: "bg-amber-50 text-amber-700 ring-amber-600/15",
  invoice_updated: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  payment_recorded: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  invoice_paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
};

const MC_ACTIVITY_ICON_STYLES: Record<InvoiceActivityType, string> = {
  invoice_created: "bg-altair-stone text-altair-ink-on-paper ring-altair-border",
  invoice_sent: "bg-altair-stone text-altair-brass ring-altair-border",
  invoice_email_resent: "bg-altair-stone text-altair-brass ring-altair-border",
  status_changed: "bg-altair-stone text-altair-ink-on-paper-secondary ring-altair-border",
  invoice_converted_from_estimate: "bg-altair-stone text-altair-brass ring-altair-border",
  invoice_voided: "bg-altair-stone text-altair-ink-on-paper-secondary ring-altair-border",
  invoice_cancelled: "bg-altair-stone text-altair-ink-on-paper-secondary ring-altair-border",
  invoice_updated: "bg-altair-stone text-altair-ink-on-paper ring-altair-border",
  payment_recorded: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  invoice_paid: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
};

export function InvoiceActivityTimeline({
  activities,
  northStar = false,
}: InvoiceActivityTimelineProps) {
  const list = (
    <>
      {activities.length === 0 ? (
        <div
          className={
            northStar
              ? "rounded-lg border border-dashed border-altair-border bg-[var(--surface-tile)] px-4 py-8 text-center"
              : "mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center"
          }
        >
          <p
            className={
              northStar
                ? "text-sm font-medium text-altair-ink-on-paper"
                : "text-sm font-medium text-slate-700"
            }
          >
            No activity yet
          </p>
          <p
            className={
              northStar
                ? "mt-1 text-xs text-altair-ink-on-paper-muted"
                : "mt-1 text-xs text-slate-500"
            }
          >
            Sends, payments, and status changes will appear here.
          </p>
        </div>
      ) : (
        <ol className={northStar ? "space-y-0" : "mt-5 space-y-0"}>
          {activities.map((activity, index) => {
            const Icon = ACTIVITY_ICONS[activity.eventType] ?? History;
            const iconStyle = northStar
              ? (MC_ACTIVITY_ICON_STYLES[activity.eventType] ??
                "bg-altair-stone text-altair-ink-on-paper-secondary ring-altair-border")
              : (ACTIVITY_ICON_STYLES[activity.eventType] ??
                "bg-slate-100 text-slate-600 ring-slate-500/15");
            const details = formatInvoiceActivityDetails(activity);
            const isLast = index === activities.length - 1;

            return (
              <li key={activity.id} className="relative flex gap-4 pb-5">
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={
                      northStar
                        ? "absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-altair-border"
                        : "absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-slate-200"
                    }
                  />
                ) : null}

                <div
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${iconStyle}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p
                      className={
                        northStar
                          ? "text-sm font-semibold text-altair-ink-on-paper"
                          : "text-sm font-semibold text-slate-900"
                      }
                    >
                      {formatInvoiceActivityLabel(activity)}
                    </p>
                    <time
                      dateTime={activity.createdAt}
                      className={
                        northStar
                          ? "shrink-0 text-xs text-altair-ink-on-paper-muted"
                          : "shrink-0 text-xs text-slate-400"
                      }
                    >
                      {formatInvoiceActivityTimestamp(activity.createdAt)}
                    </time>
                  </div>

                  {details ? (
                    <p
                      className={
                        northStar
                          ? "mt-1 text-sm text-altair-ink-on-paper-secondary"
                          : "mt-1 text-sm text-slate-600"
                      }
                    >
                      {details}
                    </p>
                  ) : null}

                  {(() => {
                    const attribution = formatInvoiceActivityAttribution(activity);
                    return attribution ? (
                      <p
                        className={
                          northStar
                            ? "mt-1.5 text-xs text-altair-ink-on-paper-muted"
                            : "mt-1.5 text-xs text-slate-500"
                        }
                      >
                        {attribution}
                      </p>
                    ) : null;
                  })()}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );

  if (northStar) {
    return (
      <section className="scroll-mt-6 space-y-2">
        <SectionHeader title="Activity" />
        <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
          <p className="mb-3 text-xs text-altair-ink-on-paper-muted">
            Sends, payments, and status changes for this invoice
          </p>
          {list}
        </div>
      </section>
    );
  }

  return (
    <section className={adminCardSectionClass}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <History className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Activity
          </h2>
          <p className="text-sm text-slate-600">
            Sends, payments, and status changes for this invoice
          </p>
        </div>
      </div>
      {list}
    </section>
  );
}
