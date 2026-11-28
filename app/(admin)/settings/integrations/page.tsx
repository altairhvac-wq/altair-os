import type { Metadata } from "next";
import {
  canAccessCompanySettings,
  canManageIntegrations,
  canViewOperationalReports,
  getCompanyAccessScope,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { listCompanyIntegrationRequests } from "@/lib/database/queries/integration-requests";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { getResendEmailEnv } from "@/lib/email/env";
import { getConfiguredIntegrationProviders } from "@/lib/integrations/configuration";
import { IntegrationsPageView } from "@/shared/components/settings/integrations/IntegrationsPageView";
import { MarketingChannelIntegrations } from "@/shared/components/settings/integrations/MarketingChannelIntegrations";
import { getBillingCompanyReplyTo } from "@/shared/lib/billing-company-contact";
import { formatDateInTimeZone } from "@/shared/lib/datetime";
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

export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    connect_error?: string;
    provider?: string;
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

  const [paymentAccount, requests, marketingChannels] = await Promise.all([
    canSeePayments
      ? getCompanyPaymentAccount(company.id, "stripe")
      : Promise.resolve(null),
    listCompanyIntegrationRequests(company.id, nowIso),
    companyContext.isPlatformAdmin
      ? searchParams.then((params) =>
          loadMarketingChannels(companyContext, params),
        )
      : Promise.resolve(null),
  ]);

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
    />
  );
}
