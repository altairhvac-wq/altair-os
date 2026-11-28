import type { Metadata } from "next";
import {
  canAccessCompanySettings,
  canManageIntegrations,
  canViewOperationalReports,
  getCompanyAccessScope,
} from "@/lib/database/access-control";
import { confirmQuickBooksStillConnected } from "@/lib/accounting/connection";
import { loadQuickBooksPanel, type QuickBooksPanelState } from "@/lib/accounting/panel";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { listCompanyIntegrationRequests } from "@/lib/database/queries/integration-requests";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { getResendEmailEnv } from "@/lib/email/env";
import { getConfiguredIntegrationProviders } from "@/lib/integrations/configuration";
import { IntegrationsPageView } from "@/shared/components/settings/integrations/IntegrationsPageView";
import { MarketingChannelIntegrations } from "@/shared/components/settings/integrations/MarketingChannelIntegrations";
import { QuickBooksPanel, type QuickBooksPanelView } from "@/shared/components/settings/integrations/QuickBooksPanel";
import { getBillingCompanyReplyTo } from "@/shared/lib/billing-company-contact";
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  isSameCalendarDayInTimeZone,
} from "@/shared/lib/datetime";
import {
  describeCardPaymentsConnection,
  type CardPaymentsAccountFacts,
} from "@/shared/types/customer-integrations";
import { toMarketingChannelAccountFacts } from "@/shared/types/marketing-channel-connection";
import {
  buildIntegrationRows,
  formatIntegrationConnectFlash,
  type IntegrationAccountFacts,
} from "@/shared/types/integration-row";
import {
  buildStripePaymentSettingsSummary,
  getCardPaymentsDisplayStatus,
} from "@/shared/types/settings/payment-settings";

/**
 * Settings → Integrations.
 *
 * ============ WHO SEES WHAT ============
 * Every owner and admin sees the customer page: what Altair connects to
 * today (with this company's real status), what it does not connect to yet,
 * and a way to ask. Until 2026-11-27 a customer was redirected away from
 * this route, because the only thing on it was the founder's marketing
 * channels with developer variable names.
 *
 * Those channels are still here, below the customer page, and still for
 * platform admins only: `isPlatformAdmin` is checked on this page, and the
 * data for that block is not even loaded for anyone else.
 *
 * The settings layout has already turned away anyone who may not open
 * company settings; the check is repeated here because the read-back of this
 * company's requests uses the service role and must never run for someone
 * the layout would have refused.
 */
export const metadata: Metadata = {
  title: "Integrations",
};

type ActiveContext = NonNullable<
  Awaited<ReturnType<typeof getActiveCompanyContext>>
>;

async function loadMarketingChannels(
  companyContext: ActiveContext,
  params: { connected?: string; connect_error?: string; provider?: string },
) {
  const accounts = await listMarketingConnectedAccounts(
    companyContext.company.id,
  );

  // The shared projection — `hasRefreshToken` comes from account METADATA,
  // the non-secret fact the connect flows maintain, never from the secrets
  // table this user-scoped read must not touch. The `false` hardcoded here
  // before sent the owner to reconnect YouTube every morning: one hour after
  // every consent, an ordinary expiry rendered as REAUTH_REQUIRED while a
  // perfectly good refresh token sat encrypted in the secrets table.
  const facts: IntegrationAccountFacts[] = accounts.map((account) => ({
    ...toMarketingChannelAccountFacts(account),
    id: account.id,
    provider: account.provider,
    lastSuccessAt: account.lastSuccessAt ?? null,
    connectedAt: account.connectedAt ?? null,
  }));

  const configured = getConfiguredIntegrationProviders();

  const rows = buildIntegrationRows({
    configuredProviders: configured.configured,
    missingEnvVars: configured.missingEnvVars,
    accounts: facts,
    // Injected rather than read inside the projection: a clock read during
    // render is the classic source of a state that cannot be reproduced.
    nowIso: new Date().toISOString(),
  });

  return {
    slot: (
      <MarketingChannelIntegrations
        rows={rows}
        canManage={canManageIntegrations(companyContext)}
      />
    ),
    // The result of a connect hop ("YouTube connected"). Read from the query
    // string for a platform admin only, and shown at the top of the page.
    notice: formatIntegrationConnectFlash({
      connected: params.connected ?? null,
      connectError: params.connect_error ?? null,
      provider: params.provider ?? null,
    }),
  };
}

