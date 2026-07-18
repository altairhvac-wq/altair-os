import {
  Archive,
  ArrowRightLeft,
  Ban,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  History,
  Navigation,
  Package,
  Play,
  Receipt,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  User,
  UserMinus,
  UserPlus,
} from "lucide-react";
import type {
  OperationalActivity,
  OperationalActivityEventType,
} from "@/shared/types/operational-activity";
import { filterOperationalActivitiesForBillingAccess } from "@/shared/lib/billing-activity-visibility";
import { OperationalActivityEntryContent } from "@/shared/components/operational/OperationalActivityEntryContent";
import { adminCardSectionClass } from "@/shared/lib/admin-density";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type OperationalActivityTimelineProps = {
  activities: OperationalActivity[];
  canViewBilling?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  sectionId?: string;
  sectionClassName?: string;
  northStar?: boolean;
  compact?: boolean;
};

const COMPACT_ACTIVITY_LIMIT = 8;

const ACTIVITY_ICONS: Record<
  OperationalActivityEventType,
  typeof History
> = {
  customer_created: UserPlus,
  customer_archived: Archive,
  customer_restored: History,
  customer_deleted: Ban,
  customer_moved_to_trash: Trash2,
  customer_restored_from_trash: History,
  customer_permanently_deleted: Ban,
  equipment_added: Settings2,
  equipment_updated: Settings2,
  warranty_expiration_recorded: ShieldCheck,
  job_created: ClipboardList,
  job_status_changed: ArrowRightLeft,
  job_status_corrected: ArrowRightLeft,
  job_reopened: History,
  technician_assigned: User,
  technician_unassigned: UserMinus,
  job_labor_auto_closed: Clock,
  work_completed: CheckCircle2,
  estimate_created: ClipboardList,
  estimate_sent: Send,
  estimate_email_resent: Send,
  estimate_approved: CheckCircle2,
  estimate_declined: Ban,
  estimate_cancelled: Ban,
  estimate_converted_to_invoice: Receipt,
  invoice_created: Receipt,
  invoice_sent: Send,
  invoice_email_resent: Send,
  invoice_voided: Ban,
  invoice_updated: ArrowRightLeft,
  invoice_cancelled: Ban,
  payment_recorded: DollarSign,
  invoice_paid: CheckCircle2,
  job_attachment_uploaded: Camera,
  job_material_added: Package,
  expense_receipt_uploaded: Receipt,
  expense_created: Receipt,
  expense_submitted: Send,
  expense_approved: CheckCircle2,
  expense_rejected: Ban,
  expense_reimbursed: DollarSign,
  status_changed: ArrowRightLeft,
  invoice_created_for_completed_job: CheckCircle2,
  invoice_auto_created_from_completion: CheckCircle2,
  labor_entries_closed: CheckCircle2,
  pending_expenses_resolved: CheckCircle2,
  material_costs_completed: CheckCircle2,
};

const ACTIVITY_ICON_STYLES: Record<OperationalActivityEventType, string> = {
  customer_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  customer_archived: "bg-slate-100 text-slate-600 ring-slate-500/15",
  customer_restored: "bg-blue-50 text-blue-700 ring-blue-600/15",
  customer_deleted: "bg-rose-50 text-rose-700 ring-rose-600/15",
  customer_moved_to_trash: "bg-orange-50 text-orange-700 ring-orange-600/15",
  customer_restored_from_trash: "bg-blue-50 text-blue-700 ring-blue-600/15",
  customer_permanently_deleted: "bg-rose-50 text-rose-700 ring-rose-600/15",
  equipment_added: "bg-violet-50 text-violet-700 ring-violet-600/15",
  equipment_updated: "bg-violet-50 text-violet-700 ring-violet-600/15",
  warranty_expiration_recorded: "bg-amber-50 text-amber-700 ring-amber-600/15",
  job_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  job_status_changed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  job_status_corrected: "bg-amber-50 text-amber-800 ring-amber-600/15",
  job_reopened: "bg-blue-50 text-blue-700 ring-blue-600/15",
  technician_assigned: "bg-violet-50 text-violet-700 ring-violet-600/15",
  technician_unassigned: "bg-orange-50 text-orange-700 ring-orange-600/15",
  job_labor_auto_closed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  work_completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  estimate_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  estimate_sent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  estimate_email_resent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  estimate_approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  estimate_declined: "bg-rose-50 text-rose-700 ring-rose-600/15",
  estimate_cancelled: "bg-rose-50 text-rose-700 ring-rose-600/15",
  estimate_converted_to_invoice: "bg-violet-50 text-violet-700 ring-violet-600/15",
  invoice_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  invoice_sent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  invoice_email_resent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  invoice_voided: "bg-rose-50 text-rose-700 ring-rose-600/15",
  invoice_updated: "bg-slate-100 text-slate-600 ring-slate-500/15",
  invoice_cancelled: "bg-rose-50 text-rose-700 ring-rose-600/15",
  payment_recorded: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  invoice_paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  job_attachment_uploaded: "bg-blue-50 text-blue-700 ring-blue-600/15",
  job_material_added: "bg-amber-50 text-amber-700 ring-amber-600/15",
  expense_receipt_uploaded: "bg-amber-50 text-amber-700 ring-amber-600/15",
  expense_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  expense_submitted: "bg-blue-50 text-blue-700 ring-blue-600/15",
  expense_approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  expense_rejected: "bg-rose-50 text-rose-700 ring-rose-600/15",
  expense_reimbursed: "bg-violet-50 text-violet-700 ring-violet-600/15",
  status_changed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  invoice_created_for_completed_job:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  invoice_auto_created_from_completion:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  labor_entries_closed: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  pending_expenses_resolved:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  material_costs_completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
};

