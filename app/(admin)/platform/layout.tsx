import { requirePlatformAdmin } from "@/lib/database/platform-admin";
import { PlatformAdminSubNav } from "@/shared/components/platform-admin/PlatformAdminSubNav";

export default async function PlatformAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requirePlatformAdmin();

  return (
    <div className="space-y-4">
      <PlatformAdminSubNav />
      {children}
    </div>
  );
}
