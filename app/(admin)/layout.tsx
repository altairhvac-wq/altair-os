import { redirect } from "next/navigation";
import { AdminShell } from "@/shared/components/admin/AdminShell";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";

export default async function AdminLayout({
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

  return <AdminShell companyContext={companyContext}>{children}</AdminShell>;
}
