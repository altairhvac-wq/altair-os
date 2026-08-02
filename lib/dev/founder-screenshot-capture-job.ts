import "server-only";

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { randomUUID } from "crypto";

export type FounderCapturePageResult = {
  id?: string;
  label: string;
  route: string;
  output: string;
  ok: boolean;
  notes: string;
  dimensions?: { width: number; height: number } | null;
};

export type FounderCaptureJobStatus = "queued" | "running" | "succeeded" | "failed";

export type FounderCaptureJob = {
  id: string;
  baseUrl: string;
  status: FounderCaptureJobStatus;
  startedAt: string;
  finishedAt: string | null;
  message: string;
  logs: string[];
  pages: FounderCapturePageResult[];
  successCount: number | null;
  totalCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type CaptureEvent =
  | { type: "status"; message: string }
  | { type: "log"; message: string }
  | {
      type: "page";
      id?: string;
      label: string;
      route: string;
      output: string;
      status: "started" | "ok" | "failed";
      notes?: string;
      dimensions?: { width: number; height: number } | null;
    }
  | {
      type: "summary";
      successCount: number;
      total: number;
      results: FounderCapturePageResult[];
    }
  | { type: "error"; code: string; message: string };

const jobs = new Map<string, FounderCaptureJob>();
const activeChildren = new Map<string, ChildProcessWithoutNullStreams>();

const MAX_LOG_LINES = 200;
const JOB_TTL_MS = 60 * 60 * 1000;

function pruneOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    const stamp = Date.parse(job.finishedAt ?? job.startedAt);
    if (Number.isFinite(stamp) && stamp < cutoff) {
      jobs.delete(id);
      activeChildren.delete(id);
    }
  }
}

function appendLog(job: FounderCaptureJob, line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  job.logs.push(trimmed);
  if (job.logs.length > MAX_LOG_LINES) {
    job.logs.splice(0, job.logs.length - MAX_LOG_LINES);
  }
}

function parseEvent(line: string): CaptureEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as CaptureEvent;
    if (
      parsed &&
      typeof parsed === "object" &&
      "type" in parsed &&
      typeof parsed.type === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function applyEvent(job: FounderCaptureJob, event: CaptureEvent) {
  switch (event.type) {
    case "status":
    case "log":
      job.message = event.message;
      appendLog(job, event.message);
      break;
    case "page": {
      const existingIndex = job.pages.findIndex(
        (page) =>
          (event.id && page.id === event.id) ||
          page.route === event.route ||
          page.output === event.output,
      );
      const next: FounderCapturePageResult = {
        id: event.id,
        label: event.label,
        route: event.route,
        output: event.output,
        ok: event.status === "ok",
        notes:
          event.status === "started"
            ? "Capturing…"
            : (event.notes ?? (event.status === "ok" ? "OK" : "Failed")),
        dimensions: event.dimensions ?? null,
      };

      if (existingIndex >= 0) {
        job.pages[existingIndex] = {
          ...job.pages[existingIndex],
          ...next,
          ok: event.status === "started" ? job.pages[existingIndex].ok : next.ok,
        };
      } else {
        job.pages.push(next);
      }

      if (event.status === "started") {
        job.message = `Capturing ${event.label}…`;
      } else if (event.status === "ok") {
        job.message = `Captured ${event.label}`;
      } else {
        job.message = `Failed ${event.label}`;
      }
      appendLog(job, job.message);
      break;
    }
    case "summary":
      job.successCount = event.successCount;
      job.totalCount = event.total;
      job.pages = event.results.map((result) => ({
        ...result,
        ok: Boolean(result.ok),
        notes: result.notes || (result.ok ? "OK" : "Failed"),
      }));
      job.message = `Finished: ${event.successCount}/${event.total} succeeded`;
      appendLog(job, job.message);
      break;
    case "error":
      job.errorCode = event.code;
      job.errorMessage = event.message;
      job.message = event.message;
      appendLog(job, event.message);
      break;
    default:
      break;
  }
}

function handleStdoutLine(job: FounderCaptureJob, line: string) {
  const event = parseEvent(line);
  if (event) {
    applyEvent(job, event);
    return;
  }

  appendLog(job, line);
}

export function getFounderCaptureJob(jobId: string): FounderCaptureJob | null {
  pruneOldJobs();
  return jobs.get(jobId) ?? null;
}

export function listActiveFounderCaptureJobs(): FounderCaptureJob[] {
  pruneOldJobs();
  return [...jobs.values()].filter(
    (job) => job.status === "queued" || job.status === "running",
  );
}

export function startFounderScreenshotCaptureJob(baseUrl: string): FounderCaptureJob {
  pruneOldJobs();

  const active = listActiveFounderCaptureJobs();
  if (active.length > 0) {
    throw new Error(
      "A founder screenshot capture is already running. Wait for it to finish.",
    );
  }

  const job: FounderCaptureJob = {
    id: randomUUID(),
    baseUrl,
    status: "queued",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    message: "Starting capture…",
    logs: [],
    pages: [],
    successCount: null,
    totalCount: null,
    errorCode: null,
    errorMessage: null,
  };

  jobs.set(job.id, job);

  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "capture-founder-marketing-screenshots.mjs",
  );

  const child = spawn(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BASE_URL: baseUrl,
      FOUNDER_CAPTURE_JSON: "1",
    },
    windowsHide: true,
  });

  activeChildren.set(job.id, child);
  job.status = "running";
  job.message = `Capturing against ${baseUrl}…`;
  appendLog(job, job.message);

  let stdoutBuffer = "";
  let stderrBuffer = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk: string) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      handleStdoutLine(job, line);
    }
  });

  child.stderr.on("data", (chunk: string) => {
    stderrBuffer += chunk;
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parseEvent(line);
      if (event) {
        applyEvent(job, event);
      } else if (line.trim()) {
        appendLog(job, line);
        if (!job.errorMessage) {
          job.message = line.trim();
        }
      }
    }
  });

  child.on("error", (error) => {
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
    job.errorCode = job.errorCode ?? "SPAWN_FAILED";
    job.errorMessage = error.message;
    job.message = error.message;
    appendLog(job, error.message);
    activeChildren.delete(job.id);
  });

  child.on("close", (code) => {
    if (stdoutBuffer.trim()) {
      handleStdoutLine(job, stdoutBuffer);
      stdoutBuffer = "";
    }
    if (stderrBuffer.trim()) {
      handleStdoutLine(job, stderrBuffer);
      stderrBuffer = "";
    }

    job.finishedAt = new Date().toISOString();
    activeChildren.delete(job.id);

    if (job.status === "failed") {
      return;
    }

    if (code === 0) {
      job.status = "succeeded";
      if (!job.message.startsWith("Finished:")) {
        job.message =
          job.successCount != null && job.totalCount != null
            ? `Finished: ${job.successCount}/${job.totalCount} succeeded`
            : "Capture finished successfully.";
      }
      return;
    }

    job.status = "failed";
    if (!job.errorMessage) {
      job.errorCode = job.errorCode ?? "CAPTURE_FAILED";
      job.errorMessage =
        job.message ||
        `Capture script exited with code ${code ?? "unknown"}.`;
    }
    job.message = job.errorMessage;
  });

  return job;
}
