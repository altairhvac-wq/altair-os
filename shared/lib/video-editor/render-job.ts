/**
 * A render request, as a constrained job rather than a command.
 *
 * ==================== THE BROWSER NEVER NAMES A COMMAND ====================
 * The obvious shape for "render this" is a button that runs ffmpeg. That is a
 * remote shell with extra steps: whatever the page can put in a path or an
 * argument, the machine runs. So nothing here contains a command, a binary
 * name, a flag, or a filesystem path. A job names a PROJECT and carries a
 * compiled timeline; the worker on the production laptop decides what to run,
 * and it can only run the one pipeline it already has.
 *
 * ==================== THE ALLOWLIST IS THE BOUNDARY ====================
 * `projectId` is checked against a list the worker holds. An id that is not on
 * it is refused before anything is read, so a job file that arrives from
 * anywhere — a stale download, a copied folder, something a browser was talked
 * into writing — cannot cause work to happen on a project nobody chose.
 *
 * ==================== THE TWO-COMMAND RENDER IS UNTOUCHED ====================
 * `EPISODE_FILE=… node render-episode.mjs` remains exactly what it was. This is
 * a second, narrower door onto the same pipeline, and if it breaks the original
 * one still works. That is deliberate: the one thing this system cannot afford
 * to destabilise is the renderer that has a proven master behind it.
 */

import type { CompiledTimeline, CompileDrop } from "./compile";
import type { BakePlan } from "./bake";

/**
 * The lifecycle, in the order it happens. Order matters: `isAfter` uses it to
 * refuse a backwards transition, which is what stops a late status write from
 * resurrecting a finished job.
 */
export const RENDER_JOB_STATES = [
  "queued",
  "preparing_scenes",
  "rendering",
  "audio_conform",
  "complete",
  "failed",
] as const;

export type RenderJobState = (typeof RENDER_JOB_STATES)[number];

export const RENDER_JOB_STATE_LABEL: Record<RenderJobState, string> = {
  queued: "Queued",
  preparing_scenes: "Preparing scenes",
  rendering: "Rendering",
  audio_conform: "Audio conform",
  complete: "Complete",
  failed: "Failed",
};

/** Terminal states never transition again. */
export function isTerminal(state: RenderJobState): boolean {
  return state === "complete" || state === "failed";
}

/**
 * Legal transitions.
 *
 * A job may fail from anywhere — a render dies where it dies. It may not go
 * backwards, and it may not leave a terminal state: a worker that crashed and
 * restarted must create a NEW job rather than reopening a finished one, so the
 * record of what happened stays true.
 */
export function canTransition(
  from: RenderJobState,
  to: RenderJobState,
): boolean {
  if (isTerminal(from)) return false;
  if (to === "failed") return true;
  const fromIndex = RENDER_JOB_STATES.indexOf(from);
  const toIndex = RENDER_JOB_STATES.indexOf(to);
  return toIndex === fromIndex + 1;
}

export type RenderJobRequest = {
  readonly jobId: string;
  /** Checked against the worker's allowlist before anything else happens. */
  readonly projectId: string;
  readonly projectTitle: string;
  readonly requestedAt: string;
  /** The compiled plan. The worker renders THIS, not the editor's project. */
  readonly timeline: CompiledTimeline;
  readonly bakePlan: BakePlan;
  readonly drops: readonly CompileDrop[];
  readonly expectedOutputMs: number;
  /**
   * Which episode's committed assets the worker should resolve frames from.
   * A stem, never a path — the worker maps it to a directory it already knows.
   */
  readonly assetStem: string;
};

export type RenderJobStatus = {
  readonly jobId: string;
  readonly state: RenderJobState;
  readonly updatedAt: string;
  readonly detail?: string;
  /** Set only on `complete`. A filename, never a full path. */
  readonly masterFile?: string;
  readonly masterSha256?: string;
  readonly error?: string;
};

/**
 * Whether a job may be created at all.
 *
 * Blocking errors from the compiler stop a job before it starts, because a
 * timeline the renderer will refuse is a job that exists only to fail — and a
 * failed job in the record is indistinguishable from a real render problem.
 */
export function canQueue(opts: {
  readonly projectId: string;
  readonly allowlist: readonly string[];
  readonly compileErrors: readonly string[];
}): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  if (!opts.allowlist.includes(opts.projectId)) {
    return {
      ok: false,
      reason: `${opts.projectId} is not a project this worker will render.`,
    };
  }
  if (opts.compileErrors.length > 0) {
    return {
      ok: false,
      reason: `The timeline has ${opts.compileErrors.length} blocking issue${opts.compileErrors.length === 1 ? "" : "s"}: ${opts.compileErrors[0]}`,
    };
  }
  return { ok: true };
}

/** Applies a status update, or explains why it was refused. */
export function applyStatus(
  current: RenderJobStatus,
  next: {
    readonly state: RenderJobState;
    readonly updatedAt: string;
    readonly detail?: string;
    readonly masterFile?: string;
    readonly masterSha256?: string;
    readonly error?: string;
  },
): { readonly ok: true; readonly status: RenderJobStatus } | { readonly ok: false; readonly reason: string } {
  if (!canTransition(current.state, next.state)) {
    return {
      ok: false,
      reason: `${current.state} cannot become ${next.state}`,
    };
  }
  return {
    ok: true,
    status: {
      jobId: current.jobId,
      state: next.state,
      updatedAt: next.updatedAt,
      ...(next.detail === undefined ? {} : { detail: next.detail }),
      ...(next.masterFile === undefined ? {} : { masterFile: next.masterFile }),
      ...(next.masterSha256 === undefined
        ? {}
        : { masterSha256: next.masterSha256 }),
      ...(next.error === undefined ? {} : { error: next.error }),
    },
  };
}

/** One line for the editor's header. */
export function describeJobStatus(status: RenderJobStatus): string {
  const label = RENDER_JOB_STATE_LABEL[status.state];
  if (status.state === "complete") {
    return `${label} — ${status.masterFile ?? "master written"}`;
  }
  if (status.state === "failed") {
    return `${label} — ${status.error ?? "no reason recorded"}`;
  }
  return status.detail ? `${label} — ${status.detail}` : label;
}
