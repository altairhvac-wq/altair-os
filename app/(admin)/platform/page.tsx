import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/database/platform-admin";
import { getPlatformAdminOverview } from "@/lib/database/services/platform-admin";
import { PlatformAdminPageView } from "@/shared/components/platform-admin/PlatformAdminPageView";

export const metadata: Metadata = {
  title: "Platform",
};

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();

  const data = await getPlatformAdminOverview();

  return <PlatformAdminPageView data={data} />;
}
