"use client";

import { useState, useTransition } from "react";
import { updateCompanyTimezoneAction } from "@/app/actions/company-settings";
import { Button } from "@/shared/design-system/components/Button";
import {
  fieldLabelClass,
  fieldSelectClass,
} from "@/shared/design-system/components/field-styles";
import { getCompanyTimezoneSelectOptions } from "@/shared/lib/company-timezones";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

type CompanyTimezoneFormProps = {
  initialTimezone: string;
  canManage: boolean;
};

export function CompanyTimezoneForm({
  initialTimezone,
  canManage,
}: CompanyTimezoneFormProps) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const timezoneOptions = getCompanyTimezoneSelectOptions(timezone);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || isPending) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await updateCompanyTimezoneAction(timezone);
      if (result.error || !result.timezone) {
        setFeedback({
          tone: "error",
          message: result.error ?? "Failed to save timezone.",
        });
        return;
      }

      setTimezone(result.timezone);
      setFeedback({
        tone: "success",
        message: "Timezone saved.",
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isPending}>
      {feedback ? (
        <SettingsAlertBanner tone={feedback.tone}>
          {feedback.message}
        </SettingsAlertBanner>
      ) : null}

      <label className="block max-w-md space-y-1.5">
        <span className={fieldLabelClass}>Company timezone</span>
        <select
          name="timezone"
          required
          disabled={!canManage || isPending}
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className={fieldSelectClass}
        >
          {timezoneOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="block text-xs leading-5 text-altair-ink-secondary">
          Used for schedules, reports, invoices, and day boundaries across the
          workspace.
        </span>
      </label>

      {canManage ? (
        <Button type="submit" loading={isPending}>
          Save timezone
        </Button>
      ) : (
        <p className="text-sm text-altair-ink-muted">
          Only owners and admins can change company timezone.
        </p>
      )}
    </form>
  );
}
