import {
  bootstrapCompanyForNewUser,
  getCompanyNameFromUserMetadata,
  getCurrentUser,
} from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  RESET_PASSWORD_PATH,
} from "./constants";
import {
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

  if (!companyContext && user) {
    const companyName = getCompanyNameFromUserMetadata(user);

    if (companyName) {
      const bootstrapResult = await bootstrapCompanyForNewUser(companyName);

      if (!bootstrapResult.error && bootstrapResult.companyId) {
        companyContext = await getActiveCompanyContext({
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

  return resolvePostLoginRedirect(
    companyContext,
    nextParam ?? redirectToParam,
  );
}