/**
 * The facts the card-payments row is written from. `readyToCharge` repeats
 * the checkout's own test (lib/payments/stripe-checkout.ts) through the
 * Billing page's helpers, so the two pages cannot disagree.
 */
function toCardPaymentsFacts(
  account: NonNullable<Awaited<ReturnType<typeof getCompanyPaymentAccount>>>,
): CardPaymentsAccountFacts {
  const summary = buildStripePaymentSettingsSummary({
    provider: account.provider,
    status: account.status,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    onlinePaymentsEnabled: account.onlinePaymentsEnabled,
    providerAccountId: account.providerAccountId,
    onboardingCompletedAt: account.onboardingCompletedAt,
    disabledAt: account.disabledAt,
    lastSyncedAt: account.lastSyncedAt,
    providerMetadata: account.providerMetadata,
  });

  return {
    status: summary.status,
    onlinePaymentsEnabled: summary.onlinePaymentsEnabled,
    readyToCharge:
      summary.chargesEnabled &&
      summary.payoutsEnabled &&
      summary.hasProviderAccountId &&
      summary.onboardingCompletedAt !== null &&
      summary.disabledAt === null &&
      getCardPaymentsDisplayStatus(summary) === "active",
  };
}

/** The word the QuickBooks sign-in leaves in the address, as a sentence. */
const QUICKBOOKS_FLASH: Record<string, { tone: "success" | "error" | "info"; message: string }> = {
  reconnected: { tone: "success", message: "QuickBooks is connected again. Waiting changes are on their way." },
  cancelled: { tone: "info", message: "QuickBooks was not connected. Nothing changed." },
  expired: { tone: "error", message: "That sign-in took too long or was started in another window. Press Connect QuickBooks again." },
  denied: { tone: "error", message: "Only the owner or admin who pressed Connect, in this company, can finish connecting QuickBooks." },
  failed: { tone: "error", message: "QuickBooks did not finish connecting. Try again in a minute." },
  unavailable: { tone: "error", message: "QuickBooks is not available yet." },
  // Intuit's "Disconnect URL": where QuickBooks sends someone who removed
  // Altair from inside QuickBooks. Altair notices on its next send (Intuit
  // refuses the keys) and shows "Connect again"; this says so up front.
  // Informational only: a link cannot change the connection.
  disconnected: {
    tone: "info",
    message: "Altair was disconnected from inside QuickBooks, so nothing more is sent. Your records in QuickBooks stay there. Connect again here whenever you like.",
  },
};

function toQuickBooksView(state: QuickBooksPanelState, timeZone: string): QuickBooksPanelView | null {
  switch (state.kind) {
    case "unavailable":
      return null;
    case "not_connected":
      return { kind: "not_connected" };
    case "setup":
      return { kind: "setup", companyName: state.companyName };
    case "reauth_required":
      return { kind: "reauth_required", companyName: state.companyName };
    case "active": {
      const now = new Date();
      const last = state.lastSyncAt
        ? `Last sent ${formatTimeInTimeZone(state.lastSyncAt, timeZone)}${isSameCalendarDayInTimeZone(state.lastSyncAt, now, timeZone) ? " today" : ` on ${formatDateInTimeZone(state.lastSyncAt, timeZone, { month: "short", day: "numeric" })}`}.`
        : state.sent.customer + state.sent.item + state.sent.invoice + state.sent.payment > 0
          ? "Sending now."
          : "Nothing sent yet.";
      const by = `Connected${state.connectedByName ? ` by ${state.connectedByName}` : ""} on ${formatDateInTimeZone(state.connectedAt, timeZone, { month: "short", day: "numeric" })}.`;
      const accounts = [
        state.incomeAccountName ? `Work counts toward ${state.incomeAccountName}.` : null,
        `Payments land in ${state.depositAccountName ?? "Undeposited Funds"}.`,
      ].filter(Boolean).join(" ");
      return {
        kind: "active",
        companyName: state.companyName,
        summary: `${last} ${by}`,
        sent: state.sent,
        waiting: state.waiting,
        attention: state.attention,
        attentionTotal: state.attentionTotal,
        accountsLine: accounts,
      };
    }
  }
}

