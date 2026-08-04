"use client";

import Link from "next/link";
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isPending}>
      {feedback ? (
        <SettingsAlertBanner tone={feedback.tone}>
          {feedback.message}
        </SettingsAlertBanner>
      ) : null}

      <dl className="grid gap-1 border-b border-altair-border pb-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-6">
        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-altair-ink-muted">
          Status
        </dt>
        <dd className="text-sm font-medium text-altair-ink">
          {formatCompanyStatus(initialProfile.status)}
        </dd>
      </dl>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
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

        <label className="block space-y-1.5">
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

        <label className="block space-y-1.5">
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

        <label className="block space-y-1.5">
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

        <label className="block space-y-1.5">
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
      </div>

      <div className="space-y-4 border-t border-altair-border pt-4">
        <p className="text-sm font-semibold text-altair-ink">Address</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
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

          <label className="block space-y-1.5 sm:col-span-2">
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

          <label className="block space-y-1.5">
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

          <label className="block space-y-1.5">
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

          <label className="block space-y-1.5">
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

          <label className="block space-y-1.5">
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
      </div>

      <div className="flex flex-col gap-3 border-t border-altair-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-altair-ink-secondary">
          Tax rate, payment terms, and document notes live under{" "}
          <Link
            href="/settings/documents"
            className="font-medium text-altair-ink underline-offset-2 hover:underline"
          >
            Documents
          </Link>
          .
        </p>
        {canManage ? (
          <Button type="submit" loading={isPending} className="shrink-0">
            Save company profile
          </Button>
        ) : (
          <p className="text-sm text-altair-ink-muted">
            Only owners and admins can edit company profile.
          </p>
        )}
      </div>
    </form>
  );
}
