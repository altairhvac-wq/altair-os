import { redirect } from "next/navigation";

/**
 * Legacy /settings/subscription route — Billing is canonical at
 * /settings/billing (ALTAIR_ARCHITECTURE.md naming law: the tab says
 * Billing, so the route says billing). Preserves the Stripe Connect
 * return/refresh query params that external return URLs still carry.
 */
export default async function SubscriptionSettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ payments?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.payments === "return" || params.payments === "refresh"
      ? `?payments=${params.payments}`
      : "";

  redirect(`/settings/billing${notice}`);
}
