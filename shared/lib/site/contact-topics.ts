/**
 * The subjects the "write to us" helper on /contact offers. The message goes
 * from the visitor's own email app; see shared/components/marketing/ContactComposer.tsx.
 *
 * Pure (no imports), so the client component does not pull in the plan
 * catalog that shared/lib/site/contact.ts reads through the site FAQ.
 */
export const CONTACT_TOPICS = [
  { value: "trial", label: "A question before the trial", subject: "Question before the trial" },
  { value: "account", label: "Help with my account", subject: "Help with my account" },
  { value: "billing", label: "Billing or my plan", subject: "Billing question" },
  { value: "switching", label: "Moving from other software", subject: "Moving from other software" },
  { value: "directory", label: "My directory listing", subject: "Directory listing" },
  { value: "affiliates", label: "The affiliate program", subject: "Affiliate program" },
  { value: "other", label: "Something else", subject: "Question" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

/** Message length the helper allows; mail apps cut very long mailto links short. */
export const CONTACT_MESSAGE_MAX = 1500;
