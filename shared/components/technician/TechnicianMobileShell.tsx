import { Wrench } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { TechnicianBottomNav } from "./TechnicianBottomNav";

type TechnicianMobileShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
};

export function TechnicianMobileShell({
  children,
  companyContext,
}: TechnicianMobileShellProps) {
  return (
    <div className="min-h-dvh bg-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col border-x border-slate-200 bg-slate-100 shadow-xl">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600 text-white">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Altair OS</p>
              <p className="text-xs text-slate-500">
                {companyContext.company.name}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          {children}
        </main>

        <TechnicianBottomNav />
      </div>
    </div>
  );
}
