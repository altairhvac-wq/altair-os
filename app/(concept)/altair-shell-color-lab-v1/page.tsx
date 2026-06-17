import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ColorLabView } from "@/shared/components/altair-shell-color-lab-v1/ColorLabView";

export default async function AltairShellColorLabV1Page() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  return <ColorLabView companyContext={companyContext} />;
}
