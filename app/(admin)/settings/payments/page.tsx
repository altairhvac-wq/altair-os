import { redirect } from "next/navigation";

/**
 * Customer payments now live under Billing (`/settings/subscription`).
 * Keep this route as a redirect so Stripe Connect return URLs and old links work.
 */
export default async function PaymentsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payments?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.payments === "return" || params.payments === "refresh"
      ? `?payments=${params.payments}`
      : "";

  redirect(`/settings/subscription${notice}#customer-payments`);
}
