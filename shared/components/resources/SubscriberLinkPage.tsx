import Link from "next/link";
import {
  ResourceCard,
  ResourcePageShell,
  resourceLinkClass,
} from "@/shared/components/resources/ResourcePageShell";
import { RESOURCES_CALCULATORS_PATH } from "@/shared/lib/resources/catalog";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

/**
 * The page behind a confirm or unsubscribe link from a Resource Center email.
 *
 * Opening the link changes nothing: it shows one button, and the button
 * posts to a server action that checks the link again. `state` is the plain
 * word that action redirected back with.
 */

export type SubscriberLinkCopy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly button: string;
  readonly done: string;
  /** Shown when the row is not there to change (or, for confirm, was unsubscribed since). */
  readonly gone: string;
};

export function SubscriberLinkPage({
  copy,
  action,
  link,
  state,
}: {
  readonly copy: SubscriberLinkCopy;
  readonly action: (formData: FormData) => Promise<void>;
  /** The checked id and signature from the address bar; null when they do not check out. */
  readonly link: { readonly id: string; readonly token: string } | null;
  readonly state: string | null;
}) {
  const message =
    state === "done"
      ? copy.done
      : state === "gone"
        ? copy.gone
        : state === "busy"
          ? "That did not go through just now. Please open the link from your email again in a few minutes."
          : state === "invalid" || !link
            ? "This link is not complete or has been changed. Open it again from the email, or write to us and we will sort it out."
            : null;

  return (
    <ResourcePageShell eyebrow={copy.eyebrow} title={copy.title} intro={<p>{copy.intro}</p>}>
      <ResourceCard className="mx-auto mt-10 max-w-xl text-center">
        {message ? (
          <p role="status" className="text-sm leading-relaxed text-stone-800">
            {message}
          </p>
        ) : link ? (
          <form action={action}>
            <input type="hidden" name="id" value={link.id} />
            <input type="hidden" name="t" value={link.token} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0A0A0A] px-6 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/60"
            >
              {copy.button}
            </button>
          </form>
        ) : null}
        <p className="mt-5 text-xs leading-relaxed text-stone-500">
          <Link href={RESOURCES_CALCULATORS_PATH} className={resourceLinkClass}>
            Back to the calculators
          </Link>{" "}
          · Questions:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={resourceLinkClass}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </ResourceCard>
    </ResourcePageShell>
  );
}
