"use server";

import { redirect } from "next/navigation";
import {
  confirmSubscriber,
  unsubscribeSubscriber,
  verifySubscriberLink,
  type SubscriberChangeOutcome,
  type SubscriberLinkPurpose,
} from "@/lib/resources/subscribers";
import { enforcePublicRateLimit, resolveRequestAddress } from "@/lib/security/public-rate-limit";
import {
  RESOURCE_EMAIL_CONFIRM_PATH,
  RESOURCE_EMAIL_UNSUBSCRIBE_PATH,
} from "@/shared/lib/resources/email-list";

/**
 * The buttons on /resources/email/confirm and /resources/email/unsubscribe.
 *
 * These run for people with no account, so the signed link is the whole
 * authorization: the id and signature posted by the form are checked again
 * here (never trusted because the page rendered), and only then does the row
 * change. The address-level limit is the same one that guards the other
 * token pages; it makes walking ids pointless even before the signature
 * check refuses them.
 *
 * Each action ends in a redirect back to its page with a plain state word,
 * so a refresh does not post the form again.
 */

const PATHS: Record<SubscriberLinkPurpose, string> = {
  confirm: RESOURCE_EMAIL_CONFIRM_PATH,
  unsubscribe: RESOURCE_EMAIL_UNSUBSCRIBE_PATH,
};

async function run(purpose: SubscriberLinkPurpose, formData: FormData): Promise<never> {
  const id = formData.get("id");
  const token = formData.get("t");
  const path = PATHS[purpose];

  const limit = await enforcePublicRateLimit("public.token_view", { ip: await resolveRequestAddress() });
  if (!limit.allowed) redirect(`${path}?state=busy`);

  if (!verifySubscriberLink(purpose, id, token)) redirect(`${path}?state=invalid`);

  const outcome: SubscriberChangeOutcome =
    purpose === "confirm" ? await confirmSubscriber(id) : await unsubscribeSubscriber(id);
  const state = outcome === "done" ? "done" : outcome === "not_found" ? "gone" : "busy";
  redirect(`${path}?state=${state}`);
}

export async function confirmResourceSubscriptionAction(formData: FormData): Promise<void> {
  await run("confirm", formData);
}

export async function unsubscribeResourceSubscriptionAction(formData: FormData): Promise<void> {
  await run("unsubscribe", formData);
}
