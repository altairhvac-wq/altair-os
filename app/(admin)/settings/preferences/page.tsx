import { canAccessCompanySettings } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { SettingsPreferencesView } from "@/shared/components/settings/SettingsPreferencesView";

export default async function PreferencesSettingsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  return (
    <SettingsPreferencesView
      timezone={companyContext.company.timezone}
      canManage={canAccessCompanySettings(companyContext)}
    />
  );
}
