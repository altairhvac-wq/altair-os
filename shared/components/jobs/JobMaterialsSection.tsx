import { Package2 } from "lucide-react";
import { resolveAttributionDisplayLabel } from "@/shared/lib/profile-attribution";
import {
  calculateJobMaterialTotalBillable,
  calculateJobMaterialTotalCost,
  formatJobMaterialCreatedAt,
  formatJobMaterialCurrency,
  formatJobMaterialQuantity,
  type JobMaterial,
} from "@/shared/types/job-material";
import type { ServiceItem } from "@/shared/types/service-item";
import { JobMaterialForm } from "./JobMaterialForm";
import { JOB_DETAIL_MATERIALS_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";
import {
  jobDetailEmptyHintClass,
  jobDetailEmptyStateClass,
  jobDetailEmptyTitleClass,
  jobDetailPrimaryTextClass,
  jobDetailSectionIconWrapClass,
  jobDetailSectionSubtitleClass,
  jobDetailSectionTitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";

type JobMaterialsSectionProps = {
  jobId: string;
  materials: JobMaterial[];
  serviceItems: ServiceItem[];
  canLogMaterials: boolean;
  canViewMaterialCosts?: boolean;
  northStar?: boolean;
};

function MaterialMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export function JobMaterialsSection({
  jobId,
  materials,
  serviceItems,
  canLogMaterials,
  canViewMaterialCosts = true,
  northStar = false,
}: JobMaterialsSectionProps) {
  return (
    <section
      aria-labelledby={`job-materials-heading-${jobId}`}
      id={northStar ? JOB_DETAIL_MATERIALS_ANCHOR : undefined}
      className={`${resolveJobDetailSectionClass(northStar)} scroll-mt-6`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={jobDetailSectionIconWrapClass(northStar)}>
            <Package2 className={northStar ? "h-4 w-4" : "h-5 w-5 text-emerald-600"} />
          </div>
          <div>
            <h2
              id={`job-materials-heading-${jobId}`}
              className={jobDetailSectionTitleClass(northStar)}
            >
              Materials used
            </h2>
            <p className={jobDetailSectionSubtitleClass(northStar)}>
              Parts and supplies consumed on this job
            </p>
          </div>
        </div>
      </div>

      {canLogMaterials ? (
        <div className="mt-4">
          <JobMaterialForm jobId={jobId} serviceItems={serviceItems} />
        </div>
      ) : null}

      {materials.length === 0 ? (
        <div className={`mt-4 ${jobDetailEmptyStateClass(northStar)}`}>
          <p className={jobDetailEmptyTitleClass(northStar)}>
            No materials logged yet
          </p>
          <p className={jobDetailEmptyHintClass(northStar)}>
            {canLogMaterials
              ? "Log parts and supplies used on this job above."
              : "Materials logged for this job will appear here."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {materials.map((material) => {
            const totalCost = calculateJobMaterialTotalCost(material);
            const totalBillable = calculateJobMaterialTotalBillable(material);

            return (
              <li
                key={material.id}
                className={
                  northStar
                    ? "rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-4 py-3"
                    : "rounded-xl border border-slate-200 bg-white px-4 py-3"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={jobDetailPrimaryTextClass(northStar)}>
                      {material.name}
                    </p>
                    {material.description?.trim() ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {material.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Total billable
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatJobMaterialCurrency(totalBillable)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  <MaterialMetaItem
                    label="Quantity"
                    value={formatJobMaterialQuantity(material.quantity)}
                  />
                  {canViewMaterialCosts ? (
                    <MaterialMetaItem
                      label="Unit cost"
                      value={
                        material.unitCost == null
                          ? "—"
                          : formatJobMaterialCurrency(material.unitCost)
                      }
                    />
                  ) : null}
                  <MaterialMetaItem
                    label="Unit price"
                    value={formatJobMaterialCurrency(material.unitPrice)}
                  />
                  {canViewMaterialCosts ? (
                    <MaterialMetaItem
                      label="Total cost"
                      value={
                        totalCost == null
                          ? "—"
                          : formatJobMaterialCurrency(totalCost)
                      }
                    />
                  ) : null}
                  <MaterialMetaItem
                    label="Total billable"
                    value={formatJobMaterialCurrency(totalBillable)}
                  />
                  <MaterialMetaItem
                    label="Added by"
                    value={resolveAttributionDisplayLabel({
                      name: material.addedByName,
                      subjectUserId: material.addedBy,
                      emptyLabel: "—",
                    })}
                  />
                  <MaterialMetaItem
                    label="Created"
                    value={formatJobMaterialCreatedAt(material.createdAt)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
