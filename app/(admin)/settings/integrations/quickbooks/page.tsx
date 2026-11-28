import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountingConnection } from "@/lib/accounting/connection";
import { isQuickBooksConfigured } from "@/lib/accounting/quickbooks/env";
import { loadQuickBooksSetupOptions, type QuickBooksSetupOptions } from "@/lib/accounting/setup";
import { canManageIntegrations } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { SettingsWorkspacePage } from "@/shared/components/settings/SettingsWorkspacePage";
import { QuickBooksSetupForm } from "@/shared/components/settings/integrations/QuickBooksSetupForm";

/**
 * Finish connecting QuickBooks (design screen 2).
 *
 * Reached from the Intuit sign-in. Owner or admin only, and only while the
 * connection is waiting for setup; anything else goes back to Integrations.
 * The account lists are read from the company's own QuickBooks, and the
 * action checks the answers against them again.
 */

export const metadata: Metadata = { title: "Finish connecting QuickBooks" };
export const dynamic = "force-dynamic";

export default async function QuickBooksSetupPage() {
  const context = await getActiveCompanyContext();
  if (!context || !canManageIntegrations(context) || !isQuickBooksConfigured()) {
    redirect("/settings/integrations");
  }
  const connection = await getAccountingConnection(context.company.id);
  if (!connection || connection.status !== "setup") {
    redirect("/settings/integrations");
  }

  let options: QuickBooksSetupOptions | null = null;
  try {
    options = await loadQuickBooksSetupOptions(connection);
  } catch {
    options = null;
  }

  return (
    <SettingsWorkspacePage
      title="Finish connecting QuickBooks"
      description={`Connected to ${connection.external_company_name ?? "your QuickBooks company"}. Nothing has been sent yet. Answer three questions, then start.`}
    >
      {options ? (
        options.incomeAccounts.length === 0 ? (
          <SettingsAlertBanner tone="error">
            Your QuickBooks has no income account Altair can use. Add one in QuickBooks (Settings &gt; Chart of accounts), then reload this page.
          </SettingsAlertBanner>
        ) : (
          <QuickBooksSetupForm options={options} taxMode={connection.tax_mode ?? "none"} />
        )
      ) : (
        <SettingsAlertBanner tone="error">
          QuickBooks did not answer. Reload this page in a minute. Nothing has been sent.
        </SettingsAlertBanner>
      )}
    </SettingsWorkspacePage>
  );
}
