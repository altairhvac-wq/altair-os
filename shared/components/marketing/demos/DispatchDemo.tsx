"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Inbox, MapPin, RefreshCw, Smartphone, UserMinus, Wrench } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { Toast, focusRing, useToast } from "@/shared/components/resources/tools/ToolControls";
import { DemoFrame, StatusPill } from "@/shared/components/marketing/demos/DemoFrame";

/**
 * "Run today's board", the demo on /hvac-dispatch-software.
 *
 * Behaves like the product's board (shared/lib/site/landing-pages.ts and
 * app/actions/dispatch.ts): a job is assigned, reassigned or unassigned by
 * choosing a technician, not dragged; times stay as booked; the unassigned
 * queue is sorted by priority; each technician's phone lists only their own
 * jobs and shows a change the next time it is opened or refreshed. There is
 * no route optimisation or GPS here because the product has none.
 *
 * Every person, address and job is made up. Nothing leaves the browser.
 */

const TOOL_ID = "dispatch-demo";

type Priority = "High" | "Normal" | "Low";
type Job = {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly customer: string;
  readonly address: string;
  readonly equipment: string;
  /** Minutes from midnight. */
  readonly start: number;
  readonly minutes: number;
  readonly priority: Priority;
};

const TECHS = [
  { id: "t1", name: "Alex R.", initials: "AR" },
  { id: "t2", name: "Jordan M.", initials: "JM" },
  { id: "t3", name: "Casey T.", initials: "CT" },
] as const;
type TechId = (typeof TECHS)[number]["id"];

const JOBS: readonly Job[] = [
  { id: "j1", number: "JOB-2201", title: "Furnace tune-up", customer: "M. Example", address: "12 Sample Ave", equipment: "Gas furnace, 80k BTU", start: 480, minutes: 90, priority: "Normal" },
  { id: "j2", number: "JOB-2202", title: "AC not cooling", customer: "R. Sample", address: "48 Example Rd", equipment: "Split AC, 3 ton", start: 600, minutes: 90, priority: "High" },
  { id: "j3", number: "JOB-2203", title: "Thermostat install", customer: "L. Placeholder", address: "7 Demo Court", equipment: "Wi-Fi thermostat", start: 510, minutes: 60, priority: "Low" },
  { id: "j4", number: "JOB-2204", title: "Rooftop unit heat check", customer: "Sample Dental Office", address: "300 Example Blvd", equipment: "Packaged rooftop unit", start: 660, minutes: 120, priority: "Normal" },
  { id: "j5", number: "JOB-2205", title: "Maintenance visit", customer: "K. Example", address: "91 Sample Lane", equipment: "Heat pump, 2.5 ton", start: 810, minutes: 90, priority: "Normal" },
  { id: "j6", number: "JOB-2206", title: "Duct inspection", customer: "T. Sample", address: "5 Example Way", equipment: "Return and supply ducts", start: 540, minutes: 90, priority: "Low" },
  { id: "j7", number: "JOB-2210", title: "No heat", customer: "D. Example", address: "220 Sample St", equipment: "Gas furnace, 60k BTU", start: 840, minutes: 90, priority: "High" },
  { id: "j8", number: "JOB-2208", title: "Replace run capacitor", customer: "Pat Sample", address: "200 Example Street", equipment: "Split AC, 3 ton", start: 720, minutes: 60, priority: "Normal" },
  { id: "j9", number: "JOB-2209", title: "Condensate leak", customer: "G. Placeholder", address: "64 Demo Drive", equipment: "Air handler, attic", start: 930, minutes: 60, priority: "Normal" },
];

const START_ASSIGNMENTS: Readonly<Record<string, TechId | null>> = {
  j1: "t1", j2: "t1", j3: "t2", j4: "t2", j5: "t3", j6: "t3", j7: null, j8: null, j9: null,
};

const DAY_START = 8 * 60;
const DAY_END = 17 * 60;
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);
const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Normal: 1, Low: 2 };

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function priorityTone(priority: Priority): "danger" | "neutral" | "info" {
  return priority === "High" ? "danger" : priority === "Low" ? "info" : "neutral";
}

