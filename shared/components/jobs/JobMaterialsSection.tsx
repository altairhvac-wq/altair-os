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

type JobMaterialsSectionProps = {
  jobId: string;
  materials: JobMaterial[];
  serviceItems: ServiceItem[];
  canLogMaterials: boolean;
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
}: JobMaterialsSectionProps) {
  return (
    <section
      aria-labelledby={`job-materials-heading-${jobId}`}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-600/10">
            <Package2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2
              id={`job-materials-heading-${jobId}`}
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Materials used
            </h2>
            <p className="mt-1 text-sm text-slate-600">
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
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            No materials logged yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
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
                  <MaterialMetaItem
                    label="Unit cost"
                    value={
                      material.unitCost == null
                        ? "—"
                        : formatJobMaterialCurrency(material.unitCost)
                    }
                  />
                  <MaterialMetaItem
                    label="Unit price"
                    value={formatJobMaterialCurrency(material.unitPrice)}
                  />
                  <MaterialMetaItem
                    label="Total cost"
                    value={
                      totalCost == null
                        ? "—"
                        : formatJobMaterialCurrency(totalCost)
                    }
                  />
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
