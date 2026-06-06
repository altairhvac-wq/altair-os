import type { OperationalActivity } from "@/shared/types/operational-activity";
import {
  formatOperationalActivityAttribution,
  formatOperationalActivityDetailsForAccess,
  formatOperationalActivityLabelForAccess,
  formatOperationalActivityTimestamp,
} from "@/shared/types/operational-activity";

type OperationalActivityEntryContentProps = {
  activity: OperationalActivity;
  canViewBilling: boolean;
  labelClassName?: string;
  timestampClassName?: string;
  detailsClassName?: string;
  attributionClassName?: string;
};

export function OperationalActivityEntryContent({
  activity,
  canViewBilling,
  labelClassName = "text-sm font-semibold text-slate-900",
  timestampClassName = "shrink-0 text-xs text-slate-400",
  detailsClassName = "mt-1 text-sm text-slate-600",
  attributionClassName = "mt-1.5 text-xs text-slate-500",
}: OperationalActivityEntryContentProps) {
  const label = formatOperationalActivityLabelForAccess(
    activity,
    canViewBilling,
  );
  const details = formatOperationalActivityDetailsForAccess(
    activity,
    canViewBilling,
  );
  const attribution = formatOperationalActivityAttribution(activity);
  const timestamp = formatOperationalActivityTimestamp(activity.createdAt);

  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <p className={labelClassName}>{label}</p>
        <time dateTime={activity.createdAt} className={timestampClassName}>
          {timestamp}
        </time>
      </div>

      {details ? <p className={detailsClassName}>{details}</p> : null}

      {attribution ? (
        <p className={attributionClassName}>{attribution}</p>
      ) : null}
    </>
  );
}
