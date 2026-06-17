import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ShellNorthStarView } from "@/shared/components/altair-shell-north-star-v1/ShellNorthStarView";

export default async function AltairShellNorthStarV1Page() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  return <ShellNorthStarView companyContext={companyContext} />;
}
