import { queueWelcomeEmailForNewCompany } from "@/lib/onboarding/welcome";
import {
  bootstrapCompanyForNewUser,
  getCompanyNameFromUserMetadata,
  getTradeFromUserMetadata,
  getCurrentUser,
} from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getGuidedSetupAvailabilityFor } from "@/lib/database/queries/business-setup";
import { processNetworkInviteAfterCompanyBootstrap } from "@/lib/database/services/network-invite-acceptance";
import {
  RESET_PASSWORD_PATH,
} from "./constants";
import { userHasPendingTeamInvites } from "./pending-team-invites";
import {
  NEW_COMPANY_START_PATH,
  resolvePostLoginRedirect,
  sanitizeNextPath,
} from "./redirects";

function isPasswordRecoveryFlow(
  nextParam: string | null | undefined,
  typeParam: string | null | undefined,
): boolean {
  if (typeParam === "recovery") {
    return true;
  }

  const rawNext = nextParam?.trim();

  if (!rawNext) {
    return false;
  }

  return (
    rawNext === RESET_PASSWORD_PATH ||
    rawNext.startsWith(`${RESET_PASSWORD_PATH}?`) ||
    rawNext.startsWith(`${RESET_PASSWORD_PATH}/`)
  );
}

/**
 * Resolves where to send the user after a successful auth callback exchange.
 * Handles password recovery, company bootstrap, and role-aware redirects.
 */
export async function resolveAuthCallbackDestination(
  nextParam: string | null | undefined,
  redirectToParam: string | null | undefined,
  typeParam: string | null | undefined,
): Promise<string> {
  if (isPasswordRecoveryFlow(nextParam, typeParam)) {
    return RESET_PASSWORD_PATH;
  }

  const user = await getCurrentUser();
  let companyContext = await getActiveCompanyContext();
  // True when this callback has just created the person's company (the
  // emailed confirmation link is where most new companies are made).
  let createdCompany = false;

  if (!companyContext && user) {
    const companyName = getCompanyNameFromUserMetadata(user);
    const trade = getTradeFromUserMetadata(user);
    const deferBootstrapForInvite = await userHasPendingTeamInvites(user);

    if (companyName && !deferBootstrapForInvite) {
      const bootstrapResult = await bootstrapCompanyForNewUser(
        companyName,
        trade,
      );

      if (!bootstrapResult.error && bootstrapResult.companyId) {
        createdCompany = true;
        companyContext = await getActiveCompanyContext({
          companyId: bootstrapResult.companyId,
        });

        await queueWelcomeEmailForNewCompany({
          user,
          companyId: bootstrapResult.companyId,
        });

        await processNetworkInviteAfterCompanyBootstrap({
          user,
          companyId: bootstrapResult.companyId,
        });
      }
    }
  }

  if (!companyContext) {
    const setupPath = "/setup";
    const safeNext = sanitizeNextPath(nextParam ?? redirectToParam);

    if (safeNext) {
      return `${setupPath}?next=${encodeURIComponent(safeNext)}`;
    }

    return setupPath;
  }

  // A brand-new company opens on the guided setup, unless the link was
  // already taking them somewhere, and only where the setup can run (in a
  // database that does not have it yet, they go to the dashboard as before).
  const requested = nextParam ?? redirectToParam;
  const startOnSetup =
    createdCompany &&
    !requested &&
    (await getGuidedSetupAvailabilityFor(companyContext));

  return resolvePostLoginRedirect(
    companyContext,
    startOnSetup ? NEW_COMPANY_START_PATH : requested,
  );
}
