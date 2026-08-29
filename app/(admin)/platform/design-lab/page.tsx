import type { Metadata } from "next";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listDesignLabThemes } from "@/lib/database/queries/design-lab-themes";
import { DesignLabPageView } from "@/shared/components/platform-admin/design-lab/DesignLabPageView";

export const metadata: Metadata = {
  title: "Design lab",
};

export default async function DesignLabPage() {
  const context = await getActiveCompanyContext();
  const initialThemes = context
    ? await listDesignLabThemes(context.company.id)
    : [];

  return <DesignLabPageView initialThemes={initialThemes} />;
}
