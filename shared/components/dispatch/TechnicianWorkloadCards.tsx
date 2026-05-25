import type { DispatchJob, Technician } from "@/shared/types/dispatch";

type TechnicianWorkloadCardsProps = {
  technicians: Technician[];
  jobs: DispatchJob[];
};

export function TechnicianWorkloadCards({
  technicians,
  jobs,
}: TechnicianWorkloadCardsProps) {
  if (technicians.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4">
        <p className="text-sm font-semibold text-slate-700">
          No technicians on roster
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Invite team members with the technician role to enable assignments.
          Technician availability and specialties are not modeled in the database
          yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {technicians.map((technician) => {
        const assignedCount = jobs.filter(
          (job) => job.technicianId === technician.id,
        ).length;

        return (
          <div
            key={technician.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-sm font-bold text-white">
                {technician.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {technician.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {technician.role}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black tabular-nums text-slate-900">
                  {assignedCount}
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  {assignedCount === 1 ? "job today" : "jobs today"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
