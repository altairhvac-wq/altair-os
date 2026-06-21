"use client";

import { Link2 } from "lucide-react";
import {
  buildMarketingConnectedAccountStatusRows,
  type MarketingConnectedAccount,
  type MarketingConnectedAccountDisplayStatus,
} from "@/shared/types/marketing-connected-account";

type MarketingConnectedAccountsCardProps = {
  accounts: MarketingConnectedAccount[];
  northStar: boolean;
};

function statusBadgeClassName(
  status: MarketingConnectedAccountDisplayStatus,
  northStar: boolean,
): string {
  const base =
    "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium";

  switch (status) {
    case "connected":
      return northStar
        ? `${base} bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80`
        : `${base} bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80`;
    case "expired":
      return northStar
        ? `${base} bg-amber-50 text-amber-800 ring-1 ring-amber-200/80`
        : `${base} bg-amber-50 text-amber-800 ring-1 ring-amber-200/80`;
    case "error":
      return northStar
        ? `${base} bg-rose-50 text-rose-800 ring-1 ring-rose-200/80`
        : `${base} bg-rose-50 text-rose-800 ring-1 ring-rose-200/80`;
    case "disconnected":
    case "not_connected":
    default:
      return northStar
        ? `${base} bg-[#EFE4CB] text-[#6B4E1A] ring-1 ring-[rgba(138,99,36,0.12)]`
        : `${base} bg-slate-100 text-slate-600 ring-1 ring-slate-200/80`;
  }
}

export function MarketingConnectedAccountsCard({
  accounts,
  northStar,
}: MarketingConnectedAccountsCardProps) {
  const rows = buildMarketingConnectedAccountStatusRows(accounts);
  const hasAnyConnected = rows.some((row) => row.displayStatus === "connected");

  return (
    <section
      className={`shrink-0 border-b px-4 py-4 sm:px-5 ${
        northStar
          ? "border-[rgba(148,163,184,0.18)] bg-[#FAF6EE]/50"
          : "border-slate-100/90 bg-slate-50/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            northStar
              ? "bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]"
              : "bg-white ring-1 ring-slate-200/80"
          }`}
        >
          <Link2
            className={`h-4 w-4 ${northStar ? "text-[#8A6324]" : "text-slate-500"}`}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className={`text-sm font-semibold ${
              northStar ? "text-[#17130E]" : "text-slate-900"
            }`}
          >
            Connected accounts
          </h2>
          <p
            className={`mt-1 text-xs leading-relaxed ${
              northStar ? "text-[#6B6255]" : "text-slate-500"
            }`}
          >
            Connect business pages later so Altair can help publish approved
            posts. Posting is still manual today.
          </p>

          {!hasAnyConnected ? (
            <p
              className={`mt-2 text-xs ${
                northStar ? "text-[#6B6255]" : "text-slate-500"
              }`}
            >
              No accounts are connected yet.
            </p>
          ) : null}

          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li
                key={row.provider}
                className={`rounded-xl border px-3 py-3 ${
                  northStar
                    ? "border-[rgba(148,163,184,0.22)] bg-white/80"
                    : "border-slate-200/90 bg-white"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        northStar ? "text-[#17130E]" : "text-slate-900"
                      }`}
                    >
                      {row.providerLabel}
                    </p>
                    {row.resourceName ? (
                      <p
                        className={`mt-0.5 truncate text-xs ${
                          northStar ? "text-[#6B6255]" : "text-slate-600"
                        }`}
                      >
                        {row.resourceName}
                      </p>
                    ) : null}
                    <p
                      className={`mt-1 text-xs leading-relaxed ${
                        northStar ? "text-[#6B6255]" : "text-slate-500"
                      }`}
                    >
                      {row.helperText}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <span
                      className={statusBadgeClassName(row.displayStatus, northStar)}
                    >
                      {row.displayStatusLabel}
                    </span>
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                        northStar
                          ? "cursor-not-allowed bg-[#FAF6EE] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)]"
                          : "cursor-not-allowed bg-slate-50 text-slate-400 ring-1 ring-slate-200/80"
                      }`}
                      aria-disabled="true"
                    >
                      Connect later
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
