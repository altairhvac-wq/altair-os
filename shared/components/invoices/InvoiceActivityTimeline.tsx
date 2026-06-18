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
  northStarDetailTokens as dt,
  northStarInvoiceDocumentTokens as idt,
} from "@/shared/design-system/north-star/tokens";

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

const NORTH_STAR_ACTIVITY_ICON_STYLES: Record<InvoiceActivityType, string> = {
  invoice_created: "bg-[#EFE4CB] text-[#8A6324] ring-[rgba(138,99,36,0.18)]",
  invoice_sent: "bg-[#F5E6C8] text-[#8A6324] ring-[rgba(138,99,36,0.18)]",
  invoice_email_resent: "bg-[#F5E6C8] text-[#8A6324] ring-[rgba(138,99,36,0.18)]",
  status_changed: "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.12)]",
  invoice_converted_from_estimate: "bg-[#EFE4CB] text-[#8A6324] ring-[rgba(138,99,36,0.18)]",
  invoice_voided: "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.12)]",
  invoice_cancelled: "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.12)]",
  invoice_updated: "bg-[#EFE4CB] text-[#8A6324] ring-[rgba(138,99,36,0.18)]",
  payment_recorded: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  invoice_paid: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
};

export function InvoiceActivityTimeline({
  activities,
  northStar = false,
}: InvoiceActivityTimelineProps) {
  const sectionClass = northStar ? dt.compactSectionSurface : adminCardSectionClass;

  return (
    <section className={sectionClass}>
      <div className="flex items-center gap-2.5">
        <div
          className={
            northStar
              ? dt.sectionIconWrap
              : "flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200"
          }
        >
          <History className={northStar ? "h-4 w-4" : "h-4 w-4 text-slate-500"} />
        </div>
        <div>
          <h2
            className={
              northStar
                ? `${dt.sectionTitle} ${idt.ivoryPrimary}`
                : "text-xs font-semibold uppercase tracking-wide text-slate-500"
            }
          >
            Activity
          </h2>
          <p className={northStar ? `text-sm ${idt.ivorySecondary}` : "text-sm text-slate-600"}>
            Sends, payments, and status changes for this invoice
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div
          className={
            northStar
              ? `mt-4 ${dt.emptyState}`
              : "mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center"
          }
        >
          <p className={northStar ? `text-sm font-medium ${idt.ivoryPrimary}` : "text-sm font-medium text-slate-700"}>
            No activity yet
          </p>
          <p className={northStar ? `mt-1 text-xs ${idt.ivoryMuted}` : "mt-1 text-xs text-slate-500"}>
            Sends, payments, and status changes will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-0">
          {activities.map((activity, index) => {
            const Icon = ACTIVITY_ICONS[activity.eventType] ?? History;
            const iconStyle = northStar
              ? NORTH_STAR_ACTIVITY_ICON_STYLES[activity.eventType] ??
                "bg-[#F1E7D2] text-[#6B6255] ring-[rgba(138,99,36,0.12)]"
              : ACTIVITY_ICON_STYLES[activity.eventType] ??
                "bg-slate-100 text-slate-600 ring-slate-500/15";
            const details = formatInvoiceActivityDetails(activity);
            const isLast = index === activities.length - 1;

            return (
              <li key={activity.id} className="relative flex gap-4 pb-5">
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[17px] top-9 h-[calc(100%-12px)] w-px ${northStar ? "bg-[rgba(138,99,36,0.12)]" : "bg-slate-200"}`}
                  />
                ) : null}

                <div
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${iconStyle}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className={northStar ? `text-sm font-semibold ${idt.ivoryPrimary}` : "text-sm font-semibold text-slate-900"}>
                      {formatInvoiceActivityLabel(activity)}
                    </p>
                    <time
                      dateTime={activity.createdAt}
                      className={northStar ? `shrink-0 text-xs ${idt.ivoryMuted}` : "shrink-0 text-xs text-slate-400"}
                    >
                      {formatInvoiceActivityTimestamp(activity.createdAt)}
                    </time>
                  </div>

                  {details ? (
                    <p className={northStar ? `mt-1 text-sm ${idt.ivorySecondary}` : "mt-1 text-sm text-slate-600"}>{details}</p>
                  ) : null}

                  {(() => {
                    const attribution = formatInvoiceActivityAttribution(activity);
                    return attribution ? (
                      <p className={northStar ? `mt-1.5 text-xs ${idt.ivoryMuted}` : "mt-1.5 text-xs text-slate-500"}>{attribution}</p>
                    ) : null;
                  })()}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
