import { redirect } from "next/navigation";
import { TechnicianMobileShell } from "@/shared/components/technician/TechnicianMobileShell";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";

export default async function TechLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  return (
    <TechnicianMobileShell companyContext={companyContext}>
      {children}
    </TechnicianMobileShell>
  );
}
