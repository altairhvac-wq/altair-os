"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { completeQuickBooksSetupAction, disconnectQuickBooksAction } from "@/app/actions/quickbooks";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import {
  fieldDescriptionClass,
  fieldLabelClass,
  fieldRadioClass,
  fieldSelectClass,
} from "@/shared/design-system/components/field-styles";

/**
 * The three setup questions (design screen 2). The page passes the choices
 * read from the company's own QuickBooks; the action checks the answers
 * against QuickBooks again before anything is sent.
 */

type Option = { readonly id: string; readonly name: string };

export type QuickBooksSetupFormProps = {
  options: {
    readonly incomeAccounts: readonly Option[];
    readonly depositAccounts: readonly Option[];
    readonly taxCodes: readonly Option[];
    readonly suggestedIncomeAccountId: string | null;
    readonly openInvoiceCount: number;
  };
  taxMode: "automated" | "manual" | "none";
};

export function QuickBooksSetupForm({ options, taxMode }: QuickBooksSetupFormProps) {
  const router = useRouter();
  const ids = { income: useId(), deposit: useId(), tax: useId() };
  const [startMode, setStartMode] = useState<"from_today_with_open" | "from_today">(
    options.openInvoiceCount > 0 ? "from_today_with_open" : "from_today",
  );
  const [incomeAccountId, setIncomeAccountId] = useState(options.suggestedIncomeAccountId ?? options.incomeAccounts[0]?.id ?? "");
  const [depositAccountId, setDepositAccountId] = useState(options.depositAccounts[0]?.id ?? "");
  const [taxCodeId, setTaxCodeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completeQuickBooksSetupAction({
        startMode,
        incomeAccountId,
        depositAccountId,
        taxCodeId: taxMode === "manual" ? taxCodeId : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/settings/integrations");
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      await disconnectQuickBooksAction();
      router.push("/settings/integrations");
      router.refresh();
    });
  }

  const openLabel =
    options.openInvoiceCount === 1 ? "the 1 open invoice" : `the ${options.openInvoiceCount} open invoices`;

  return (
    <form onSubmit={submit} className="min-w-0 rounded-2xl border border-altair-border bg-altair-paper-elevated p-4 sm:p-5" data-testid="quickbooks-setup-form">
      <fieldset className="min-w-0">
        <legend className={fieldLabelClass}>1. Where should Altair start?</legend>
        <div className="mt-1.5 space-y-2">
          {options.openInvoiceCount > 0 ? (
            <label className={`flex max-w-xl cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 ${startMode === "from_today_with_open" ? "border-altair-ink" : "border-altair-border"}`}>
              <input type="radio" name="startMode" className={`${fieldRadioClass} mt-0.5`} checked={startMode === "from_today_with_open"} onChange={() => setStartMode("from_today_with_open")} />
              <span>
                <span className="block text-sm font-semibold text-altair-ink">From today, plus invoices still unpaid</span>
                <span className="block text-xs leading-5 text-altair-ink-secondary">
                  Sends today&apos;s work and {openLabel}, with any payments on them, so QuickBooks knows who owes you. Paid history stays out.
                </span>
              </span>
            </label>
          ) : null}
          <label className={`flex max-w-xl cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 ${startMode === "from_today" ? "border-altair-ink" : "border-altair-border"}`}>
            <input type="radio" name="startMode" className={`${fieldRadioClass} mt-0.5`} checked={startMode === "from_today"} onChange={() => setStartMode("from_today")} />
            <span>
              <span className="block text-sm font-semibold text-altair-ink">From today only</span>
              <span className="block text-xs leading-5 text-altair-ink-secondary">
                {options.openInvoiceCount > 0
                  ? "Use this if your bookkeeper already entered your open invoices in QuickBooks."
                  : "You have no unpaid invoices, so this is the only choice needed."}
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor={ids.income} className={fieldLabelClass}>
          2. Which income account should your work count toward?
        </label>
        <p className={fieldDescriptionClass}>From your QuickBooks chart of accounts. Every price book item goes here.</p>
        <select id={ids.income} className={`${fieldSelectClass} mt-1.5 max-w-md`} value={incomeAccountId} onChange={(event) => setIncomeAccountId(event.target.value)} required>
          {options.incomeAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label htmlFor={ids.deposit} className={fieldLabelClass}>
          3. Where should payments land?
        </label>
        <p className={fieldDescriptionClass}>
          Card payouts reach your bank as one deposit for several payments. Undeposited Funds lets QuickBooks match that one deposit, so the money is not counted twice.
        </p>
        <select id={ids.deposit} className={`${fieldSelectClass} mt-1.5 max-w-md`} value={depositAccountId} onChange={(event) => setDepositAccountId(event.target.value)}>
          {options.depositAccounts.map((account) => (
            <option key={account.id || "undeposited"} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      {taxMode === "manual" ? (
        <div className="mt-5">
          <label htmlFor={ids.tax} className={fieldLabelClass}>
            Which sales tax rate do your invoices use in QuickBooks?
          </label>
          <p className={fieldDescriptionClass}>Your QuickBooks keeps its own tax rates. Altair puts this one on every taxable invoice it sends.</p>
          <select id={ids.tax} className={`${fieldSelectClass} mt-1.5 max-w-md`} value={taxCodeId} onChange={(event) => setTaxCodeId(event.target.value)} required>
            <option value="">Choose a rate</option>
            {options.taxCodes.map((code) => (
              <option key={code.id} value={code.id}>
                {code.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        {taxMode === "automated" ? (
          <SettingsAlertBanner tone="success">
            <b>Sales tax:</b> your QuickBooks works out sales tax on its own. Altair sends the tax on each invoice and checks that QuickBooks got the same total. If it differs, the invoice shows under &quot;Needs attention&quot; instead of being changed quietly.
          </SettingsAlertBanner>
        ) : null}
        {taxMode === "none" ? (
          <SettingsAlertBanner tone="warning">
            <b>Sales tax is off in your QuickBooks.</b> Invoices without tax go through as they are. An invoice with tax will be listed under &quot;Needs attention&quot; until sales tax is turned on in QuickBooks.
          </SettingsAlertBanner>
        ) : null}
        <SettingsAlertBanner tone="warning">
          <b>One setting to check in QuickBooks:</b> if it is set to email invoices it receives from other apps, your customers get a second email for every invoice. In QuickBooks, look under Settings &gt; Account and settings &gt; Sales and make sure invoices from apps are not sent automatically.
        </SettingsAlertBanner>
      </div>

      {error ? (
        <SettingsAlertBanner tone="error" className="mt-3">
          {error}
        </SettingsAlertBanner>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending || !incomeAccountId} className={buttonClassName("primary", "md")}>
          {pending ? "Starting…" : "Start sending"}
        </button>
        <button type="button" disabled={pending} onClick={cancel} className={buttonClassName("quiet", "md")}>
          Cancel and disconnect
        </button>
      </div>
    </form>
  );
}