const NS_ICON_BRASS =
  "bg-[rgba(201,164,77,0.18)] text-[#8A6324] ring-[rgba(201,164,77,0.24)]";
const NS_ICON_NEUTRAL =
  "bg-[#EFE4CB] text-[#6B6255] ring-[rgba(138,99,36,0.14)]";
const NS_ICON_COMM =
  "bg-[#F5F0E4] text-[#4F4638] ring-[rgba(138,99,36,0.16)]";
const NS_ICON_SUCCESS =
  "bg-[rgba(16,120,85,0.10)] text-emerald-800 ring-emerald-700/15";
const NS_ICON_WARNING =
  "bg-[rgba(180,120,30,0.12)] text-[#9A7028] ring-[rgba(138,99,36,0.20)]";
const NS_ICON_DANGER =
  "bg-[rgba(190,50,50,0.10)] text-rose-800 ring-rose-700/15";

const NORTH_STAR_ACTIVITY_ICON_STYLES: Record<
  OperationalActivityEventType,
  string
> = {
  customer_created: NS_ICON_BRASS,
  customer_archived: NS_ICON_NEUTRAL,
  customer_restored: NS_ICON_COMM,
  customer_deleted: NS_ICON_DANGER,
  customer_moved_to_trash: NS_ICON_WARNING,
  customer_restored_from_trash: NS_ICON_COMM,
  customer_permanently_deleted: NS_ICON_DANGER,
  equipment_added: NS_ICON_BRASS,
  equipment_updated: NS_ICON_NEUTRAL,
  warranty_expiration_recorded: NS_ICON_WARNING,
  job_created: NS_ICON_BRASS,
  job_status_changed: NS_ICON_NEUTRAL,
  job_status_corrected: NS_ICON_WARNING,
  job_reopened: NS_ICON_COMM,
  technician_assigned: NS_ICON_BRASS,
  technician_unassigned: NS_ICON_WARNING,
  job_labor_auto_closed: NS_ICON_NEUTRAL,
  work_completed: NS_ICON_SUCCESS,
  estimate_created: NS_ICON_BRASS,
  estimate_sent: NS_ICON_COMM,
  estimate_email_resent: NS_ICON_COMM,
  estimate_approved: NS_ICON_SUCCESS,
  estimate_declined: NS_ICON_DANGER,
  estimate_cancelled: NS_ICON_DANGER,
  estimate_converted_to_invoice: NS_ICON_BRASS,
  invoice_created: NS_ICON_BRASS,
  invoice_sent: NS_ICON_COMM,
  invoice_email_resent: NS_ICON_COMM,
  invoice_voided: NS_ICON_DANGER,
  invoice_updated: NS_ICON_NEUTRAL,
  invoice_cancelled: NS_ICON_DANGER,
  payment_recorded: NS_ICON_SUCCESS,
  invoice_paid: NS_ICON_SUCCESS,
  job_attachment_uploaded: NS_ICON_COMM,
  job_material_added: NS_ICON_WARNING,
  expense_receipt_uploaded: NS_ICON_WARNING,
  expense_created: NS_ICON_BRASS,
  expense_submitted: NS_ICON_COMM,
  expense_approved: NS_ICON_SUCCESS,
  expense_rejected: NS_ICON_DANGER,
  expense_reimbursed: NS_ICON_BRASS,
  status_changed: NS_ICON_NEUTRAL,
  invoice_created_for_completed_job: NS_ICON_SUCCESS,
  invoice_auto_created_from_completion: NS_ICON_SUCCESS,
  labor_entries_closed: NS_ICON_SUCCESS,
  pending_expenses_resolved: NS_ICON_SUCCESS,
  material_costs_completed: NS_ICON_SUCCESS,
};

