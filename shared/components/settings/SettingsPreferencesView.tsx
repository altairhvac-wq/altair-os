import { CompanyTimezoneForm } from "./CompanyTimezoneForm";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";

type SettingsPreferencesViewProps = {
  timezone: string;
  canManage: boolean;
};

export function SettingsPreferencesView({
  timezone,
  canManage,
}: SettingsPreferencesViewProps) {
  return (
    <SettingsWorkspacePage
      title="Preferences"
      description="Workspace preferences that Altair can actually persist today."
    >
      <SettingsWorkspaceSection
        title="Timezone"
        description="Company timezone drives schedules, reports, and day boundaries. Units, locale, theme, and default views are not available yet."
      >
        <CompanyTimezoneForm
          initialTimezone={timezone}
          canManage={canManage}
        />
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
