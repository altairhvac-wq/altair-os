"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

type JobDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function JobDetailError({ error, reset }: JobDetailErrorProps) {
  useEffect(() => {
    console.error("[JobDetailPage]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertCircle className="h-7 w-7 text-red-500" />
      </div>
      <h1 className="mt-5 text-lg font-bold text-slate-900">Could not load job</h1>
      <p className="mt-2 text-sm text-slate-500">
        Something went wrong while fetching this job. Please try again.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          Try again
        </button>
        <Link
          href="/jobs"
          className="inline-flex rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to jobs
        </Link>
      </div>
    </div>
  );
}
