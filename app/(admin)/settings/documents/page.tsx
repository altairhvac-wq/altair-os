import { canAccessCompanySettings } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { hasSavedCompanyBillingDefaults } from "@/shared/lib/company-billing-defaults";
import { BillingDocumentDefaultsCard } from "@/shared/components/settings/BillingDocumentDefaultsCard";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "@/shared/components/settings/SettingsWorkspacePage";

export default async function DocumentsSettingsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  return (
    <SettingsWorkspacePage
      title="Documents"
      description="Configure the defaults used for new estimates and invoices."
    >
      <SettingsWorkspaceSection
        title="Billing document defaults"
        description="Set tax, payment terms, estimate validity, and default notes."
        card={false}
      >
        <BillingDocumentDefaultsCard
          initialDefaults={getCompanyBillingDefaultsFromRow(
            companyContext.company,
          )}
          canManage={canAccessCompanySettings(companyContext)}
          showSetupHint={
            !hasSavedCompanyBillingDefaults(companyContext.company.settings)
          }
        />
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
