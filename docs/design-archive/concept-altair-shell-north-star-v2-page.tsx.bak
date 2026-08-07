import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ShellNorthStarV2View } from "@/shared/components/altair-shell-north-star-v2/ShellNorthStarV2View";

export default async function AltairShellNorthStarV2Page() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  return <ShellNorthStarV2View companyContext={companyContext} />;
}
