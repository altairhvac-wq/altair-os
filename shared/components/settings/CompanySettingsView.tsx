import Link from "next/link";
import type { ComponentProps } from "react";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { CompanyProfileSummary } from "@/shared/types/team-member";
import { DemoDataSection } from "@/shared/components/onboarding/DemoDataSection";
import { normalizeTradeKey } from "@/shared/lib/trades/trade-options";
import { BillingDocumentDefaultsCard } from "./BillingDocumentDefaultsCard";
import { CompanyProfileForm } from "./CompanyProfileForm";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";
import { WorkspaceExportCard } from "./WorkspaceExportCard";

/**
 * Company — the consolidated "everything about your business" tab
 * (settings IA v2). Absorbs the former Preferences (one timezone field) and
 * Documents (one defaults card) tabs; their legacy routes redirect here with
 * anchors. Connections used to be a section here too; since 2026-11-27 they
 * live on Settings > Integrations, which every owner and admin can open, and
 * this page keeps one line pointing there.
 */
export function CompanySettingsView({
  companyProfile,
  canManage,
  billingDefaults,
  showBillingDefaultsSetupHint,
  demoDataStatus,
  demoDataLoadError,
}: {
  companyProfile: CompanyProfileSummary;
  canManage: boolean;
  billingDefaults: ComponentProps<
    typeof BillingDocumentDefaultsCard
  >["initialDefaults"];
  showBillingDefaultsSetupHint: boolean;
  demoDataStatus?: DemoDataStatus;
  demoDataLoadError?: string;
}) {
  return (
    <SettingsWorkspacePage
      title="Company"
      description="Profile, document defaults and timezone: everything about your business in one place."
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

      {/* Connections moved to Settings > Integrations (2026-11-27). The
       * anchor stays so an old link to #connections still lands on a line
       * that says where they went. */}
      <p
        id="connections"
        className="scroll-mt-24 px-1 text-[13px] leading-relaxed text-altair-ink-on-paper-secondary"
      >
        Card payments and everything else Altair connects to are on the{" "}
        <Link
          href="/settings/integrations"
          className="font-semibold text-altair-ink-on-paper underline underline-offset-2"
        >
          Integrations page
        </Link>
        .
      </p>

      {demoDataStatus || demoDataLoadError ? (
        <SettingsWorkspaceSection
          id="workspace-data"
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

      {/* Last on the page: a complete copy of the workspace, for the owner's
       * records or for leaving. The server action decides who may run it. */}
      <SettingsWorkspaceSection
        id="export"
        title="Export your data"
        description="A complete copy of this workspace's records, in one file."
        className="scroll-mt-24"
      >
        <WorkspaceExportCard companyName={companyProfile.name} />
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
