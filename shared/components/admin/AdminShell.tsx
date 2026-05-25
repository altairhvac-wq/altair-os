"use client";

import { usePathname } from "next/navigation";
import { getNavItemForPath } from "./nav-items";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const current = getNavItemForPath(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={current.label} description={current.description} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
