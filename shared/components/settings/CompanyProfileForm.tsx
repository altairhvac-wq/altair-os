"use client";

import { useState, useTransition } from "react";
import { updateCompanyProfileAction } from "@/app/actions/company-settings";
import { Button } from "@/shared/design-system/components/Button";
import {
  fieldControlClass,
  fieldLabelClass,
  fieldSelectClass,
} from "@/shared/design-system/components/field-styles";
import {
  companyProfileToFormValues,
  type CompanyProfileEditableFields,
  type CompanyProfileFormValues,
} from "@/shared/lib/company-profile";
import { getCompanyTimezoneSelectOptions } from "@/shared/lib/company-timezones";
import { TRADE_OPTIONS } from "@/shared/lib/trades/trade-options";
import { formatCompanyStatus } from "@/shared/types/team-member";
import { SettingsAlertBanner } from "./SettingsAlertBanner";

type CompanyProfileFormProps = {
  initialProfile: CompanyProfileEditableFields & { status: string };
  canManage: boolean;
};

/** A group heading that takes a whole row of the form grid. */
const GROUP_HEADING_CLASS =
  "col-span-full text-[11px] font-semibold uppercase tracking-[0.1em] text-altair-ink-secondary";

export function CompanyProfileForm({
  initialProfile,
  canManage,
}: CompanyProfileFormProps) {
  const [values, setValues] = useState<CompanyProfileFormValues>(() =>
    companyProfileToFormValues(initialProfile),
  );
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const timezoneOptions = getCompanyTimezoneSelectOptions(values.timezone);

  function updateField<K extends keyof CompanyProfileFormValues>(
    key: K,
    value: CompanyProfileFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || isPending) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await updateCompanyProfileAction({
        name: values.name,
        trade: values.trade || null,
        timezone: values.timezone,
        phone: values.phone,
        email: values.email,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        city: values.city,
        state: values.state,
        postalCode: values.postalCode,
        country: values.country,
      });

      if (result.error || !result.profile) {
        setFeedback({
          tone: "error",
          message: result.error ?? "Failed to save company profile.",
        });
        return;
      }

      setValues(companyProfileToFormValues(result.profile));
      setFeedback({
        tone: "success",
        message: "Company profile saved.",
      });
    });
  }

  /*
   * One 4-column grid on wide screens, in the order a person fills it in,
   * with a small heading over each group: the business, how to reach it,
   * where it is. Each group starts its own row, so a field never shares a
   * row with a field from another group (UI audit 2026-11-12: Phone and
   * Email used to sit beside Address line 1, and Postal code beside a blank
   * half row). The L5 density register in globals.css owns control heights.
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-busy={isPending}>
      {feedback ? (
        <SettingsAlertBanner tone={feedback.tone}>
          {feedback.message}
        </SettingsAlertBanner>
      ) : null}

      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        <p className={GROUP_HEADING_CLASS}>Business</p>
        <label className="block space-y-1 sm:col-span-2">
          <span className={fieldLabelClass}>Company name</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={120}
            disabled={!canManage || isPending}
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={fieldControlClass}
            autoComplete="organization"
          />
        </label>

        <label className="block space-y-1">
          <span className={fieldLabelClass}>Trade</span>
          <select
            name="trade"
            disabled={!canManage || isPending}
            value={values.trade}
            onChange={(event) => updateField("trade", event.target.value)}
            className={fieldSelectClass}
          >
            <option value="">Select a trade</option>
            {TRADE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className={fieldLabelClass}>Timezone</span>
          <select
            name="timezone"
            required
            disabled={!canManage || isPending}
            value={values.timezone}
            onChange={(event) => updateField("timezone", event.target.value)}
            className={fieldSelectClass}
          >
            {timezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <p className={`${GROUP_HEADING_CLASS} mt-1.5`}>Contact</p>
        <label className="block space-y-1">
          <span className={fieldLabelClass}>Phone</span>
          <input
            type="tel"
            name="phone"
            disabled={!canManage || isPending}
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={fieldControlClass}
            autoComplete="tel"
          />
        </label>

        <label className="block space-y-1 xl:col-span-2">
          <span className={fieldLabelClass}>Email</span>
          <input
            type="email"
            name="email"
            disabled={!canManage || isPending}
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={fieldControlClass}
            autoComplete="email"
          />
        </label>

        <p className={`${GROUP_HEADING_CLASS} mt-1.5`}>Address</p>
        <label className="block space-y-1 sm:col-span-2">
          <span className={fieldLabelClass}>Address line 1</span>
          <input
            type="text"
            name="addressLine1"
            disabled={!canManage || isPending}
            value={values.addressLine1}
            onChange={(event) =>
              updateField("addressLine1", event.target.value)
            }
            className={fieldControlClass}
            autoComplete="address-line1"
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className={fieldLabelClass}>Address line 2</span>
          <input
            type="text"
            name="addressLine2"
            disabled={!canManage || isPending}
            value={values.addressLine2}
            onChange={(event) =>
              updateField("addressLine2", event.target.value)
            }
            className={fieldControlClass}
            autoComplete="address-line2"
          />
        </label>

        <label className="block space-y-1">
          <span className={fieldLabelClass}>City</span>
          <input
            type="text"
            name="city"
            disabled={!canManage || isPending}
            value={values.city}
            onChange={(event) => updateField("city", event.target.value)}
            className={fieldControlClass}
            autoComplete="address-level2"
          />
        </label>

        <label className="block space-y-1">
          <span className={fieldLabelClass}>State / province</span>
          <input
            type="text"
            name="state"
            disabled={!canManage || isPending}
            value={values.state}
            onChange={(event) => updateField("state", event.target.value)}
            className={fieldControlClass}
            autoComplete="address-level1"
          />
        </label>

        <label className="block space-y-1">
          <span className={fieldLabelClass}>Postal code</span>
          <input
            type="text"
            name="postalCode"
            disabled={!canManage || isPending}
            value={values.postalCode}
            onChange={(event) =>
              updateField("postalCode", event.target.value)
            }
            className={fieldControlClass}
            autoComplete="postal-code"
          />
        </label>

        <label className="block space-y-1">
          <span className={fieldLabelClass}>Country</span>
          <input
            type="text"
            name="country"
            disabled={!canManage || isPending}
            value={values.country}
            onChange={(event) => updateField("country", event.target.value)}
            className={fieldControlClass}
            autoComplete="country-name"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-altair-border pt-3">
        <p className="text-xs text-altair-ink-secondary">
          Status: {formatCompanyStatus(initialProfile.status)} · Tax, payment
          terms, and notes live in{" "}
          <a
            href="#documents"
            className="font-medium text-altair-ink underline-offset-2 hover:underline"
          >
            Document defaults
          </a>{" "}
          below.
        </p>
        {canManage ? (
          <Button type="submit" loading={isPending} className="shrink-0">
            Save company profile
          </Button>
        ) : (
          <p className="text-xs text-altair-ink-muted">
            Only owners and admins can edit company profile.
          </p>
        )}
      </div>
    </form>
  );
}
