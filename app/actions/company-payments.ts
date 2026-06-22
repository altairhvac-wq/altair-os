"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertStripeConnectOnboardingAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import {
  attachStripeProviderAccountId,
  insertStripePaymentAccountForOnboarding,
} from "@/lib/database/services/company-payment-accounts";
import { isStripeConnectOnboardingConfigured } from "@/lib/payments/env";
import {
  buildStripeConnectOnboardingUrls,
  createStripeAccountOnboardingLink,
  createStripeExpressConnectedAccount,
} from "@/lib/payments/stripe-connect";

export type StartStripeConnectOnboardingActionResult = {
  error?: string;
};

async function requireStripeConnectOnboardingContext() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." as const };
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
        "Stripe Connect onboarding is not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL.",
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
    return { error: "Failed to start Stripe setup. Please try again." };
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
    return { error: "Failed to create Stripe onboarding link. Please try again." };
  }

  revalidatePath("/settings");
  redirect(onboardingUrl);
}
