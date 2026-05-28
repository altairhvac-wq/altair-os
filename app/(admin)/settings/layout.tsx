import { redirect } from "next/navigation";
import { canAccessCompanySettings } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

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

  return children;
}
