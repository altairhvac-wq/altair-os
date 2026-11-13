import type { Metadata } from "next";
import { unsubscribeResourceSubscriptionAction } from "@/app/actions/resource-subscribers";
import { verifySubscriberLink } from "@/lib/resources/subscribers";
import { SubscriberLinkPage } from "@/shared/components/resources/SubscriberLinkPage";

/** A personal link from an email: never indexed, never cached. */
export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

export default async function UnsubscribeResourceEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const id = first(params.id);
  const token = first(params.t);
  const link = verifySubscriberLink("unsubscribe", id, token) && token ? { id, token } : null;

  return (
    <SubscriberLinkPage
      action={unsubscribeResourceSubscriptionAction}
      link={link}
      state={first(params.state)}
      copy={{
        eyebrow: "Email list",
        title: "Unsubscribe",
        intro: "Press the button and we will stop emailing this address about new calculators and guides.",
        button: "Unsubscribe me",
        done: "Done. You are off the list and will not hear from us about new calculators or guides.",
        gone: "This address is not on the list, so there is nothing to stop.",
      }}
    />
  );
}
