import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ShellNorthStarV3View } from "@/shared/components/altair-shell-north-star-v3/ShellNorthStarV3View";

export default async function AltairShellNorthStarV3Page() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  return <ShellNorthStarV3View companyContext={companyContext} />;
}
