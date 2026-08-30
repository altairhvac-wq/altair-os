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
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";

type DemoDataSectionProps = {
  companyId: string;
  status: DemoDataStatus;
  variant?: "dashboard" | "settings";
  northStar?: boolean;
};

export function DemoDataSection({
  companyId,
  status: initialStatus,
  variant = "settings",
  northStar = false,
}: DemoDataSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmSeedOpen, setConfirmSeedOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const timeZone = useCompanyTimezone();

  useEffect(() => {
    const timeout = window.setTimeout(() => setStatus(initialStatus), 0);
    return () => window.clearTimeout(timeout);
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

  // Sample Data lives in Workspace Settings only.
  if (variant === "dashboard") {
    return null;
  }

  const title = "Sample Data";
  const isSettingsCompact = variant === "settings";

  return (
    <section
      id="sample-data"
      aria-label="Sample Data"
      className={
        northStar
          ? "min-w-0 max-w-full overflow-x-clip rounded-[1rem] border border-[rgba(119,89,27,0.12)] bg-[#FBF7EF]"
          : "admin-card min-w-0 max-w-full overflow-x-clip"
      }
    >
      <div
        className={`flex items-start gap-2.5 border-b ${
          northStar
            ? "border-[rgba(119,89,27,0.12)] bg-[#F5F0E4]"
            : "border-slate-100 bg-gradient-to-r from-violet-50/80 to-white"
        } ${
          isSettingsCompact ? "px-3 py-3 sm:px-4" : "px-4 py-4 sm:px-6"
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg ${
            northStar
              ? "bg-[#EFE4CB] text-[#77591B] ring-1 ring-[rgba(119,89,27,0.12)]"
              : "bg-violet-100 text-violet-700"
          } ${
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
          <h2
            className={`font-black tracking-tight ${
              northStar ? "text-[#17130E]" : "text-slate-900"
            } ${
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
              Load realistic demo customers, jobs, estimates, invoices, and
              related records into this workspace for testing. Demo data can be
              removed later without affecting your real customer records.
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
              company only. Clearing demo data does not affect your real customer
              records.
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
                ? `Loaded ${formatDateTimeInTimeZone(status.seededAt, timeZone)}.`
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
