"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import type { JobStatus } from "@/shared/types/job";
import type { TechnicianJob } from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianJobCard } from "./TechnicianJobCard";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

const SWIPE_THRESHOLD_PX = 48;
const MAX_PEEK_CARDS = 2;

type TechnicianJobDeckProps = {
  jobs: TechnicianJob[];
  /** Resets carousel to the first job when the schedule day changes. */
  deckKey?: string;
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  canCreateEstimate: boolean;
  canApproveOnSite: boolean;
  canViewBilling: boolean;
  billingSummaries: JobBillingSummariesByJobId;
  canManageTime: boolean;
  defaultTaxRate: number;
  onTimeStateChange: (state: TechnicianTimeStateSnapshot) => void;
  onJobStatusUpdated: (jobId: string, status: JobStatus) => void;
};

function isInteractiveSwipeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "button, a, input, textarea, select, summary, label, [role='button']",
    ),
  );
}

function isLiveTechnicianJob(
  job: TechnicianJob,
  timeState: TechnicianTimeStateSnapshot,
): boolean {
  if (job.status === "in_progress") {
    return true;
  }

  return (
    timeState.openJobLaborEntry?.jobId === job.id ||
    (timeState.state !== "off_clock" && timeState.activeJobId === job.id)
  );
}

function getPeekCardStyle(depth: number): CSSProperties {
  return {
    zIndex: 30 - depth * 10,
    transform: `translateY(${depth * 10}px) translateX(${depth * 5}px) scale(${1 - depth * 0.035})`,
    opacity: Math.max(0.3, 0.7 - depth * 0.2),
  };
}

function TechnicianJobDeckPeekCard({ job }: { job: TechnicianJob }) {
  return (
    <div
      aria-hidden
      className="rounded-xl border border-slate-200/70 bg-white px-2.5 py-1.5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-500">
            {job.jobNumber}
          </p>
          <p className="truncate text-[11px] text-slate-400">{job.customerName}</p>
        </div>
        <TechnicianJobStatusBadge
          status={job.status}
          className="opacity-80"
        />
      </div>
    </div>
  );
}

