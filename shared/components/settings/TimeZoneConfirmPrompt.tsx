"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { updateCompanyTimezoneAction } from "@/app/actions/company-settings";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { fieldLabelClass, fieldSelectClass } from "@/shared/design-system/components/field-styles";
import { companyTimeZoneLabel, getCompanyTimezoneSelectOptions } from "@/shared/lib/company-timezones";
import { useBrowserTimeZone } from "@/shared/lib/use-browser-time-zone";

/**
 * "Confirm your time zone": shown to an owner or admin of a company nobody
 * has chosen a time zone for.
 *
 * ============ WHY IT EXISTS ============
 * Until migration 220 the product could not tell a company that picked
 * Eastern time from one that had never picked anything, and ran both on
 * Mountain time. The data cannot say which is which, so nothing was guessed:
 * those companies keep running on the zone they were running on, and this
 * asks. The list opens on the zone this browser is in; pressing the button
 * is the choice, and from then on the product uses it exactly.
 *
 * ============ WHERE ============
 * On the dashboard, where "Not now" puts it away for this browser, and on
 * Settings > Company, where it stays until answered. The page decides
 * whether to render it at all (owner or admin, zone not chosen, migration
 * 220 in); the action checks the same again before saving.
 */

type TimeZoneConfirmPromptProps = {
  readonly companyId: string;
  /** The zone the company runs on now (already resolved). */
  readonly currentTimeZone: string;
  /** Whether "Not now" is offered. Off on Settings > Company. */
  readonly dismissible?: boolean;
  readonly className?: string;
};

const DISMISSED_KEY_PREFIX = "altair:timezone-confirm-dismissed:";
const DISMISS_EVENT = "altair:timezone-confirm-dismissed";

function subscribeToDismissal(onChange: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DISMISS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * "shown" or "dismissed" once the browser has been asked; null on the server
 * and until then, so the card is never drawn and then pulled away.
 */
function useDismissal(companyId: string): "shown" | "dismissed" | null {
  return useSyncExternalStore(
    subscribeToDismissal,
    () => {
      try {
        return window.localStorage.getItem(DISMISSED_KEY_PREFIX + companyId) ? "dismissed" : "shown";
      } catch {
        // Storage is blocked: the card is shown, and "Not now" lasts for this visit.
        return "shown";
      }
    },
    () => null,
  );
}

export function TimeZoneConfirmPrompt({ companyId, currentTimeZone, dismissible = true, className = "" }: TimeZoneConfirmPromptProps) {
  const router = useRouter();
  const selectId = useId();
  const problemId = useId();
  const browserZone = useBrowserTimeZone();
  const dismissal = useDismissal(companyId);
  const [picked, setPicked] = useState<string | null>(null);
  const [hiddenNow, setHiddenNow] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // What the owner picked, else where this browser is, else what the company runs on.
  const zone = picked ?? browserZone ?? currentTimeZone;
  // The suggested zone and the current one both stay on the list, whatever is picked.
  const options = useMemo(() => getCompanyTimezoneSelectOptions(browserZone, currentTimeZone, zone), [browserZone, currentTimeZone, zone]);

  if (hiddenNow) return null;
  if (dismissible && dismissal !== "shown") return null;

  function confirm() {
    if (isPending) return;
    setProblem(null);
    startTransition(async () => {
      try {
        const result = await updateCompanyTimezoneAction(zone, companyId);
        if (result.error || !result.timezone) {
          setProblem(result.error ?? "That did not save. Try again.");
          return;
        }
        // The server now has the choice: every page is drawn again in it, and
        // this card is no longer sent.
        router.refresh();
      } catch {
        setProblem("That did not save. Check your connection and try again.");
      }
    });
  }

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY_PREFIX + companyId, new Date().toISOString());
      window.dispatchEvent(new Event(DISMISS_EVENT));
    } catch {
      // Storage is blocked: put it away for this visit only.
    }
    setHiddenNow(true);
  }

  return (
    <section aria-label="Confirm your time zone" className={`rounded-2xl border border-[rgba(180,120,20,0.3)] bg-[rgba(255,248,230,0.95)] p-4 ${className}`}>
      <h2 className="text-[15px] font-bold tracking-tight text-[#2b1f06]">Confirm your time zone</h2>
      <p className="mt-0.5 text-[13px] leading-relaxed text-[#4a3408]">
        Your schedule, reminders and invoice due dates are running on {companyTimeZoneLabel(currentTimeZone)}. Pick the time zone your shop is in and confirm it, so every time you see is the right one.
        {dismissible ? " You can also change it later in Settings, under Company." : null}
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 sm:w-72">
          <label htmlFor={selectId} className={fieldLabelClass}>
            Time zone
          </label>
          <select
            id={selectId}
            name="confirmTimeZone"
            value={zone}
            aria-describedby={problem ? problemId : undefined}
            onChange={(event) => {
              if (isPending) return;
              setPicked(event.target.value);
              setProblem(null);
            }}
            className={`${fieldSelectClass} mt-1`}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={isPending} onClick={confirm} className={buttonClassName("primary", "md")}>
            {isPending ? "Saving…" : `Use ${companyTimeZoneLabel(zone)}`}
          </button>
          {dismissible ? (
            <button type="button" disabled={isPending} onClick={dismiss} className={buttonClassName("secondary", "md")}>
              Not now
            </button>
          ) : null}
        </div>
      </div>
      {problem ? (
        <p id={problemId} role="alert" className="mt-2 text-[13px] font-medium text-[#991B1B]">
          {problem}
        </p>
      ) : null}
    </section>
  );
}
