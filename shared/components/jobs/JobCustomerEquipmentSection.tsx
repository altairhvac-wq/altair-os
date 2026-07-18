import Link from "next/link";
import { Settings2 } from "lucide-react";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import {
  formatEquipmentDate,
  formatWarrantyStatus,
  getWarrantyStatus,
  getWarrantyStatusStyles,
  type CustomerEquipment,
} from "@/shared/types/customer-equipment";
import { JOB_DETAIL_EQUIPMENT_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";
import {
  jobDetailEmptyHintClass,
  jobDetailEmptyStateClass,
  jobDetailEmptyTitleClass,
  jobDetailLinkClass,
  jobDetailMutedTextClass,
  jobDetailPrimaryTextClass,
  jobDetailSectionIconWrapClass,
  jobDetailSectionSubtitleClass,
  jobDetailSectionTitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";

type JobCustomerEquipmentSectionProps = {
  customerId: string;
  jobId: string;
  equipment: CustomerEquipment[];
  canViewCustomerProfile?: boolean;
  northStar?: boolean;
  compact?: boolean;
};

export function JobCustomerEquipmentSection({
  customerId,
  jobId,
  equipment,
  canViewCustomerProfile = false,
  northStar = false,
  compact = false,
}: JobCustomerEquipmentSectionProps) {
  const visibleEquipment = compact ? equipment.slice(0, 4) : equipment;
  const hiddenCount = compact ? Math.max(0, equipment.length - 4) : 0;

  return (
    <section
      id={northStar ? JOB_DETAIL_EQUIPMENT_ANCHOR : undefined}
      data-job-section={northStar ? JOB_DETAIL_EQUIPMENT_ANCHOR : undefined}
      tabIndex={northStar ? -1 : undefined}
      className={`${resolveJobDetailSectionClass(northStar, compact)} scroll-mt-6`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={jobDetailSectionIconWrapClass(northStar)}>
            <Settings2 className={northStar ? "h-4 w-4" : "h-5 w-5 text-violet-600"} />
          </div>
          <div>
            <h2 className={jobDetailSectionTitleClass(northStar)}>
              Customer equipment
            </h2>
            <p className={jobDetailSectionSubtitleClass(northStar)}>
              Assets on file for this customer&apos;s property
            </p>
          </div>
        </div>

        {canViewCustomerProfile ? (
          <Link href={`/customers/${customerId}`} className={jobDetailLinkClass(northStar)}>
            View customer
          </Link>
        ) : null}
      </div>

      {equipment.length === 0 ? (
        <div className={`mt-4 ${jobDetailEmptyStateClass(northStar)}`}>
          <p className={jobDetailEmptyTitleClass(northStar)}>No equipment on file</p>
          <p className={jobDetailEmptyHintClass(northStar)}>
            Technicians can add equipment when completing a job.
          </p>
        </div>
      ) : (
        <ul className={`mt-4 ${northStar ? "divide-[rgba(138,99,36,0.12)]" : "divide-y divide-slate-100"}`}>
          {visibleEquipment.map((item) => {
            const warrantyStatus = getWarrantyStatus(item.warrantyExpiresAt);
            const addedOnJob = item.jobId === jobId;

            return (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={jobDetailPrimaryTextClass(northStar)}>
                        <DemoDisplayName>{item.name}</DemoDisplayName>
                      </p>
                      {addedOnJob ? (
                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-600/15">
                          Added on this job
                        </span>
                      ) : null}
                    </div>
                    <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 ${jobDetailMutedTextClass(northStar)}`}>
                      {item.equipmentType ? <span>{item.equipmentType}</span> : null}
                      {item.brand ? <span>{item.brand}</span> : null}
                      {item.modelNumber ? <span>{item.modelNumber}</span> : null}
                      {item.serialNumber ? <span>S/N {item.serialNumber}</span> : null}
                      {item.location ? <span>{item.location}</span> : null}
                      {item.installDate ? (
                        <span>Installed {formatEquipmentDate(item.installDate)}</span>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${getWarrantyStatusStyles(warrantyStatus)}`}
                  >
                    {formatWarrantyStatus(warrantyStatus)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {hiddenCount > 0 ? (
        <p className={`mt-2 ${jobDetailMutedTextClass(northStar)}`}>
          +{hiddenCount} more on file
        </p>
      ) : null}
    </section>
  );
}
