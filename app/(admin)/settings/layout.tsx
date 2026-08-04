import { redirect } from "next/navigation";
import {
  canAccessCompanySettings,
  canAccessSystemCheck,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { SettingsShell } from "@/shared/components/settings/SettingsShell";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessCompanySettings(companyContext)) {
    return (
      <UnauthorizedAccessView description="Company settings are limited to owner and admin roles." />
    );
  }

  return (
    <SettingsShell showSystemCheck={canAccessSystemCheck(companyContext)}>
      {children}
    </SettingsShell>
  );
}
