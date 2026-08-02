"use client";

import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { startFacebookOAuthConnectAction } from "@/app/actions/marketing-connected-accounts";
import {
  buildMarketingConnectedAccountStatusRows,
  type MarketingConnectedAccount,
  type MarketingConnectedAccountDisplayStatus,
  type MarketingConnectedProvider,
} from "@/shared/types/marketing-connected-account";

type MarketingConnectedAccountsCardProps = {
  accounts: MarketingConnectedAccount[];
  northStar: boolean;
  canManageConnectedAccounts?: boolean;
  flashMessage?: { tone: "success" | "error"; message: string } | null;
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

function connectButtonClassName(northStar: boolean, disabled: boolean): string {
  if (disabled) {
    return northStar
      ? "inline-flex rounded-md px-2 py-1 text-xs font-medium cursor-not-allowed bg-[#FAF6EE] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)]"
      : "inline-flex rounded-md px-2 py-1 text-xs font-medium cursor-not-allowed bg-slate-50 text-slate-400 ring-1 ring-slate-200/80";
  }

  return northStar
    ? "inline-flex rounded-md px-2 py-1 text-xs font-medium bg-[#17130E] text-[#FAF6EE] hover:bg-[#2A241C] disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex rounded-md px-2 py-1 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
}

function ProviderAction({
  provider,
  displayStatus,
  northStar,
  canManageConnectedAccounts,
  onError,
}: {
  provider: MarketingConnectedProvider;
  displayStatus: MarketingConnectedAccountDisplayStatus;
  northStar: boolean;
  canManageConnectedAccounts: boolean;
  onError: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  if (provider !== "facebook") {
    return (
      <span
        className={connectButtonClassName(northStar, true)}
        aria-disabled="true"
      >
        Connect later
      </span>
    );
  }

  if (!canManageConnectedAccounts) {
    return (
      <span
        className={connectButtonClassName(northStar, true)}
        aria-disabled="true"
        title="Only owners and admins can connect accounts"
      >
        Connect
      </span>
    );
  }

  const label =
    displayStatus === "connected" || displayStatus === "error"
      ? "Reconnect"
      : "Connect";

  return (
    <button
      type="button"
      className={connectButtonClassName(northStar, false)}
      disabled={isPending}
      onClick={() => {
        onError("");
        startTransition(async () => {
          const result = await startFacebookOAuthConnectAction("/marketing");
          if (result?.error) {
            onError(result.error);
          }
        });
      }}
    >
      {isPending ? "Redirecting…" : label}
    </button>
  );
}

export function MarketingConnectedAccountsCard({
  accounts,
  northStar,
  canManageConnectedAccounts = false,
  flashMessage = null,
}: MarketingConnectedAccountsCardProps) {
  const rows = buildMarketingConnectedAccountStatusRows(accounts);
  const hasAnyConnected = rows.some((row) => row.displayStatus === "connected");
  const [actionError, setActionError] = useState<string | null>(null);

  const banner =
    actionError != null && actionError !== ""
      ? { tone: "error" as const, message: actionError }
      : flashMessage;

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
            Connect a Facebook Page you manage. Posting stays manual until
            Meta App Review unlocks publish scopes.
          </p>

          {banner ? (
            <p
              className={`mt-2 rounded-lg px-2.5 py-2 text-xs ${
                banner.tone === "success"
                  ? northStar
                    ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80"
                    : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80"
                  : northStar
                    ? "bg-rose-50 text-rose-900 ring-1 ring-rose-200/80"
                    : "bg-rose-50 text-rose-900 ring-1 ring-rose-200/80"
              }`}
              role={banner.tone === "error" ? "alert" : "status"}
            >
              {banner.message}
            </p>
          ) : null}

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
                    {row.connectedResourceNames.length === 1 ? (
                      <p
                        className={`mt-0.5 truncate text-xs ${
                          northStar ? "text-[#6B6255]" : "text-slate-600"
                        }`}
                      >
                        {row.connectedResourceNames[0]}
                      </p>
                    ) : null}
                    <p
                      className={`mt-1 text-xs leading-relaxed ${
                        northStar ? "text-[#6B6255]" : "text-slate-500"
                      }`}
                    >
                      {row.helperText}
                    </p>
                    {row.account?.status === "error" && row.account.lastError ? (
                      <p
                        className={`mt-1 text-xs ${
                          northStar ? "text-rose-800" : "text-rose-700"
                        }`}
                      >
                        {row.account.lastError}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <span
                      className={statusBadgeClassName(row.displayStatus, northStar)}
                    >
                      {row.displayStatusLabel}
                    </span>
                    <ProviderAction
                      provider={row.provider}
                      displayStatus={row.displayStatus}
                      northStar={northStar}
                      canManageConnectedAccounts={canManageConnectedAccounts}
                      onError={setActionError}
                    />
                  </div>
                </div>

                {row.connectedResourceNames.length > 1 ? (
                  <div className="mt-3 border-t border-dashed border-slate-200/80 pt-2">
                    <p
                      className={`text-[11px] font-medium uppercase tracking-wide ${
                        northStar ? "text-[#8A6324]" : "text-slate-500"
                      }`}
                    >
                      Connected Pages
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {row.connectedResourceNames.map((name) => (
                        <li
                          key={`${row.provider}-${name}`}
                          className={`truncate text-xs ${
                            northStar ? "text-[#17130E]" : "text-slate-700"
                          }`}
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {row.provider === "facebook" &&
                row.displayStatus === "connected" &&
                row.connectedResourceNames.length === 1 ? (
                  <p
                    className={`mt-2 text-[11px] ${
                      northStar ? "text-[#6B6255]" : "text-slate-500"
                    }`}
                  >
                    Page connected (read-only). Publishing is not enabled yet.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