const WORKFLOW_ICON_OVERRIDES: Record<string, typeof History> = {
  start_route: Navigation,
  start_work: Play,
  complete_job: CheckCircle2,
  job_cancelled: Ban,
};

export function OperationalActivityTimeline({
  activities,
  canViewBilling = true,
  title = "Activity",
  description = "Operational timeline",
  emptyTitle = "No activity yet",
  emptyDescription = "Workflow events will appear here as work progresses.",
  sectionId,
  sectionClassName,
  northStar = false,
  compact = false,
}: OperationalActivityTimelineProps) {
  const visibleActivities = filterOperationalActivitiesForBillingAccess(
    activities,
    canViewBilling,
  );
  const sectionClass = northStar
    ? compact
      ? dt.compactSectionSurface
      : dt.sectionSurface
    : adminCardSectionClass;
  const displayedActivities = compact
    ? visibleActivities.slice(0, COMPACT_ACTIVITY_LIMIT)
    : visibleActivities;
  const hiddenActivityCount = compact
    ? Math.max(0, visibleActivities.length - COMPACT_ACTIVITY_LIMIT)
    : 0;
  const entryLabelClass = northStar
    ? "text-sm font-medium text-[#17130E]"
    : "text-sm font-medium text-slate-900";
  const entryTimestampClass = northStar
    ? "shrink-0 text-[11px] text-[#6B6255]"
    : "shrink-0 text-[11px] text-slate-400";
  const entryDetailsClass = northStar
    ? "mt-0.5 text-xs text-[#4F4638]"
    : "mt-0.5 text-xs text-slate-600";
  const entryAttributionClass = northStar
    ? "mt-0.5 text-[11px] text-[#6B6255]"
    : "mt-0.5 text-[11px] text-slate-400";

  return (
    <section
      id={sectionId}
      data-job-section={sectionId}
      tabIndex={sectionId ? -1 : undefined}
      className={`${sectionClass} ${sectionClassName ?? ""}`}
    >
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
                ? dt.sectionTitle
                : "text-xs font-semibold uppercase tracking-wide text-slate-500"
            }
          >
            {title}
          </h2>
          <p className={northStar ? "text-sm text-[#4F4638]" : "text-sm text-slate-600"}>
            {description}
          </p>
        </div>
      </div>

      {visibleActivities.length === 0 ? (
        <div
          className={
            northStar
              ? `mt-5 ${dt.emptyState}`
              : "mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center"
          }
        >
          <p
            className={
              northStar
                ? "text-sm font-medium text-[#4F4638]"
                : "text-sm font-medium text-slate-700"
            }
          >
            {emptyTitle}
          </p>
          <p
            className={
              northStar
                ? "mt-1 text-xs text-[#6B6255]"
                : "mt-1 text-xs text-slate-500"
            }
          >
            {emptyDescription}
          </p>
        </div>
      ) : (
        <ol className={`${compact ? "mt-3" : "mt-5"} space-y-0`}>
          {displayedActivities.map((activity, index) => {
            const Icon =
              WORKFLOW_ICON_OVERRIDES[activity.rawEventType] ??
              ACTIVITY_ICONS[activity.eventType];
            const isLast = index === displayedActivities.length - 1;

            const iconStyle = northStar
              ? NORTH_STAR_ACTIVITY_ICON_STYLES[activity.eventType]
              : ACTIVITY_ICON_STYLES[activity.eventType];

            return (
              <li key={activity.id} className={`relative flex gap-3 ${compact ? "pb-3" : "pb-5"}`}>
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={
                      northStar
                        ? "absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-[rgba(138,99,36,0.18)]"
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
                  <OperationalActivityEntryContent
                    activity={activity}
                    canViewBilling={canViewBilling}
                    labelClassName={entryLabelClass}
                    timestampClassName={entryTimestampClass}
                    detailsClassName={entryDetailsClass}
                    attributionClassName={entryAttributionClass}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {hiddenActivityCount > 0 ? (
        <p className={northStar ? dt.truncatedHint : "mt-2 text-xs text-slate-500"}>
          Showing {displayedActivities.length} of {visibleActivities.length} events
        </p>
      ) : null}
    </section>
  );
}
