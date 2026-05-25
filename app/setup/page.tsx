import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { CompanySetupForm } from "@/shared/components/auth/CompanySetupForm";

export default async function SetupPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const context = await getActiveCompanyContext();

  if (context) {
    redirect("/");
  }

  return <CompanySetupForm />;
}
