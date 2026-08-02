"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

type CapturePageResult = {
  id?: string;
  label: string;
  route: string;
  output: string;
  ok: boolean;
  notes: string;
  dimensions?: { width: number; height: number } | null;
};

type CaptureJob = {
  id: string;
  baseUrl: string;
  status: "queued" | "running" | "succeeded" | "failed";
  message: string;
  pages: CapturePageResult[];
  successCount: number | null;
  totalCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type FounderScreenshotCaptureControlProps = {
  northStar?: boolean;
  disabled?: boolean;
};

const DEFAULT_BASE_URL = "http://localhost:3000";
const POLL_MS = 1500;

function isLocalHost(urlValue: string): boolean {
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export function FounderScreenshotCaptureControl({
  northStar = false,
  disabled = false,
}: FounderScreenshotCaptureControlProps) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [job, setJob] = useState<CaptureJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRunning =
    isStarting || job?.status === "queued" || job?.status === "running";

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  function schedulePoll(jobId: string) {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
    }

    pollTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/dev/founder-screenshot-capture?jobId=${encodeURIComponent(jobId)}`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          job?: CaptureJob;
          error?: string;
        };

        if (!response.ok || !payload.job) {
          setError(payload.error ?? "Could not read capture progress.");
          setIsStarting(false);
          return;
        }

        setJob(payload.job);
        setIsStarting(false);

        if (
          payload.job.status === "queued" ||
          payload.job.status === "running"
        ) {
          schedulePoll(jobId);
          return;
        }

        if (payload.job.status === "failed") {
          setError(
            payload.job.errorMessage ??
              payload.job.message ??
              "Capture failed.",
          );
        } else {
          setError(null);
        }
      } catch {
        setError("Lost connection while polling capture progress.");
        setIsStarting(false);
      }
    }, POLL_MS);
  }

  async function handleCapture() {
    if (disabled || isRunning) {
      return;
    }

    setError(null);
    setJob(null);
    setIsStarting(true);

    try {
      const response = await fetch("/api/dev/founder-screenshot-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl }),
      });
      const payload = (await response.json()) as {
        job?: CaptureJob;
        error?: string;
      };

      if (!response.ok || !payload.job) {
        setError(payload.error ?? "Could not start capture.");
        setIsStarting(false);
        return;
      }

      setJob(payload.job);
      schedulePoll(payload.job.id);
    } catch {
      setError("Could not reach the local capture API.");
      setIsStarting(false);
    }
  }

  const remoteTarget = !isLocalHost(baseUrl.trim() || DEFAULT_BASE_URL);
  const authHint =
    job?.errorCode === "AUTH_DOMAIN_MISMATCH" ||
    (typeof job?.errorMessage === "string" &&
      job.errorMessage.includes("domain-scoped"))
      ? job.errorMessage
      : remoteTarget
        ? `Non-localhost target: auth cookies must match this host. If capture fails on login, run BASE_URL=${baseUrl.trim() || DEFAULT_BASE_URL} npm run capture:founder-auth first.`
        : null;

  return (
    <div
      className={`mt-4 rounded-xl border p-3 ${
        northStar
          ? "border-[rgba(184,138,46,0.28)] bg-[#FAF6EE]/70"
          : "border-amber-200/70 bg-amber-50/40"
      }`}
    >
      <div className="flex items-start gap-2">
        <Camera
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            northStar ? "text-[#8A6324]" : "text-amber-800"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              northStar ? "text-[#17130E]" : "text-slate-900"
            }`}
          >
            Capture product screenshots
          </p>
          <p
            className={`mt-0.5 text-xs leading-relaxed ${
              northStar ? "text-[#6B6255]" : "text-slate-500"
            }`}
          >
            Local-dev only. Spawns the Playwright capture script on this machine
            and writes PNGs under public/marketing/screenshots/social/.
          </p>
        </div>
      </div>

      <label
        className={`mt-3 block text-xs font-medium ${
          northStar ? "text-[#6B6255]" : "text-slate-600"
        }`}
      >
        Target URL (BASE_URL)
        <input
          type="url"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          disabled={disabled || isRunning}
          placeholder={DEFAULT_BASE_URL}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 ${
            northStar
              ? "border-[rgba(148,163,184,0.28)] bg-white/90 text-[#17130E] focus:ring-[rgba(184,138,46,0.25)]"
              : "border-slate-200 bg-white text-slate-900 focus:ring-slate-200"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </label>

      {remoteTarget ? (
        <p
          className={`mt-2 text-xs leading-relaxed ${
            northStar ? "text-[#8A6324]" : "text-amber-800"
          }`}
        >
          {authHint}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || isRunning}
          onClick={() => {
            void handleCapture();
          }}
          className="admin-btn-secondary inline-flex items-center justify-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {isRunning ? "Capturing…" : "Capture screenshots"}
        </button>
        {job ? (
          <span
            className={`text-xs ${
              northStar ? "text-[#6B6255]" : "text-slate-500"
            }`}
          >
            {job.message}
          </span>
        ) : null}
      </div>

      {error ? (
        <p
          className={`mt-2 text-xs leading-relaxed ${
            northStar ? "text-[#9B2C2C]" : "text-red-700"
          }`}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {job && job.pages.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {job.pages.map((page) => (
            <li
              key={page.id ?? page.output}
              className={`flex items-start justify-between gap-3 text-xs ${
                northStar ? "text-[#17130E]" : "text-slate-800"
              }`}
            >
              <span className="min-w-0">
                <span className="font-medium">{page.label}</span>
                <span
                  className={`ml-1 ${
                    northStar ? "text-[#6B6255]" : "text-slate-500"
                  }`}
                >
                  {page.route}
                </span>
              </span>
              <span
                className={`shrink-0 ${
                  page.notes === "Capturing…"
                    ? northStar
                      ? "text-[#8A6324]"
                      : "text-amber-800"
                    : page.ok
                      ? northStar
                        ? "text-[#2F6B3A]"
                        : "text-emerald-700"
                      : northStar
                        ? "text-[#9B2C2C]"
                        : "text-red-700"
                }`}
              >
                {page.notes === "Capturing…"
                  ? "…"
                  : page.ok
                    ? "OK"
                    : "Failed"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {job &&
      (job.status === "succeeded" || job.status === "failed") &&
      job.successCount != null &&
      job.totalCount != null ? (
        <p
          className={`mt-3 text-xs font-medium ${
            job.status === "succeeded"
              ? northStar
                ? "text-[#2F6B3A]"
                : "text-emerald-700"
              : northStar
                ? "text-[#9B2C2C]"
                : "text-red-700"
          }`}
        >
          Summary: {job.successCount}/{job.totalCount} pages captured
          successfully
          {job.status === "failed" && job.successCount > 0
            ? " (partial run)"
            : ""}
          .
        </p>
      ) : null}
    </div>
  );
}
