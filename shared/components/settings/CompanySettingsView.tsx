import {
  formatCompanyStatus,
  type CompanyProfileSummary,
} from "@/shared/types/team-member";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import { DemoDataSection } from "@/shared/components/onboarding/DemoDataSection";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";

function buildLocationLabel(profile: CompanyProfileSummary): string | null {
  const parts = [profile.city, profile.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function CompanySettingsView({
  companyProfile,
  demoDataStatus,
  demoDataLoadError,
  northStar = false,
}: {
  companyProfile: CompanyProfileSummary;
  demoDataStatus?: DemoDataStatus;
  demoDataLoadError?: string;
  northStar?: boolean;
}) {
  const location = buildLocationLabel(companyProfile);
  const fields = [
    { label: "Company", value: companyProfile.name },
    { label: "Status", value: formatCompanyStatus(companyProfile.status) },
    { label: "Timezone", value: companyProfile.timezone },
    ...(location ? [{ label: "Location", value: location }] : []),
    ...(companyProfile.email
      ? [{ label: "Email", value: companyProfile.email }]
      : []),
    ...(companyProfile.phone
      ? [{ label: "Phone", value: companyProfile.phone }]
      : []),
  ];

  return (
    <SettingsWorkspacePage
      title="Company"
      description="Business information, contact details, and company identity."
      northStar={northStar}
    >
      <SettingsWorkspaceSection
        title="Company profile"
        description="Company information is view-only during the closed beta. Editing will be available here in a future release."
        northStar={northStar}
      >
        <dl
          className={`divide-y border-y ${
            northStar
              ? "divide-[rgba(138,99,36,0.12)] border-[rgba(138,99,36,0.16)]"
              : "divide-altair-border border-altair-border"
          }`}
        >
          {fields.map((field) => (
            <div
              key={field.label}
              className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
            >
              <dt
                className={`text-xs font-semibold uppercase tracking-[0.08em] ${
                  northStar ? "text-[#4F4638]" : "text-altair-ink-muted"
                }`}
              >
                {field.label}
              </dt>
              <dd
                className={`min-w-0 break-words text-sm font-medium ${
                  northStar ? "text-[#17130E]" : "text-altair-ink"
                }`}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </SettingsWorkspaceSection>

      {(demoDataStatus || demoDataLoadError) ? (
        <SettingsWorkspaceSection
          title="Workspace data"
          description="Load or remove sample records used to evaluate Altair workflows."
          northStar={northStar}
        >
          {demoDataLoadError ? (
            <SettingsAlertBanner tone="error" northStar={northStar}>
              {demoDataLoadError}
            </SettingsAlertBanner>
          ) : null}
          {demoDataStatus ? (
            <div className={demoDataLoadError ? "mt-3" : undefined}>
              <DemoDataSection
                companyId={companyProfile.id}
                status={demoDataStatus}
                variant="settings"
                northStar={northStar}
              />
            </div>
          ) : null}
        </SettingsWorkspaceSection>
      ) : null}
    </SettingsWorkspacePage>
  );
}
