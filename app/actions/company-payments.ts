"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  assertOnlineCheckoutManagementAccess,
  assertStripeConnectOnboardingAccess,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import {
  attachStripeProviderAccountId,
  disableOnlineCheckoutForCompany,
  enableOnlineCheckoutForCompany,
  insertStripePaymentAccountForOnboarding,
} from "@/lib/database/services/company-payment-accounts";
import { isStripeConnectOnboardingConfigured } from "@/lib/payments/env";
import {
  buildStripeConnectOnboardingUrls,
  createStripeAccountOnboardingLink,
  createStripeExpressConnectedAccount,
  mapStripeConnectSetupError,
} from "@/lib/payments/stripe-connect";

export type StartStripeConnectOnboardingActionResult = {
  error?: string;
};

export type OnlineCheckoutActionResult = {
  error?: string;
};

async function requireStripeConnectOnboardingContext() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." as const };
  }

  return { context };
}

async function requireOnlineCheckoutManagementContext() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." as const };
  }

  const accessError = assertOnlineCheckoutManagementAccess(context);
  if (accessError) {
    return { error: accessError };
  }

  return { context };
}

export async function startStripeConnectOnboardingAction(): Promise<StartStripeConnectOnboardingActionResult> {
  const contextResult = await requireStripeConnectOnboardingContext();
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const accessError = assertStripeConnectOnboardingAccess(contextResult.context);
  if (accessError) {
    return { error: accessError };
  }

  if (!isStripeConnectOnboardingConfigured()) {
    return {
      error:
        "Stripe setup is not configured yet. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL, then restart the app.",
    };
  }

  const onboardingUrls = buildStripeConnectOnboardingUrls();
  if (!onboardingUrls) {
    return {
      error:
        "App URL is not configured. Set NEXT_PUBLIC_APP_URL before starting Stripe setup.",
    };
  }

  const companyId = contextResult.context.company.id;

  let providerAccountId: string;

  try {
    const existingAccount = await getCompanyPaymentAccount(companyId, "stripe");
    providerAccountId = existingAccount?.providerAccountId ?? "";

    if (!providerAccountId) {
      providerAccountId = await createStripeExpressConnectedAccount(companyId);

      if (existingAccount) {
        const attachResult = await attachStripeProviderAccountId(
          companyId,
          existingAccount.id,
          providerAccountId,
        );

        if (attachResult.error || !attachResult.account) {
          return {
            error: attachResult.error ?? "Failed to link Stripe account.",
          };
        }
      } else {
        const insertResult = await insertStripePaymentAccountForOnboarding(
          companyId,
          providerAccountId,
        );

        if (insertResult.error || !insertResult.account) {
          return {
            error: insertResult.error ?? "Failed to save Stripe account linkage.",
          };
        }
      }
    }
  } catch (error) {
    console.error("[startStripeConnectOnboardingAction] failed:", {
      companyId,
      error,
    });
    return { error: mapStripeConnectSetupError(error) };
  }

  let onboardingUrl: string;

  try {
    onboardingUrl = await createStripeAccountOnboardingLink(
      providerAccountId,
      onboardingUrls,
    );
  } catch (error) {
    console.error("[startStripeConnectOnboardingAction] account link failed:", {
      companyId,
      error,
    });
    return { error: mapStripeConnectSetupError(error) };
  }

  revalidatePath("/settings");
  redirect(onboardingUrl);
}

export async function enableOnlineCheckoutAction(): Promise<OnlineCheckoutActionResult> {
  const contextResult = await requireOnlineCheckoutManagementContext();
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const companyId = contextResult.context.company.id;
  const result = await enableOnlineCheckoutForCompany(companyId);

  if (!result.ok) {
    return { error: result.error ?? "Failed to enable online checkout." };
  }

  revalidatePath("/settings");
  return {};
}

export async function disableOnlineCheckoutAction(): Promise<OnlineCheckoutActionResult> {
  const contextResult = await requireOnlineCheckoutManagementContext();
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const companyId = contextResult.context.company.id;
  const result = await disableOnlineCheckoutForCompany(companyId);

  if (!result.ok) {
    return { error: result.error ?? "Failed to disable online checkout." };
  }

  revalidatePath("/settings");
  return {};
}
