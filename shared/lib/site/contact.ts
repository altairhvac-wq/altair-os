import { AFFILIATE_PROGRAM } from "@/shared/types/affiliates";
import { SITE_FAQ, type SiteFaqItem } from "@/shared/lib/site/faq";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

/**
 * The words on /contact.
 *
 * ============ NO PROMISED REPLY TIME FOR EMAIL ============
 * Nothing in the product or the site states how fast an email is answered,
 * so this page does not either. The two times it does show are the ones the
 * product already promises in its own emails and forms: affiliate
 * applications (lib/affiliates/emails.ts, app/actions/affiliates.ts) and
 * directory listings (app/actions/directory.ts, lib/directory/emails.ts).
 * Change them there first.
 */

export const CONTACT_PATH = "/contact";

export const CONTACT_EXPECTATIONS: readonly { readonly title: string; readonly text: string; readonly href?: string; readonly linkLabel?: string }[] = [
  {
    title: "Email",
    text: `A person reads every message to ${SUPPORT_EMAIL}: the founder. Support, billing and sales all go to the same inbox.`,
  },
  {
    title: "Setup call",
    text: "A free one-on-one call on Zoom for every customer, booked from your workspace after you sign up, at a time that suits you.",
  },
  {
    title: "Directory listings",
    text: "A person checks each new listing before it shows, usually within one business day.",
    href: "/directory/list",
    linkLabel: "List your business",
  },
  {
    title: "Affiliate applications",
    text: `A person reads every application and replies within 5 business days. There are ${AFFILIATE_PROGRAM.foundingPlaces} founding places.`,
    href: "/affiliates",
    linkLabel: "Read about the program",
  },
];

function siteFaq(id: string): SiteFaqItem {
  const item = SITE_FAQ.find((entry) => entry.id === id);
  if (!item) throw new Error(`The contact page quotes the site FAQ "${id}", which no longer exists.`);
  return item;
}

/** The contact page's own questions; the FAQPage JSON-LD is built from this same list. */
export const CONTACT_FAQ: readonly SiteFaqItem[] = [
  {
    id: "who-reads",
    question: "Who reads my email?",
    answer: `The founder. Altair Operating System is a small company with no sales team, and ${SUPPORT_EMAIL} is the one inbox for support, billing and sales.`,
  },
  {
    id: "phone",
    question: "Can I talk to someone instead of writing?",
    answer:
      "Yes. Every customer can book a free one-on-one setup call on Zoom from the workspace after signing up. Before that, email is the way to reach us.",
  },
  {
    id: "see-first",
    question: "Can I see the product before I sign up?",
    answer:
      "Yes. The two-minute video on the How it works page shows one job from the first call to paid, in the real product with sample data. In the trial you can load a full set of sample customers, jobs and invoices from Settings.",
  },
  siteFaq("card"),
  siteFaq("onboarding"),
  siteFaq("import"),
  siteFaq("data-out"),
  {
    id: "directory",
    question: "How do I get my business into the directory?",
    answer:
      "Fill in the free listing form. There is no account to create. A person checks each listing before it goes live, usually within one business day.",
  },
];
