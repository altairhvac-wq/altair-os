"use client";

import { useEffect, useState } from "react";
import { mockTechnicianDashboard } from "@/shared/data/mock-technician-dashboard";
import type {
  TechnicianDashboardData,
  TechnicianJob,
  TechnicianQuickAction,
  TechnicianShift,
} from "@/shared/types/technician";
import { CurrentJobCard } from "./CurrentJobCard";
import { ShiftStatusCard } from "./ShiftStatusCard";
import { TechnicianDashboardEmptyState } from "./TechnicianDashboardEmptyState";
import { TechnicianDashboardLoadingState } from "./TechnicianDashboardLoadingState";
import { TechnicianJobDetailsPanel } from "./TechnicianJobDetailsPanel";
import { UpcomingJobsList } from "./UpcomingJobsList";

export function TechnicianDashboardView() {
  const [dashboard, setDashboard] = useState<TechnicianDashboardData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<TechnicianJob | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDashboard(mockTechnicianDashboard);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!actionMessage) return;

    const timer = setTimeout(() => setActionMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  function updateShift(nextShift: TechnicianShift) {
    setDashboard((current) =>
      current ? { ...current, shift: nextShift } : current,
    );
  }

  function handleClockIn() {
    updateShift({
      status: "clocked_in",
      clockInAt: new Date().toISOString(),
    });
    setActionMessage("Clocked in — have a safe shift.");
  }

  function handleClockOut() {
    updateShift({ status: "clocked_out" });
    setActionMessage("Clocked out — shift ended.");
  }

  function handleQuickAction(action: TechnicianQuickAction, job: TechnicianJob) {
    const messages: Record<TechnicianQuickAction, string> = {
      navigate: `Navigate to ${job.customerName} (maps coming soon).`,
      call: `Call ${job.customerName} at ${job.customerPhone} (mock).`,
      note: `Add note for ${job.jobNumber} (coming soon).`,
      photo: `Upload photo for ${job.jobNumber} (coming soon).`,
      complete: `Complete ${job.jobNumber} (coming soon).`,
    };

    setActionMessage(messages[action]);
  }

  if (isLoading) {
    return <TechnicianDashboardLoadingState />;
  }

  if (!dashboard) {
    return (
      <TechnicianDashboardEmptyState
        variant="no-jobs"
        onClockIn={handleClockIn}
      />
    );
  }

  const hasJobs =
    dashboard.currentJob != null || dashboard.upcomingJobs.length > 0;
  const showOffShiftEmpty =
    dashboard.shift.status === "clocked_out" && !hasJobs;

  return (
    <div className="space-y-4">
      {actionMessage ? (
        <div
          role="status"
          className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-900"
        >
          {actionMessage}
        </div>
      ) : null}

      <ShiftStatusCard
        technician={dashboard.technician}
        shift={dashboard.shift}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
      />

      <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Today&apos;s Schedule
          </p>
          <p className="text-sm font-bold text-slate-900">
            {dashboard.todayJobCount} job
            {dashboard.todayJobCount === 1 ? "" : "s"} assigned
          </p>
        </div>
        <p className="text-sm font-semibold text-emerald-600">
          {dashboard.completedTodayCount} done
        </p>
      </div>

      {showOffShiftEmpty ? (
        <TechnicianDashboardEmptyState
          variant="off-shift"
          onClockIn={handleClockIn}
        />
      ) : null}

      {!showOffShiftEmpty && !hasJobs ? (
        <TechnicianDashboardEmptyState variant="no-jobs" />
      ) : null}

      {dashboard.currentJob ? (
        <CurrentJobCard
          job={dashboard.currentJob}
          onViewDetails={setSelectedJob}
          onQuickAction={handleQuickAction}
        />
      ) : null}

      <UpcomingJobsList
        jobs={dashboard.upcomingJobs}
        onSelectJob={setSelectedJob}
      />

      {selectedJob ? (
        <TechnicianJobDetailsPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onQuickAction={handleQuickAction}
        />
      ) : null}
    </div>
  );
}
