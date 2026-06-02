"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Database, Loader2, Sparkles, Trash2 } from "lucide-react";
import {
  clearDemoDataAction,
  getDemoDataStatusAction,
  seedDemoDataAction,
} from "@/app/actions/demo-data";
import type { DemoDataStatus } from "@/shared/types/demo-data";

type DemoDataSectionProps = {
  companyId: string;
  status: DemoDataStatus;
  variant?: "dashboard" | "settings";
};

export function DemoDataSection({
  companyId,
  status: initialStatus,
  variant = "dashboard",
}: DemoDataSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmSeedOpen, setConfirmSeedOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const showSeedCard = !status.hasDemoData;
  const showLoadedCard = status.hasDemoData;
  const canSeed = status.canSetupDemoData;

  async function refreshDemoDataStatus() {
    const nextStatus = await getDemoDataStatusAction(companyId);
    if (!("error" in nextStatus)) {
      setStatus(nextStatus);
    }
    router.refresh();
  }

  if (
    variant === "dashboard" &&
    !showLoadedCard &&
    !(showSeedCard && canSeed)
  ) {
    return null;
  }

  function handleSeed() {
    if (!canSeed) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await seedDemoDataAction(companyId);

      if (result.error) {
        setError(result.error);
        setConfirmSeedOpen(false);
        return;
      }

      setConfirmSeedOpen(false);
      setSuccessMessage("Demo data loaded. You can delete or reset it later.");
      await refreshDemoDataStatus();
    });
  }

  function handleClear() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await clearDemoDataAction(companyId);

      if (result.error) {
        setError(result.error);
        setConfirmClearOpen(false);
        return;
      }

      setConfirmClearOpen(false);
      setSuccessMessage("Demo data cleared.");
      await refreshDemoDataStatus();
    });
  }

  const title =
    variant === "settings" ? "Sample workspace data" : "Explore with sample data";
  const isDashboardCompact = variant === "dashboard";

  if (isDashboardCompact && showLoadedCard) {
    return (
      <section
        aria-label="Demo data active"
        className="min-w-0 max-w-full overflow-x-clip rounded-lg border border-violet-200/70 bg-violet-50/40 px-2.5 py-2"
      >
        <div className="flex min-w-0 items-start gap-2">
          <Database
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700/90">
                  Demo mode
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-700">
                  Sample records are active
                  {status.seededAt
                    ? ` · loaded ${new Date(status.seededAt).toLocaleDateString()}`
                    : ""}
                  . Tagged{" "}
                  <span className="font-semibold text-slate-800">[Demo]</span>.
                </p>
              </div>
              {confirmClearOpen ? null : (
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  disabled={isPending}
                  className="shrink-0 rounded-md border border-violet-200/80 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-violet-50/80 disabled:opacity-60"
                >
                  Clear
                </button>
              )}
            </div>

            {successMessage ? (
              <p className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                {successMessage}
              </p>
            ) : null}

            {error ? (
              <p className="mt-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
                {error}
              </p>
            ) : null}

            {confirmClearOpen ? (
              <div className="mt-2 rounded-md border border-red-200/80 bg-white px-2.5 py-2">
                <p className="text-xs font-semibold text-slate-900">
                  Remove all demo data?
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Removes demo-scoped records and anything attached to them. Your
                  own records stay.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isPending}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    )}
                    Confirm clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    disabled={isPending}
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (isDashboardCompact && showSeedCard && canSeed) {
    return (
      <section
        aria-label="Load demo data"
        className="min-w-0 max-w-full overflow-x-clip rounded-lg border border-slate-200/80 bg-white px-2.5 py-2"
      >
        <div className="flex min-w-0 items-start gap-2">
          <Sparkles
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Try sample data
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Demo data can be added to your workspace and removed later without
              affecting your own records.
            </p>

            {successMessage ? (
              <p className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                {successMessage}
              </p>
            ) : null}

            {error ? (
              <p className="mt-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
                {error}
              </p>
            ) : null}

            {confirmSeedOpen ? (
              <div className="mt-2 rounded-md border border-violet-200/80 bg-violet-50/40 px-2.5 py-2">
                <p className="text-xs font-semibold text-slate-900">
                  Load demo data into this workspace?
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Adds sample records alongside your existing data. Safe for evaluation only.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleSeed}
                    disabled={isPending}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : null}
                    Confirm load
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSeedOpen(false)}
                    disabled={isPending}
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSeedOpen(true)}
                disabled={isPending}
                className="mt-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-violet-200 bg-violet-50/60 px-2.5 py-1.5 text-[11px] font-semibold text-violet-800 transition hover:bg-violet-100/70 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                )}
                Set up demo data
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const isSettingsCompact = variant === "settings";

  return (
    <section className="admin-card min-w-0 max-w-full overflow-x-clip">
      <div
        className={`flex items-start gap-2.5 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white ${
          isSettingsCompact ? "px-3 py-3 sm:px-4" : "px-4 py-4 sm:px-6"
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 ${
            isSettingsCompact ? "h-9 w-9" : "h-11 w-11 rounded-xl"
          }`}
        >
          {showLoadedCard ? (
            <Database className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600/90">
            Demo company
          </p>
          <h2
            className={`font-black tracking-tight text-slate-900 ${
              isSettingsCompact
                ? "text-sm sm:text-base"
                : "text-base sm:text-lg"
            }`}
          >
            {title}
          </h2>
          {showSeedCard ? (
            <p
              className={`text-slate-600 ${
                isSettingsCompact
                  ? "mt-0.5 text-xs leading-snug"
                  : "mt-1 text-xs sm:text-sm"
              }`}
            >
              Demo data can be added to your workspace and removed later without
              affecting your own records.
            </p>
          ) : (
            <p
              className={`text-slate-600 ${
                isSettingsCompact
                  ? "mt-0.5 text-xs leading-snug"
                  : "mt-1 text-xs sm:text-sm"
              }`}
            >
              Demo data is loaded for evaluation. Records are tagged{" "}
              <span className="font-semibold">[Demo]</span> and stay scoped to this
              company only.
            </p>
          )}
        </div>
      </div>

      <div
        className={`space-y-2.5 ${
          isSettingsCompact ? "px-3 py-3 sm:px-4" : "space-y-3 px-4 py-4 sm:px-6"
        }`}
      >
        {successMessage ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {showSeedCard ? (
          confirmSeedOpen ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Set up demo data in this workspace?
              </p>
              <p className="mt-1 text-sm text-slate-600">
                This adds sample customers, jobs, billing documents, dispatch
                assignments, and time entries alongside your existing records.
                Demo customer emails use your account address so estimate,
                invoice, and payment test emails stay safe. Clear demo data later
                removes only demo-scoped records.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSeed}
                  disabled={isPending || !canSeed}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Confirm set up demo data
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSeedOpen(false)}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSeedOpen(true)}
              disabled={isPending || !canSeed}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60 sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              Set up demo data
            </button>
          )
        ) : null}

        {showLoadedCard ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {status.seededAt
                ? `Loaded ${new Date(status.seededAt).toLocaleString()}.`
                : "Demo records are active in this workspace."}
            </p>
            {confirmClearOpen ? (
              <div className="w-full rounded-xl border border-red-200 bg-red-50/60 p-4 sm:max-w-md">
                <p className="text-sm font-semibold text-slate-900">
                  Remove all demo data?
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Removes demo-scoped records and anything attached to demo
                  customers or jobs. Your own records are not affected.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isPending}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    Confirm clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    disabled={isPending}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear demo data
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
