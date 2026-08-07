import Link from "next/link";
import type { ComponentProps } from "react";
import { CreditCard, Megaphone } from "lucide-react";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { CompanyProfileSummary } from "@/shared/types/team-member";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import { buildMarketingConnectedAccountStatusRows } from "@/shared/types/marketing-connected-account";
import {
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components/mc-surface";
import { DemoDataSection } from "@/shared/components/onboarding/DemoDataSection";
import { normalizeTradeKey } from "@/shared/lib/trades/trade-options";
import { BillingDocumentDefaultsCard } from "./BillingDocumentDefaultsCard";
import { CompanyProfileForm } from "./CompanyProfileForm";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";

/**
 * Company — the consolidated "everything about your business" tab
 * (settings IA v2). Absorbs the former Preferences (one timezone field),
 * Documents (one defaults card), and Integrations (a status list) tabs;
 * their legacy routes redirect here with anchors. One page, five sections,
 * no tab-hopping to answer "is my company set up?".
 */
export function CompanySettingsView({
  companyProfile,
  canManage,
  billingDefaults,
  showBillingDefaultsSetupHint,
  facebookAccounts,
  canManageMarketingAccounts,
  stripeConnected,
  stripeStatusLabel,
  demoDataStatus,
  demoDataLoadError,
}: {
  companyProfile: CompanyProfileSummary;
  canManage: boolean;
  billingDefaults: ComponentProps<
    typeof BillingDocumentDefaultsCard
  >["initialDefaults"];
  showBillingDefaultsSetupHint: boolean;
  facebookAccounts: MarketingConnectedAccount[];
  canManageMarketingAccounts: boolean;
  stripeConnected: boolean;
  stripeStatusLabel: string;
  demoDataStatus?: DemoDataStatus;
  demoDataLoadError?: string;
}) {
  const facebookRows = buildMarketingConnectedAccountStatusRows(facebookAccounts);
  const facebookRow = facebookRows.find((row) => row.provider === "facebook");
  const facebookStatus = facebookRow?.displayStatus ?? "not_connected";
  const facebookStatusLabel =
    facebookStatus === "connected"
      ? "Connected"
      : facebookStatus === "expired"
        ? "Expired"
        : facebookStatus === "error"
          ? "Needs attention"
          : "Not connected";

  return (
    <SettingsWorkspacePage
      title="Company"
      description="Profile, document defaults, timezone, and connections — everything about your business in one place."
    >
      {/* Timezone merged into the profile form (it saves the same field);
       * the empty #preferences anchor keeps the legacy redirect landing here. */}
      <div id="preferences" aria-hidden="true" />
      <div id="profile" className="scroll-mt-24">
        <SettingsWorkspaceSection
          title="Company profile"
          description="Identity, contact, address, and timezone — appears on invoices and estimates."
        >
          <CompanyProfileForm
            canManage={canManage}
            initialProfile={{
              name: companyProfile.name,
              status: companyProfile.status,
              trade: normalizeTradeKey(companyProfile.trade),
              timezone: companyProfile.timezone,
              phone: companyProfile.phone,
              email: companyProfile.email,
              addressLine1: companyProfile.addressLine1,
              addressLine2: companyProfile.addressLine2,
              city: companyProfile.city,
              state: companyProfile.state,
              postalCode: companyProfile.postalCode,
              country: companyProfile.country,
            }}
          />
        </SettingsWorkspaceSection>
      </div>

      <div id="documents" className="scroll-mt-24">
        <SettingsWorkspaceSection
          title="Document defaults"
          description="Tax, payment terms, estimate validity, and default notes for new estimates and invoices."
          card={false}
        >
          <BillingDocumentDefaultsCard
            initialDefaults={billingDefaults}
            canManage={canManage}
            showSetupHint={showBillingDefaultsSetupHint}
          />
        </SettingsWorkspaceSection>
      </div>

      <div id="connections" className="scroll-mt-24">
        <SettingsWorkspaceSection
          title="Connections"
          description="Services Altair supports today. Setup lives where each is used."
          card={false}
        >
          <ul className={altairMcListClass}>
            <li
              className={`${altairMcListRowClass} flex flex-wrap items-center justify-between gap-2`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <CreditCard
                  className="h-4 w-4 shrink-0 text-altair-brass"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-altair-ink">
                    Stripe Connect
                  </span>
                  <span className="block text-xs text-altair-ink-muted">
                    Customer payments ·{" "}
                    {stripeConnected ? stripeStatusLabel : "Not connected"}
                  </span>
                </span>
              </span>
              <Link
                href="/settings/billing#customer-payments"
                className="shrink-0 text-xs font-semibold text-altair-ink underline-offset-2 hover:underline"
              >
                Open in Billing
              </Link>
            </li>

            <li
              className={`${altairMcListRowClass} flex flex-wrap items-center justify-between gap-2 border-t border-altair-border`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Megaphone
                  className="h-4 w-4 shrink-0 text-altair-brass"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-altair-ink">
                    Facebook / Instagram
                  </span>
                  <span className="block text-xs text-altair-ink-muted">
                    Marketing publishing · {facebookStatusLabel}
                    {!canManageMarketingAccounts
                      ? " · Owners and admins can connect"
                      : ""}
                  </span>
                </span>
              </span>
              <Link
                href="/marketing"
                className="shrink-0 text-xs font-semibold text-altair-ink underline-offset-2 hover:underline"
              >
                Open Marketing Hub
              </Link>
            </li>
          </ul>
          <p className="mt-2 text-xs text-altair-ink-muted">
            Twilio, Resend, QuickBooks, Google Business Profile, Zapier, Google
            Calendar, and webhooks are not tenant Connect integrations today —
            Twilio and Resend are server send paths configured by environment.
          </p>
        </SettingsWorkspaceSection>
      </div>

      {demoDataStatus || demoDataLoadError ? (
        <SettingsWorkspaceSection
          title="Workspace data"
          description="Load or remove sample records used to evaluate Altair workflows."
        >
          {demoDataLoadError ? (
            <SettingsAlertBanner tone="error">
              {demoDataLoadError}
            </SettingsAlertBanner>
          ) : null}
          {demoDataStatus ? (
            <div className={demoDataLoadError ? "mt-3" : undefined}>
              <DemoDataSection
                companyId={companyProfile.id}
                status={demoDataStatus}
                variant="settings"
              />
            </div>
          ) : null}
        </SettingsWorkspaceSection>
      ) : null}
    </SettingsWorkspacePage>
  );
}
