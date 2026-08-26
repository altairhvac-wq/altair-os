"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/shared/design-system/components";

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
      {/*
        The digest only — never error.message or the stack. The digest is the
        server-generated identifier that correlates this screen with the record
        in the error monitor, so it is exactly what support needs and carries
        none of the query fragments, ids or customer data a message can.
        app/error.tsx already shows it; showing it here too means a user can
        quote a reference wherever they hit a failure.
      */}
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-slate-400">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          onClick={reset}
        >
          Try again
        </Button>
        <Button
          href={backHref}
          variant="secondary"
        >
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
