import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  getFounderCaptureJob,
  startFounderScreenshotCaptureJob,
  type FounderCaptureJob,
} from "@/lib/dev/founder-screenshot-capture-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BASE_URL = "http://localhost:3000";

function notAvailable() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function assertLocalDevAccess() {
  return process.env.NODE_ENV === "development";
}

function serializeJob(job: FounderCaptureJob) {
  return {
    id: job.id,
    baseUrl: job.baseUrl,
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    message: job.message,
    logs: job.logs,
    pages: job.pages,
    successCount: job.successCount,
    totalCount: job.totalCount,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
  };
}

function normalizeBaseUrl(raw: unknown): { baseUrl?: string; error?: string } {
  const value =
    typeof raw === "string" && raw.trim()
      ? raw.trim()
      : DEFAULT_BASE_URL;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { error: "Enter a valid absolute URL (http or https)." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "BASE_URL must use http or https." };
  }

  // Strip trailing slash so script route joins stay clean.
  const normalized = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") ||
    parsed.origin;

  return { baseUrl: normalized };
}

async function requireDevPlatformAdmin() {
  if (!assertLocalDevAccess()) {
    return { response: notAvailable() as NextResponse };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { response: unauthorized() as NextResponse };
  }

  if (!canAccessPlatformAdmin(user)) {
    return { response: forbidden() as NextResponse };
  }

  return { user };
}

export async function GET(request: Request) {
  const access = await requireDevPlatformAdmin();
  if ("response" in access && access.response) {
    return access.response;
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json(
      { error: "jobId query parameter is required." },
      { status: 400 },
    );
  }

  const job = getFounderCaptureJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Capture job not found." }, { status: 404 });
  }

  return NextResponse.json({ job: serializeJob(job) });
}

export async function POST(request: Request) {
  const access = await requireDevPlatformAdmin();
  if ("response" in access && access.response) {
    return access.response;
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const baseUrlInput =
    body && typeof body === "object" && "baseUrl" in body
      ? (body as { baseUrl?: unknown }).baseUrl
      : undefined;

  const normalized = normalizeBaseUrl(baseUrlInput);
  if (normalized.error || !normalized.baseUrl) {
    return NextResponse.json(
      { error: normalized.error ?? "Invalid BASE_URL." },
      { status: 400 },
    );
  }

  try {
    const job = startFounderScreenshotCaptureJob(normalized.baseUrl);
    return NextResponse.json({ job: serializeJob(job) }, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start capture.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
