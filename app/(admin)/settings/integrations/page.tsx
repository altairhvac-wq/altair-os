import type { Metadata } from "next";
import { canManageIntegrations, canViewIntegrations } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { getConfiguredIntegrationProviders } from "@/lib/integrations/configuration";
import { IntegrationsSettingsView } from "@/shared/components/settings/IntegrationsSettingsView";
import { toMarketingChannelAccountFacts } from "@/shared/types/marketing-channel-connection";
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
