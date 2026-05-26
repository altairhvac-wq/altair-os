import { Briefcase, Building2, Clock, User } from "lucide-react";
import {
  formatMockDateTime,
  formatMockHours,
  getMockElapsedHours,
  type MockActiveTechnicianSession,
} from "@/shared/types/time-entry-mock";

type TechnicianTimeCardProps = {
  session: MockActiveTechnicianSession;
};

export function TechnicianTimeCard({ session }: TechnicianTimeCardProps) {
  const elapsed = formatMockHours(getMockElapsedHours(session.clockInAt));

  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
            {session.technician
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {session.technician}
            </p>
            <p className="text-xs text-cyan-700">On the clock</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-600" />
          Active
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span>
            Clocked in {formatMockDateTime(session.clockInAt)} · {elapsed}
          </span>
        </div>
        {session.jobNumber ? (
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-400" />
            {session.jobNumber}
          </div>
        ) : null}
        {session.customerName ? (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            {session.customerName}
          </div>
        ) : null}
        <div className="flex items-center gap-2 sm:col-span-2">
          <User className="h-4 w-4 text-slate-400" />
          Field technician session
        </div>
      </div>
    </div>
  );
}
