"use client";

import { CheckCircle2 } from "lucide-react";

type MobileSheetSuccessProps = {
  title: string;
  subtitle?: string;
};

export function MobileSheetSuccess({ title, subtitle }: MobileSheetSuccessProps) {
  return (
    <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-600/15">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <p className="mt-4 text-base font-bold text-slate-900">{title}</p>
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