export function TechnicianJobDeck({
  jobs,
  deckKey,
  timeState,
  serviceItems,
  canCreateEstimate,
  canApproveOnSite,
  canViewBilling,
  billingSummaries,
  canManageTime,
  defaultTaxRate,
  onTimeStateChange,
  onJobStatusUpdated,
}: TechnicianJobDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartXRef = useRef(0);
  const pointerStartYRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const swipeAxisRef = useRef<"none" | "horizontal" | "vertical">("none");

  const totalJobs = jobs.length;
  const activeJob = jobs[activeIndex];
  const peekJobs = jobs.slice(
    activeIndex + 1,
    activeIndex + 1 + MAX_PEEK_CARDS,
  );
  const showStack = totalJobs > 1;
  const showNav = totalJobs > 1;
  const stackTailPadding = peekJobs.length * 12;

  useEffect(() => {
    setActiveIndex((current) =>
      totalJobs === 0 ? 0 : Math.min(current, totalJobs - 1),
    );
  }, [totalJobs]);

  useEffect(() => {
    if (!deckKey) {
      return;
    }

    setActiveIndex(0);
    setDragOffsetX(0);
  }, [deckKey]);

  const goToPrevious = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
    setDragOffsetX(0);
  }, []);

  const goToNext = useCallback(() => {
    setActiveIndex((current) => Math.min(totalJobs - 1, current + 1));
    setDragOffsetX(0);
  }, [totalJobs]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isInteractiveSwipeTarget(event.target)) {
      return;
    }

    pointerStartXRef.current = event.clientX;
    pointerStartYRef.current = event.clientY;
    pointerIdRef.current = event.pointerId;
    swipeAxisRef.current = "none";
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (
      !isDragging ||
      pointerIdRef.current !== event.pointerId ||
      !showNav
    ) {
      return;
    }

    const deltaX = event.clientX - pointerStartXRef.current;
    const deltaY = event.clientY - pointerStartYRef.current;

    if (swipeAxisRef.current === "none") {
      if (
        Math.abs(deltaX) < 8 &&
        Math.abs(deltaY) < 8
      ) {
        return;
      }

      swipeAxisRef.current =
        Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";

      if (swipeAxisRef.current === "vertical") {
        setIsDragging(false);
        setDragOffsetX(0);
        pointerIdRef.current = null;
        return;
      }
    }

    if (swipeAxisRef.current !== "horizontal") {
      return;
    }

    const atStart = activeIndex === 0 && deltaX > 0;
    const atEnd = activeIndex === totalJobs - 1 && deltaX < 0;
    const resistedDelta = atStart || atEnd ? deltaX * 0.35 : deltaX;
    setDragOffsetX(resistedDelta);
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    if (swipeAxisRef.current === "horizontal") {
      const deltaX = event.clientX - pointerStartXRef.current;

      if (deltaX <= -SWIPE_THRESHOLD_PX) {
        goToNext();
      } else if (deltaX >= SWIPE_THRESHOLD_PX) {
        goToPrevious();
      } else {
        setDragOffsetX(0);
      }
    }

    setIsDragging(false);
    swipeAxisRef.current = "none";
    pointerIdRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (!activeJob) {
    return null;
  }

  const isLiveJob = isLiveTechnicianJob(activeJob, timeState);
  const countLabel = `${activeIndex + 1} of ${totalJobs}`;

  return (
    <section className="w-full min-w-0 max-w-full space-y-1 overflow-x-hidden">
      <div className="flex min-h-9 items-center justify-between gap-2 px-0.5">
        {showNav ? (
          <button
            type="button"
            onClick={goToPrevious}
            disabled={activeIndex === 0}
            aria-label="Previous job"
            className="inline-flex min-h-9 min-w-9 shrink-0 touch-manipulation items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <span className="w-9 shrink-0" aria-hidden />
        )}

        <p
          className="min-w-0 flex-1 text-center text-xs font-medium tabular-nums text-slate-500"
          aria-live="polite"
        >
          {countLabel}
        </p>

        {showNav ? (
          <button
            type="button"
            onClick={goToNext}
            disabled={activeIndex >= totalJobs - 1}
            aria-label="Next job"
            className="inline-flex min-h-9 min-w-9 shrink-0 touch-manipulation items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <span className="w-9 shrink-0" aria-hidden />
        )}
      </div>

      <div
        className="relative w-full min-w-0 max-w-full overflow-x-hidden"
        style={{ paddingBottom: showStack ? stackTailPadding : undefined }}
      >
        {showStack
          ? [...peekJobs].reverse().map((job, reverseIndex) => {
              const depth = peekJobs.length - reverseIndex;

              return (
                <div
                  key={job.id}
                  className="pointer-events-none absolute inset-x-0 top-0 origin-top transition-[transform,opacity] duration-200 ease-out"
                  style={getPeekCardStyle(depth)}
                >
                  <TechnicianJobDeckPeekCard job={job} />
                </div>
              );
            })
          : null}

        <div
          className={`relative z-40 w-full min-w-0 touch-pan-y ${
            isDragging ? "" : "transition-transform duration-200 ease-out"
          }`}
          style={{
            transform: dragOffsetX ? `translateX(${dragOffsetX}px)` : undefined,
          }}
          onPointerDown={showNav ? handlePointerDown : undefined}
          onPointerMove={showNav ? handlePointerMove : undefined}
          onPointerUp={showNav ? handlePointerEnd : undefined}
          onPointerCancel={showNav ? handlePointerEnd : undefined}
        >
          <TechnicianJobCard
            key={activeJob.id}
            job={activeJob}
            timeState={timeState}
            serviceItems={serviceItems}
            canCreateEstimate={canCreateEstimate}
            canApproveOnSite={canApproveOnSite}
            canViewBilling={canViewBilling}
            billingContext={{
              estimates: billingSummaries.estimatesByJobId[activeJob.id] ?? [],
              invoices: billingSummaries.invoicesByJobId[activeJob.id] ?? [],
            }}
            canManageTime={canManageTime}
            defaultTaxRate={defaultTaxRate}
            onTimeStateChange={onTimeStateChange}
            onStatusUpdated={(status) => onJobStatusUpdated(activeJob.id, status)}
            defaultExpanded={
              isLiveJob || totalJobs === 1
            }
            emphasized={isLiveJob}
            deckBadge={isLiveJob ? "active" : "current"}
          />
        </div>
      </div>
    </section>
  );
}
