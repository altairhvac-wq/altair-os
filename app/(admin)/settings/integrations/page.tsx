import type { Metadata } from "next";
import { canManageIntegrations, canViewIntegrations } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { getConfiguredIntegrationProviders } from "@/lib/integrations/configuration";
import { IntegrationsSettingsView } from "@/shared/components/settings/IntegrationsSettingsView";
import {
  buildIntegrationRows,
  formatIntegrationConnectFlash,
  type IntegrationAccountFacts,
} from "@/shared/types/integration-row";

/**
 * Settings → Integrations.
 *
 * This route existed as a six-line redirect to /settings/company#connections
 * ("settings IA v2 merged Integrations into Company"). That merge was correct
 * when the only integration was Facebook and its whole state was "connected
 * or not". It stops being correct with nine providers across three kinds,
 * each carrying configuration, connection health, granted scopes and a
 * provider-side capability that no token reflects — the Company page's
 * Connections rows cannot express any of that without becoming this page.
 *
 * The Company page keeps its Connections summary and links here for detail,
 * so there is still one home for the capability rather than two.
 */
export const metadata: Metadata = {
  title: "Integrations",
};

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

  // Reading connection status is a dispatcher-level operational question;
  // changing it is not. This mirrors the SELECT policy migration 089 put on
  // marketing_connected_accounts, so the page and the database agree.
  if (!canViewIntegrations(companyContext)) {
    return null;
  }

  const params = await searchParams;
  const accounts = await listMarketingConnectedAccounts(
    companyContext.company.id,
  );

  const facts: IntegrationAccountFacts[] = accounts.map((account) => ({
    id: account.id,
    provider: account.provider,
    status: account.status,
    publishCapability: account.publishCapability,
    tokenExpiresAt: account.tokenExpiresAt ?? null,
    // A refresh token is a fact about the SECRETS table, which this
    // user-scoped read cannot and must not touch. Reporting false here is
    // the conservative reading: it steers an expired connection to
    // REAUTH_REQUIRED ("reconnect it") rather than TOKEN_EXPIRED ("it will
    // fix itself"), which is the safe way to be wrong.
    hasRefreshToken: false,
    lastError: account.lastError ?? null,
    capabilityDetail: account.capabilityDetail ?? null,
    accountName: account.providerAccountName ?? null,
    resourceName: account.providerResourceName ?? null,
    lastSuccessAt: account.lastSuccessAt ?? null,
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

  return (
    <IntegrationsSettingsView
      rows={rows}
      canManage={canManageIntegrations(companyContext)}
      flash={formatIntegrationConnectFlash({
        connected: params.connected ?? null,
        connectError: params.connect_error ?? null,
        provider: params.provider ?? null,
      })}
    />
  );
}
