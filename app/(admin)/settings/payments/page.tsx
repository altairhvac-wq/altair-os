import { redirect } from "next/navigation";

/**
 * Legacy /settings/payments route — customer payments live in the Billing
 * page's Customer payments section (/settings/billing#customer-payments).
 * Kept so Stripe Connect return URLs and old links keep working.
 */
export default async function PaymentsSettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ payments?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.payments === "return" || params.payments === "refresh"
      ? `?payments=${params.payments}`
      : "";

  redirect(`/settings/billing${notice}#customer-payments`);
}
