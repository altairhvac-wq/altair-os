import type { Metadata } from "next";
import { confirmResourceSubscriptionAction } from "@/app/actions/resource-subscribers";
import { verifySubscriberLink } from "@/lib/resources/subscribers";
import { SubscriberLinkPage } from "@/shared/components/resources/SubscriberLinkPage";

/** A personal link from an email: never indexed, never cached. */
export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

export default async function ConfirmResourceEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const id = first(params.id);
  const token = first(params.t);
  const link = verifySubscriberLink("confirm", id, token) && token ? { id, token } : null;

  return (
    <SubscriberLinkPage
      action={confirmResourceSubscriptionAction}
      link={link}
      state={first(params.state)}
      copy={{
        eyebrow: "Email list",
        title: "Confirm your email",
        intro:
          "Press the button to get an email when a new calculator or guide comes out. About one a month, and every one has an unsubscribe link.",
        button: "Yes, add me to the list",
        done: "You are on the list. Thank you. We will write when there is something new and worth your time.",
        gone: "This address is not waiting to be confirmed. If you unsubscribed and want back on, tick the box on any calculator again.",
      }}
    />
  );
}
