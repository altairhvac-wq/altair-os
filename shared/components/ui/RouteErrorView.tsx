"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

type RouteErrorViewProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  logLabel: string;
};

export function RouteErrorView({
  error,
  reset,
  title,
  description,
  backHref,
  backLabel,
  logLabel,
}: RouteErrorViewProps) {
  useEffect(() => {
    console.error(`[${logLabel}]`, error);
  }, [error, logLabel]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertCircle className="h-7 w-7 text-red-500" />
      </div>
      <h1 className="mt-5 text-lg font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          Try again
        </button>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
