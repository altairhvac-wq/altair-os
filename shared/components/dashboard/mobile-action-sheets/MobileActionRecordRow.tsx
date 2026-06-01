"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type MobileActionRecordRowProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  actions?: ReactNode;
  href?: string;
};

export function MobileActionRecordRow({
  title,
  subtitle,
  meta,
  actions,
  href,
}: MobileActionRecordRowProps) {
  const content = (
    <div className="flex min-w-0 items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs font-medium text-slate-500">
            {subtitle}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            {meta}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-col items-end gap-1">{actions}</div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <li className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
        <Link href={href} className="block transition-opacity hover:opacity-90">
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      {content}
    </li>
  );
}

type MobileActionButtonProps = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  pending?: boolean;
  variant?: "primary" | "secondary";
};

export function MobileActionButton({
  label,
  onClick,
  href,
  disabled = false,
  pending = false,
  variant = "primary",
}: MobileActionButtonProps) {
  const className =
    variant === "primary"
      ? "inline-flex min-h-8 items-center justify-center rounded-md bg-cyan-600 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
      : "inline-flex min-h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={className}
    >
      {pending ? "Working…" : label}
    </button>
  );
}
