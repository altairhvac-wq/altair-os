"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-600">
              Altair OS
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">{children}</div>

          {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function AuthInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 ${props.className ?? ""}`}
    />
  );
}

export function AuthSubmitButton({
  pending,
  children,
}: {
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Please wait..." : children}
    </button>
  );
}

export function AuthMessage({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="font-semibold text-cyan-700 hover:text-cyan-800">
      {children}
    </Link>
  );
}