/** Lanes so jobs that overlap on one technician stack instead of hiding each other. */
function lanes(jobs: readonly Job[]): { job: Job; lane: number }[] {
  const ends: number[] = [];
  return [...jobs]
    .sort((a, b) => a.start - b.start)
    .map((job) => {
      let lane = ends.findIndex((end) => end <= job.start);
      if (lane === -1) {
        lane = ends.length;
        ends.push(0);
      }
      ends[lane] = job.start + job.minutes;
      return { job, lane };
    });
}

export function DispatchDemo() {
  const [assign, setAssign] = useState<Record<string, TechId | null>>({ ...START_ASSIGNMENTS });
  const [phoneSeen, setPhoneSeen] = useState<Record<string, TechId | null>>({ ...START_ASSIGNMENTS });
  const [selected, setSelected] = useState<string | null>(null);
  const [phoneTech, setPhoneTech] = useState<TechId>("t1");
  const toast = useToast();

  const interacted = useRef(false);
  const markInteracted = () => {
    interacted.current = true;
  };
  useEffect(() => {
    if (interacted.current) trackEngagement("calculator_used", TOOL_ID);
  }, [assign]);

  const unassigned = useMemo(
    () =>
      JOBS.filter((job) => !assign[job.id]).sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.start - b.start,
      ),
    [assign],
  );
  const byTech = (techId: TechId, map: Record<string, TechId | null>) =>
    JOBS.filter((job) => map[job.id] === techId).sort((a, b) => a.start - b.start);
  const selectedJob = JOBS.find((job) => job.id === selected) ?? null;
  const techName = (id: TechId | null | undefined) => TECHS.find((tech) => tech.id === id)?.name ?? "";

  const setTech = (jobId: string, techId: TechId | null) => {
    const job = JOBS.find((j) => j.id === jobId);
    if (!job) return;
    const before = assign[jobId] ?? null;
    if (before === techId) return;
    setAssign((map) => ({ ...map, [jobId]: techId }));
    setSelected(null);
    toast.show(
      techId === null
        ? `${job.number} is back in the unassigned queue.`
        : before
          ? `${job.number} moved from ${techName(before)} to ${techName(techId)}.`
          : `${job.number} assigned to ${techName(techId)} at ${clock(job.start)}.`,
    );
  };

  const reset = () => {
    setAssign({ ...START_ASSIGNMENTS });
    setPhoneSeen({ ...START_ASSIGNMENTS });
    setSelected(null);
    setPhoneTech("t1");
    toast.show("Back to this morning's board.");
  };

  const phoneJobs = byTech(phoneTech, phoneSeen);
  const phoneStale = JOBS.some(
    (job) => (assign[job.id] === phoneTech) !== (phoneSeen[job.id] === phoneTech),
  );
  const refreshPhone = () => {
    setPhoneSeen({ ...assign });
    toast.show(`${techName(phoneTech)}'s phone refreshed.`);
  };

  const assignedCount = JOBS.length - unassigned.length;
  const pct = (minutes: number) => ((minutes - DAY_START) / (DAY_END - DAY_START)) * 100;

  const jobButton = (job: Job, compact = false) => {
    const active = selected === job.id;
    return (
      <button
        type="button"
        onClick={() => setSelected(active ? null : job.id)}
        aria-pressed={active}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
          active
            ? "border-[#A4823A] bg-amber-50 ring-2 ring-[#C2A05A]/50"
            : job.priority === "High"
              ? "border-red-200 bg-red-50/70 hover:border-red-300"
              : "border-stone-200 bg-white hover:border-stone-300"
        } ${focusRing}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold text-stone-500">
            {clock(job.start)} · {job.number}
          </span>
          {!compact ? <StatusPill tone={priorityTone(job.priority)}>{job.priority}</StatusPill> : null}
        </span>
        <span className="block truncate text-[13px] font-semibold text-stone-900">{job.title}</span>
        <span className="block truncate text-[11px] text-stone-500">{job.customer}</span>
      </button>
    );
  };

  return (
    <DemoFrame
      id="dispatch-demo"
      icon={CalendarClock}
      title="Run today's board"
      subtitle="Pick a job, then pick the technician. Assign, reassign or unassign; nothing is dragged."
      onReset={reset}
      onInteract={markInteracted}
    >
      {/* counters */}
      <div className="grid grid-cols-3 divide-x divide-stone-200 border-b border-stone-200 bg-stone-50 text-center">
        {[
          { label: "Jobs today", value: JOBS.length },
          { label: "Assigned", value: assignedCount },
          { label: "Unassigned", value: unassigned.length },
        ].map((stat) => (
          <div key={stat.label} className="px-2 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">{stat.label}</p>
            <p className={`text-xl font-semibold tabular-nums ${stat.label === "Unassigned" && stat.value > 0 ? "text-amber-700" : "text-stone-900"}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* action bar for the selected job */}
      <div className="border-b border-stone-200 bg-white px-3 py-2.5 sm:px-5" aria-live="polite">
        {selectedJob ? (
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-stone-700">
              <span className="font-semibold text-stone-900">
                {selectedJob.number} · {selectedJob.title}
              </span>{" "}
              at {clock(selectedJob.start)} {assign[selectedJob.id] ? `· now with ${techName(assign[selectedJob.id])}` : "· unassigned"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TECHS.map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  disabled={assign[selectedJob.id] === tech.id}
                  onClick={() => setTech(selectedJob.id, tech.id)}
                  className={`min-h-10 rounded-lg bg-stone-900 px-3 text-[13px] font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 ${focusRing}`}
                >
                  {assign[selectedJob.id] ? "Move to" : "Assign to"} {tech.name}
                </button>
              ))}
              {assign[selectedJob.id] ? (
                <button
                  type="button"
                  onClick={() => setTech(selectedJob.id, null)}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-[13px] font-semibold text-stone-700 hover:border-red-300 hover:text-red-700 ${focusRing}`}
                >
                  <UserMinus aria-hidden="true" className="h-4 w-4" />
                  Unassign
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-600">
            {unassigned.length > 0
              ? `Pick a job to assign. ${unassigned.length} ${unassigned.length === 1 ? "job is" : "jobs are"} waiting in the queue.`
              : "Every job has a technician. Pick any job to move it."}
          </p>
        )}
      </div>

      <div>
        <div className="grid min-w-0 md:grid-cols-[220px_minmax(0,1fr)]">
          {/* unassigned queue */}
          <div className="border-b border-stone-200 p-3 sm:p-4 md:border-b-0 md:border-r">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              <Inbox aria-hidden="true" className="h-3.5 w-3.5" />
              Unassigned · by priority
            </p>
            <ul className="mt-2 space-y-2">
              {unassigned.length === 0 ? (
                <li className="rounded-lg border border-dashed border-stone-300 px-3 py-6 text-center text-[13px] text-stone-500">
                  Queue is empty. Every job has a technician.
                </li>
              ) : (
                unassigned.map((job) => <li key={job.id}>{jobButton(job)}</li>)
              )}
            </ul>
          </div>

          {/* the board */}
          <div className="min-w-0 p-3 sm:p-4">
            {/* timeline, tablet and up */}
            <div className="hidden md:block">
              <div className="relative ml-32 mr-1 h-6 text-[10px] font-semibold text-stone-400">
                {HOURS.map((minutes) => (
                  <span
                    key={minutes}
                    className={`absolute whitespace-nowrap ${minutes === DAY_START ? "" : minutes === DAY_END ? "-translate-x-full" : "-translate-x-1/2"}`}
                    style={{ left: `${pct(minutes)}%` }}
                  >
                    {clock(minutes).replace(":00", "")}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                {TECHS.map((tech) => {
                  const placed = lanes(byTech(tech.id, assign));
                  const laneCount = Math.max(1, ...placed.map((p) => p.lane + 1));
                  return (
                    <div key={tech.id} className="flex items-stretch gap-2">
                      <div className="flex shrink-0 flex-col justify-center rounded-lg bg-stone-50 px-2 py-2 ring-1 ring-inset ring-stone-200" style={{ width: "7.5rem" }}>
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-900">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[10px] text-[#e8d9ac]">{tech.initials}</span>
                          {tech.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-stone-500">{placed.length} {placed.length === 1 ? "job" : "jobs"}</p>
                      </div>
                      <div
                        className="relative min-w-0 flex-1 rounded-lg ring-1 ring-inset ring-stone-200"
                        style={{ height: `${laneCount * 64 + 8}px` }}
                      >
                        {HOURS.slice(1, -1).map((minutes) => (
                          <span key={minutes} aria-hidden="true" className="absolute inset-y-0 w-px bg-stone-200/70" style={{ left: `${pct(minutes)}%` }} />
                        ))}
                        {placed.length === 0 ? (
                          <p className="absolute inset-0 flex items-center justify-center text-[12px] text-stone-400">No jobs yet</p>
                        ) : null}
                        {placed.map(({ job, lane }) => (
                          <div
                            key={job.id}
                            className="absolute px-0.5"
                            style={{ left: `${pct(job.start)}%`, width: `${(job.minutes / (DAY_END - DAY_START)) * 100}%`, top: `${lane * 64 + 4}px` }}
                          >
                            {jobButton(job, true)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* list per technician, phones */}
            <div className="space-y-4 md:hidden">
              {TECHS.map((tech) => {
                const jobs = byTech(tech.id, assign);
                return (
                  <div key={tech.id}>
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-stone-900">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[10px] text-[#e8d9ac]">{tech.initials}</span>
                      {tech.name}
                      <span className="font-normal text-stone-500">· {jobs.length} {jobs.length === 1 ? "job" : "jobs"}</span>
                    </p>
                    <ul className="mt-2 space-y-2">
                      {jobs.length === 0 ? (
                        <li className="rounded-lg border border-dashed border-stone-300 px-3 py-4 text-center text-[13px] text-stone-500">No jobs yet</li>
                      ) : (
                        jobs.map((job) => <li key={job.id}>{jobButton(job)}</li>)
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* the technician's phone */}
        <div className="border-t border-stone-200 bg-stone-100/70 p-4 sm:p-6 md:grid md:grid-cols-[minmax(0,1fr)_300px] md:items-start md:gap-10">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              <Smartphone aria-hidden="true" className="h-3.5 w-3.5" />
              The technician&apos;s phone
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Technician">
              {TECHS.map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  role="tab"
                  aria-selected={phoneTech === tech.id}
                  onClick={() => setPhoneTech(tech.id)}
                  className={`min-h-9 rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset ${
                    phoneTech === tech.id ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300"
                  } ${focusRing}`}
                >
                  {tech.name}
                </button>
              ))}
            </div>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-stone-600">
              Each technician sees only their own jobs. A change on the board shows the next time they open or refresh the
              list.
            </p>
            <Link
              href="/hvac-estimating-software#estimating-demo"
              className={`mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#77591B] underline-offset-4 hover:underline ${focusRing}`}
            >
              Where JOB-2208 came from: the estimate demo
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mx-auto mt-4 w-full max-w-[300px] md:mt-0 rounded-[1.6rem] border-[6px] border-stone-900 bg-white p-3 shadow-xl">
            <p className="text-center text-[11px] font-semibold text-stone-500">My jobs today · {techName(phoneTech)}</p>
            {phoneStale ? (
              <button
                type="button"
                onClick={refreshPhone}
                className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-2 py-2 text-[12px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-200 hover:bg-amber-100 ${focusRing}`}
              >
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                The board changed. Refresh to see it.
              </button>
            ) : null}
            <ul className="mt-2 space-y-2">
              {phoneJobs.length === 0 ? (
                <li className="rounded-lg bg-stone-50 px-3 py-6 text-center text-[12px] text-stone-500">No jobs assigned yet.</li>
              ) : (
                phoneJobs.map((job) => (
                  <li key={job.id} className="rounded-lg bg-stone-50 p-2.5 ring-1 ring-inset ring-stone-200">
                    <p className="text-[11px] font-semibold text-stone-500">
                      {clock(job.start)} · {job.number}
                    </p>
                    <p className="text-[13px] font-semibold text-stone-900">{job.title}</p>
                    <p className="flex items-center gap-1 text-[11px] text-stone-600">
                      <MapPin aria-hidden="true" className="h-3 w-3" />
                      {job.customer} · {job.address}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-stone-600">
                      <Wrench aria-hidden="true" className="h-3 w-3" />
                      {job.equipment}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
      <Toast message={toast.message} />
    </DemoFrame>
  );
}
