"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { stopClockAction } from "@/app/actions/time-entries";
import {
  formatActionError,
  formatConnectionCatchError,
} from "@/shared/lib/operational-errors";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";

type CompleteWorkClockOutPromptProps = {
  onClose: () => void;
  onStayClockedIn: () => void;
};

const TITLE_ID = "complete-work-clock-out-title";

export function CompleteWorkClockOutPrompt({
  onClose,
  onStayClockedIn,
}: CompleteWorkClockOutPromptProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClockOut() {
    if (isPending) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await stopClockAction();
        if (result.error) {
          setError(
            formatActionError(
              result.error,
              "Could not clock out. Your shift clock is still running.",
            ),
          );
          return;
        }
        onClose();
      } catch {
        setError(
          formatConnectionCatchError(
            "Could not clock out. Check your connection; your shift clock is still running.",
          ),
        );
      }
    });
  }

  return (
    <MobileSheet
      onClose={onStayClockedIn}
      closeDisabled={isPending}
      ariaLabelledBy={TITLE_ID}
      variant="responsive"
      zIndex={60}
    >
      <MobileSheetPanel maxWidth="md" responsiveRounded>
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Clock out for the day?"
          subtitle="Your shift clock is still running. Clock out now or stay on the clock for your next job."
          onClose={onStayClockedIn}
          closeDisabled={isPending}
          icon={
            <MobileSheetHeaderIcon className="bg-slate-100 ring-1 ring-slate-300/40">
              <LogOut className="h-5 w-5 text-slate-700" />
            </MobileSheetHeaderIcon>
          }
        />

        <MobileSheetBody className="space-y-3">
          <p className="text-sm text-slate-600">
            Job labor for this visit has been saved. Payroll time stays open
            until you clock out.
          </p>
          {error ? (
            <p
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}
        </MobileSheetBody>

        <MobileSheetFooter>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={isPending}
              onClick={onStayClockedIn}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Stay clocked in
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleClockOut}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {isPending ? "Clocking out…" : "Clock out"}
            </button>
          </div>
        </MobileSheetFooter>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
