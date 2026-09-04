import "server-only";

import {
  INTEGRATION_CAPABILITIES,
} from "@/shared/types/integration-capability";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from "@/shared/types/integration-provider";

/**
 * Which providers this DEPLOYMENT is configured for.
 *
 * ============ THE ONLY THING THAT CROSSES TO THE CLIENT IS A BOOLEAN ============
 * This module reads `process.env` and returns two things: a boolean per
 * provider, and the NAMES of the variables that are missing. No value ever
 * leaves it — not truncated, not hashed, not "the first four characters so
 * you can tell which key it is". The Integrations page renders the missing
 * NAMES so whoever deploys knows what to set, which is the entire useful
 * content of a credential's absence.
 *
 * ============ CONFIGURED IS NOT CONNECTED ============
 * A `true` here means only that this deployment holds the client credentials
 * needed to START an authorization. It says nothing about whether any company
 * has connected an account, whether a token is valid, or whether the provider
 * has granted publishing access — those are three further, independent
 * questions answered by the connected-account row and by
 * `deriveMarketingChannelState`. Conflating them is exactly how a UI ends up
 * claiming a connection nobody made.
 *
 * `import "server-only"` is load-bearing: this module touches `process.env`,
 * and a client component importing it would be a build error rather than a
 * silent bundling of whatever happened to be in scope.
 */

export type IntegrationConfigurationReport = {
  /** Provider → does this deployment hold its client credentials? */
  readonly configured: Readonly<Record<IntegrationProvider, boolean>>;
  /** Provider → the env var NAMES that are absent or blank. Never values. */
  readonly missingEnvVars: Readonly<Record<IntegrationProvider, string[]>>;
};

/** Present AND non-blank. A variable set to "" is not configured. */
function hasValue(name: string): boolean {
  const raw = process.env[name];
  return typeof raw === "string" && raw.trim().length > 0;
}

export function getConfiguredIntegrationProviders(): IntegrationConfigurationReport {
  const configured = {} as Record<IntegrationProvider, boolean>;
  const missingEnvVars = {} as Record<IntegrationProvider, string[]>;

  for (const provider of INTEGRATION_PROVIDERS) {
    const required = INTEGRATION_CAPABILITIES[provider].requiredEnvVars;
    const missing = required.filter((name) => !hasValue(name));

    missingEnvVars[provider] = missing;
    // A provider requiring nothing is configured by definition — the
    // first-party surface is ours and has no credential to hold.
    configured[provider] = missing.length === 0;
  }

  return { configured, missingEnvVars };
}

/** Whether one provider is configured. Same rule, single-provider shape. */
export function isIntegrationProviderConfigured(
  provider: IntegrationProvider,
): boolean {
  return INTEGRATION_CAPABILITIES[provider].requiredEnvVars.every((name) =>
    hasValue(name),
  );
}
