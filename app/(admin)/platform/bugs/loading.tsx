import { Bug } from "lucide-react";

export default function PlatformBugReportsLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <h1 className="text-xl font-black tracking-tight text-slate-900">Bug Reports</h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">Loading bug reports…</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
