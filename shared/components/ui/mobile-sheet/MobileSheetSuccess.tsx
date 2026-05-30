"use client";

import { CheckCircle2 } from "lucide-react";

type MobileSheetSuccessProps = {
  title: string;
  subtitle?: string;
};

export function MobileSheetSuccess({ title, subtitle }: MobileSheetSuccessProps) {
  return (
    <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center px-3 py-7">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-600/15">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <p className="mt-3 text-base font-bold text-slate-900">{title}</p>
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
