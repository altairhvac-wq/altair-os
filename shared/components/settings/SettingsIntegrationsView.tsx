import Link from "next/link";
import { CreditCard, Megaphone } from "lucide-react";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components/mc-surface";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import {
  buildMarketingConnectedAccountStatusRows,
} from "@/shared/types/marketing-connected-account";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";

type SettingsIntegrationsViewProps = {
  facebookAccounts: MarketingConnectedAccount[];
  canManageMarketingAccounts: boolean;
  stripeConnected: boolean;
  stripeStatusLabel: string;
};

export function SettingsIntegrationsView({
  facebookAccounts,
  canManageMarketingAccounts,
  stripeConnected,
  stripeStatusLabel,
}: SettingsIntegrationsViewProps) {
  const facebookRows = buildMarketingConnectedAccountStatusRows(facebookAccounts);
  const facebookRow = facebookRows.find((row) => row.provider === "facebook");
  const facebookStatus = facebookRow?.displayStatus ?? "not_connected";
  const facebookStatusLabel =
    facebookStatus === "connected"
      ? "Connected"
      : facebookStatus === "expired"
        ? "Expired"
        : facebookStatus === "error"
          ? "Needs attention"
          : "Not connected";

  return (
    <SettingsWorkspacePage
      title="Integrations"
      description="Connect the services Altair already supports. No fake Connect buttons."
    >
      <SettingsWorkspaceSection
        title="Available connections"
        description="Stripe handles customer payments. Facebook/Instagram publishing is managed in Marketing Hub."
        card={false}
      >
        <ul className={altairMcListClass}>
          <li
            className={`${altairMcListRowClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-brass/10 text-altair-brass">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-altair-ink">
                  Stripe Connect
                </p>
                <p className="mt-0.5 text-sm text-altair-ink-secondary">
                  Collect invoice payments from customers. Setup lives under
                  Billing.
                </p>
                <p className="mt-1 text-xs font-medium text-altair-ink-muted">
                  Status: {stripeConnected ? stripeStatusLabel : "Not connected"}
                </p>
              </div>
            </div>
            <Link
              href="/settings/subscription#customer-payments"
              className="shrink-0 text-sm font-semibold text-altair-ink underline-offset-2 hover:underline"
            >
              Open in Billing
            </Link>
          </li>

          <li
            className={`${altairMcListRowClass} flex flex-col gap-3 border-t border-altair-border sm:flex-row sm:items-center sm:justify-between`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-brass/10 text-altair-brass">
                <Megaphone className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-altair-ink">
                  Facebook / Instagram
                </p>
                <p className="mt-0.5 text-sm text-altair-ink-secondary">
                  Connect Pages for Marketing Hub publishing. OAuth and account
                  management stay in Marketing Hub.
                </p>
                <p className="mt-1 text-xs font-medium text-altair-ink-muted">
                  Status: {facebookStatusLabel}
                  {!canManageMarketingAccounts
                    ? " · Owners and admins can connect"
                    : ""}
                </p>
              </div>
            </div>
            <Link
              href="/marketing"
              className="shrink-0 text-sm font-semibold text-altair-ink underline-offset-2 hover:underline"
            >
              Open Marketing Hub
            </Link>
          </li>
        </ul>
      </SettingsWorkspaceSection>

      <SettingsWorkspaceSection
        title="Not available yet"
        description="These are not buildable as Connect flows in Altair today."
      >
        <div
          className={`${altairMcCardClass} ${altairMcCardPadClass} border-dashed`}
        >
          <p className="text-sm text-altair-ink-secondary">
            Twilio, Resend, Google Business Profile, QuickBooks, Zapier, Google
            Calendar, and outbound webhooks do not have Connect-style UIs here.
            Twilio and Resend are server send paths configured by environment;
            they are not tenant Connect integrations.
          </p>
        </div>
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
