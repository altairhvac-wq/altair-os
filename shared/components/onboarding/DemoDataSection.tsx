"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Database, Loader2, Sparkles, Trash2 } from "lucide-react";
import {
  clearDemoDataAction,
  seedDemoDataAction,
} from "@/app/actions/demo-data";
import type { DemoDataStatus } from "@/shared/types/demo-data";

type DemoDataSectionProps = {
  status: DemoDataStatus;
  variant?: "dashboard" | "settings";
};

export function DemoDataSection({
  status,
  variant = "dashboard",
}: DemoDataSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmSeedOpen, setConfirmSeedOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const showSeedCard = status.isEligibleForSeed && !status.hasDemoData;
  const showLoadedCard = status.hasDemoData;

  if (!showSeedCard && !showLoadedCard) {
    return null;
  }

  function handleSeed() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await seedDemoDataAction();

      if (result.error) {
        setError(result.error);
        setConfirmSeedOpen(false);
        return;
      }

      setConfirmSeedOpen(false);
      setSuccessMessage("Demo data loaded. You can delete or reset it later.");
      router.refresh();
    });
  }

  function handleClear() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await clearDemoDataAction();

      if (result.error) {
        setError(result.error);
        setConfirmClearOpen(false);
        return;
      }

      setConfirmClearOpen(false);
      setSuccessMessage("Demo data cleared.");
      router.refresh();
    });
  }

  const title =
    variant === "settings" ? "Sample workspace data" : "Explore with sample data";

  return (
    <section className="admin-card min-w-0 max-w-full overflow-x-clip">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white px-4 py-4 sm:px-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          {showLoadedCard ? (
            <Database className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600/90">
            Demo company
          </p>
          <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h2>
          {showSeedCard ? (
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Want to explore Altair faster? Load realistic HVAC sample customers,
              jobs, estimates, invoices, and time entries into this workspace.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Demo data is loaded for evaluation. Records are tagged{" "}
              <span className="font-semibold">[Demo]</span> and stay scoped to this
              company only.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-6">
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
                Load demo data into this workspace?
              </p>
              <p className="mt-1 text-sm text-slate-600">
                This adds sample customers, jobs, billing documents, dispatch
                assignments, and time entries. It only works once on an empty
                workspace and does not modify other companies.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSeed}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Confirm load demo data
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
              disabled={isPending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60 sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              Load demo data
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
                  This deletes every record tagged as demo in this company. Your
                  real data is not affected.
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
