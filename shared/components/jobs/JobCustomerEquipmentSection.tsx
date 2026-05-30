import Link from "next/link";
import { Settings2 } from "lucide-react";
import {
  formatEquipmentDate,
  formatWarrantyStatus,
  getWarrantyStatus,
  getWarrantyStatusStyles,
  type CustomerEquipment,
} from "@/shared/types/customer-equipment";

type JobCustomerEquipmentSectionProps = {
  customerId: string;
  jobId: string;
  equipment: CustomerEquipment[];
  canViewCustomerProfile?: boolean;
};

export function JobCustomerEquipmentSection({
  customerId,
  jobId,
  equipment,
  canViewCustomerProfile = false,
}: JobCustomerEquipmentSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-600/10">
            <Settings2 className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer equipment
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Assets on file for this customer&apos;s property
            </p>
          </div>
        </div>

        {canViewCustomerProfile ? (
          <Link
            href={`/customers/${customerId}`}
            className="text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
          >
            View customer
          </Link>
        ) : null}
      </div>

      {equipment.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No equipment on file</p>
          <p className="mt-1 text-xs text-slate-500">
            Technicians can add equipment when completing a job.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {equipment.map((item) => {
            const warrantyStatus = getWarrantyStatus(item.warrantyExpiresAt);
            const addedOnJob = item.jobId === jobId;

            return (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>
                      {addedOnJob ? (
                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-600/15">
                          Added on this job
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
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
    </section>
  );
}
