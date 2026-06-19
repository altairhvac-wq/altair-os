import { requirePlatformAdmin } from "@/lib/database/platform-admin";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { PlatformAdminSubNav } from "@/shared/components/platform-admin/PlatformAdminSubNav";

export default async function PlatformAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requirePlatformAdmin();

  const northStar = isNorthStarShellEnabled();

  if (northStar) {
    return (
      <div className="platform-north-star-layout min-w-0">
        <PlatformAdminSubNav />
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PlatformAdminSubNav />
      {children}
    </div>
  );
}