export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    connect_error?: string;
    provider?: string;
    quickbooks?: string;
  }>;
}) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    return null;
  }

  if (!canAccessCompanySettings(companyContext)) {
    return null;
  }

  const company = companyContext.company;
  const nowIso = new Date().toISOString();
  const canSeePayments = companyContext.permissions.manageBilling;

  const canManageQuickBooks = canManageIntegrations(companyContext);
  // Arriving from Intuit's Disconnect URL: ask Intuit once, before the panel
  // is read, so it shows "Connect again" rather than "Connected".
  if (canManageQuickBooks && (await searchParams).quickbooks === "disconnected") {
    await confirmQuickBooksStillConnected(company.id).catch(() => undefined);
  }
  const [paymentAccount, requests, marketingChannels, quickBooks, params] = await Promise.all([
    canSeePayments
      ? getCompanyPaymentAccount(company.id, "stripe")
      : Promise.resolve(null),
    listCompanyIntegrationRequests(company.id, nowIso),
    companyContext.isPlatformAdmin
      ? searchParams.then((params) =>
          loadMarketingChannels(companyContext, params),
        )
      : Promise.resolve(null),
    canManageQuickBooks
      ? loadQuickBooksPanel(company.id).catch(() => ({ kind: "unavailable" }) as const)
      : Promise.resolve({ kind: "unavailable" } as const),
    searchParams,
  ]);
  const quickBooksView = toQuickBooksView(quickBooks, company.timezone);
  // "disconnected" is said only when Intuit confirmed it; a stray or forged
  // link to a working connection shows nothing.
  const disconnectConfirmed = quickBooks.kind === "reauth_required" || quickBooks.kind === "not_connected";
  const quickBooksFlash =
    params.quickbooks && (params.quickbooks !== "disconnected" || disconnectConfirmed)
      ? (QUICKBOOKS_FLASH[params.quickbooks] ?? null)
      : null;

  const access = getCompanyAccessScope(companyContext);
  const importLinks = [
    ...(access.canManageCustomers
      ? [{ label: "Import customers", href: "/customers/import" }]
      : []),
    ...(companyContext.permissions.manageBilling
      ? [
          { label: "Import a price book", href: "/price-book/import" },
          { label: "Import unpaid invoices", href: "/invoices/import" },
        ]
      : []),
  ];

  const requestedOn: Record<string, string> = {};
  for (const [key, askedAt] of Object.entries(requests.requestedAt)) {
    requestedOn[key] = formatDateInTimeZone(askedAt, company.timezone, {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <IntegrationsPageView
      cardPayments={describeCardPaymentsConnection(
        canSeePayments
          ? paymentAccount
            ? toCardPaymentsFacts(paymentAccount)
            : null
          : "hidden",
      )}
      importLinks={importLinks}
      canExport={companyContext.permissions.manageCompany}
      canOpenTaxSummary={canViewOperationalReports(companyContext)}
      emailEnabled={getResendEmailEnv().configured}
      // The same rule the sender uses for Reply-To, so the page never names
      // an address a customer's reply would not actually go to.
      companyEmail={getBillingCompanyReplyTo({ email: company.email }) ?? null}
      companyName={company.name}
      companyId={company.id}
      requestedOn={requestedOn}
      platformAdminSlot={marketingChannels?.slot}
      platformAdminNotice={marketingChannels?.notice ?? null}
      quickBooksSlot={
        quickBooksView ? <QuickBooksPanel view={quickBooksView} flash={quickBooksFlash} /> : undefined
      }
    />
  );
}
