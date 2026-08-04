import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { CompanyProfileSummary } from "@/shared/types/team-member";
import { DemoDataSection } from "@/shared/components/onboarding/DemoDataSection";
import { normalizeTradeKey } from "@/shared/lib/trades/trade-options";
import { CompanyProfileForm } from "./CompanyProfileForm";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";

export function CompanySettingsView({
  companyProfile,
  canManage,
  demoDataStatus,
  demoDataLoadError,
}: {
  companyProfile: CompanyProfileSummary;
  canManage: boolean;
  demoDataStatus?: DemoDataStatus;
  demoDataLoadError?: string;
}) {
  return (
    <SettingsWorkspacePage
      title="Company"
      description="Business information, contact details, and company address."
    >
      <SettingsWorkspaceSection
        title="Company profile"
        description="These details appear on invoices, estimates, and workspace identity."
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
