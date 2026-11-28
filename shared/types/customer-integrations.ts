/**
 * Settings > Integrations, as a customer company sees it.
 *
 * ============ WHAT THIS PAGE IS FOR ============
 * An owner comparing Altair with a bigger tool asks one question: "what does
 * it connect to?" Until 2026-11-27 the honest answer was scattered (a row on
 * Company, a sentence under it, the public "not yet" list) and the
 * Integrations tab itself was hidden from every customer because it listed the
 * founder's marketing channels. This module is the one list a customer reads:
 * what works today, what does not exist yet, and what this company has asked
 * for.
 *
 * ============ NOTHING HERE CLAIMS A CONNECTION ============
 * Every entry in PLANNED_INTEGRATIONS is something Altair does NOT do. The
 * page shows them under "Not available yet" with no button, no logo and no
 * date. A name is there only so an owner can say "I would use that one".
 * When one ships, move it out of this list in the same pull request, and
 * delete the matching line in shared/lib/site/not-yet.ts.
 *
 * ============ WHY REQUESTS ARE TEXT IN THE FEEDBACK TABLE ============
 * A request is stored as one row in `beta_feedback_reports`, the table the
 * in-app Feedback button already writes and the founder already reads at
 * /platform/bugs. No new table, so nothing waits on a migration. The row is
 * recognised by its `page_url` (INTEGRATION_REQUEST_PAGE_URL) and the names
 * are read back from the first line of the message, so the page can show
 * "You asked for this" next time. buildIntegrationRequestMessage and
 * parseIntegrationRequestMessage are a pair: change one, change the other
 * (scripts/verify-customer-integrations.mjs checks the round trip).
 *
 * Pure (type-only imports). Safe to import from client components.
 */
import type { CompanyPaymentAccountStatus } from "@/lib/payments/types";

export type PlannedIntegrationGroupId =
  | "accounting"
  | "calendar"
  | "automation"
  | "payroll"
  | "growth";

export type PlannedIntegration = {
  /** Stable id. Never shown; never reuse one for a different product. */
  readonly key: string;
  readonly group: PlannedIntegrationGroupId;
  /** The name an owner would say. Plain text only: no logo, no "partner". */
  readonly label: string;
  /** What it would do, in one plain sentence. Written as "would", not "does". */
  readonly wouldDo: string;
  /**
   * Earlier labels for the same key, so a request sent under an old name is
   * still recognised after a rename.
   */
  readonly formerLabels?: readonly string[];
};

export const PLANNED_INTEGRATION_GROUPS: readonly {
  readonly id: PlannedIntegrationGroupId;
  readonly title: string;
}[] = [
  { id: "accounting", title: "Accounting" },
  { id: "calendar", title: "Calendar" },
  { id: "automation", title: "Linking other apps" },
  { id: "payroll", title: "Payroll" },
  { id: "growth", title: "Leads, reviews and financing" },
];

export const PLANNED_INTEGRATIONS: readonly PlannedIntegration[] = [
  {
    key: "quickbooks_online",
    group: "accounting",
    label: "QuickBooks Online",
    wouldDo:
      "Invoices, payments and customers would go to your books without anyone typing them twice.",
  },
  {
    key: "quickbooks_desktop",
    group: "accounting",
    label: "QuickBooks Desktop",
    wouldDo:
      "The same, for the QuickBooks that is installed on an office computer.",
  },
  {
    key: "xero",
    group: "accounting",
    label: "Xero",
    wouldDo: "Invoices, payments and customers would go to Xero.",
  },
  {
    key: "google_calendar",
    group: "calendar",
    label: "Google Calendar",
    wouldDo: "Scheduled jobs would show on your Google calendar.",
  },
  {
    key: "outlook_calendar",
    group: "calendar",
    label: "Outlook calendar",
    wouldDo: "Scheduled jobs would show on your Outlook calendar.",
  },
  {
    key: "zapier",
    group: "automation",
    label: "Zapier",
    wouldDo:
      "A service that passes information between apps. A new customer, job or invoice in Altair could be sent on to the other tools you use.",
  },
  {
    key: "payroll",
    group: "payroll",
    label: "Payroll services such as Gusto or ADP",
    wouldDo: "Approved hours would go to your payroll service.",
  },
  {
    key: "lead_sources",
    group: "growth",
    label: "Lead sites such as Google Local Services, Angi or Thumbtack",
    wouldDo: "A new lead from one of these would land in Altair on its own.",
  },
  {
    key: "review_requests",
    group: "growth",
    label: "Review services such as NiceJob or Podium",
    wouldDo:
      "A finished job would ask the customer for a review without anyone remembering to.",
  },
  {
    key: "financing",
    group: "growth",
    label: "Customer financing such as Wisetack",
    wouldDo:
      "A customer could apply to pay a large estimate in monthly payments.",
  },
];

/** Marks a feedback row as an integration request. Path only, never a host. */
export const INTEGRATION_REQUEST_PAGE_URL = "/settings/integrations#request";

export const INTEGRATION_REQUEST_NOTE_MAX_LENGTH = 500;

/** A company that has sent this many in a day is told they all arrived. */
export const INTEGRATION_REQUEST_DAILY_LIMIT = 5;

const ASKED_FOR_PREFIX = "Asked for: ";
const NOTE_PREFIX = "In their words: ";
/** Between names on the "Asked for" line. No label may contain it. */
const LABEL_SEPARATOR = " | ";

export type IntegrationRequestInput = {
  keys: readonly string[];
  note: string;
};

/**
 * Keeps only known keys, once each, in catalog order, and trims the note.
 * The action calls this on whatever the browser sent.
 */
export function normalizeIntegrationRequest(input: {
  keys: unknown;
  note: unknown;
}): IntegrationRequestInput {
  const sent = new Set(
    Array.isArray(input.keys)
      ? input.keys.filter((key): key is string => typeof key === "string")
      : [],
  );
  const keys = PLANNED_INTEGRATIONS.filter((item) => sent.has(item.key)).map(
    (item) => item.key,
  );
  const note =
    typeof input.note === "string"
      ? input.note
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, INTEGRATION_REQUEST_NOTE_MAX_LENGTH)
      : "";

  return { keys, note };
}

/** The message stored on the feedback row, and what the founder reads. */
export function buildIntegrationRequestMessage(
  request: IntegrationRequestInput,
): string {
  const labels = PLANNED_INTEGRATIONS.filter((item) =>
    request.keys.includes(item.key),
  ).map((item) => item.label);
  const lines = ["Integration request (from Settings > Integrations)"];

  if (labels.length > 0) {
    lines.push(`${ASKED_FOR_PREFIX}${labels.join(LABEL_SEPARATOR)}`);
  }

  if (request.note) {
    lines.push(`${NOTE_PREFIX}${request.note}`);
  }

  return lines.join("\n");
}

/** Reads the keys back out of a stored message. Unknown names are ignored. */
export function parseIntegrationRequestMessage(message: string): string[] {
  const askedLine = message
    .split("\n")
    .find((line) => line.startsWith(ASKED_FOR_PREFIX));

  if (!askedLine) {
    return [];
  }

  const names = new Set(
    askedLine
      .slice(ASKED_FOR_PREFIX.length)
      .split(LABEL_SEPARATOR)
      .map((name) => name.trim()),
  );

  return PLANNED_INTEGRATIONS.filter(
    (item) =>
      names.has(item.label) ||
      (item.formerLabels ?? []).some((label) => names.has(label)),
  ).map((item) => item.key);
}

/** What this company has already asked for: key to the day it first asked. */
export type CompanyIntegrationRequests = {
  /** ISO timestamps by integration key. */
  readonly requestedAt: Readonly<Record<string, string>>;
  /** Requests sent in the last 24 hours, for the daily limit. */
  readonly sentInLastDay: number;
};

export const NO_INTEGRATION_REQUESTS: CompanyIntegrationRequests = {
  requestedAt: {},
  sentInLastDay: 0,
};

/**
 * Folds stored rows into what the page shows. `rows` may be in any order;
 * the earliest request for a key wins, so the date never moves.
 */
export function summarizeIntegrationRequests(
  rows: readonly { message: string; createdAt: string }[],
  nowIso: string,
): CompanyIntegrationRequests {
  const requestedAt: Record<string, string> = {};
  const dayAgo = Date.parse(nowIso) - 24 * 60 * 60 * 1000;
  let sentInLastDay = 0;

  for (const row of rows) {
    const created = Date.parse(row.createdAt);

    if (Number.isFinite(created) && created >= dayAgo) {
      sentInLastDay += 1;
    }

    for (const key of parseIntegrationRequestMessage(row.message)) {
      const existing = requestedAt[key];

      if (!existing || row.createdAt < existing) {
        requestedAt[key] = row.createdAt;
      }
    }
  }

  return { requestedAt, sentInLastDay };
}

/* ------------------------------------------------------------------ */
/* Card payments (Stripe): the one outside service a company connects. */
/* ------------------------------------------------------------------ */

export type CardPaymentsConnectionTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type CardPaymentsConnection = {
  readonly statusLabel: string;
  readonly tone: CardPaymentsConnectionTone;
  /** One sentence under the name. */
  readonly detail: string;
  /** Words on the link to Settings > Billing. */
  readonly linkLabel: string;
};

/**
 * What the page needs to know about a company's Stripe account. `readyToCharge`
 * is the SAME test the checkout applies before it will take a card
 * (lib/payments/stripe-checkout.ts): charges and payouts on, onboarding
 * finished, not disabled, and Stripe's card-payments capability active. The
 * page works it out with the Billing page's own helpers, so this row can
 * never say "Connected" while Billing says "pending".
 */
export type CardPaymentsAccountFacts = {
  status: CompanyPaymentAccountStatus;
  onlinePaymentsEnabled: boolean;
  readyToCharge: boolean;
};

/**
 * `account` is null when the company has never started Stripe setup, and
 * "hidden" when the signed-in person may not see payment settings (the row
 * then says what the connection is, without a status it cannot know).
 */
export function describeCardPaymentsConnection(
  account: CardPaymentsAccountFacts | null | "hidden",
): CardPaymentsConnection {
  if (account === "hidden") {
    return {
      statusLabel: "Ask an owner",
      tone: "neutral",
      detail:
        "Customers pay an invoice by card from a link. An owner or admin sets it up.",
      linkLabel: "Open Billing",
    };
  }

  if (!account || account.status === "not_connected") {
    return {
      statusLabel: "Not set up",
      tone: "neutral",
      detail:
        "Customers pay an invoice by card from a link, and the money goes to your bank through your own Stripe account.",
      linkLabel: "Set up in Billing",
    };
  }

  if (account.status === "disabled" || account.status === "error") {
    return {
      statusLabel: "Needs attention",
      tone: "danger",
      detail:
        "Card payments are not working right now. Billing shows what Stripe needs.",
      linkLabel: "Open Billing",
    };
  }

  // Pending, restricted, or "active" with something still missing on
  // Stripe's side: all the same to an owner, and none of them can take a card.
  if (account.status !== "active" || !account.readyToCharge) {
    return {
      statusLabel: "Setup not finished",
      tone: "warning",
      detail:
        "Stripe still needs something from you before customers can pay by card.",
      linkLabel: "Finish in Billing",
    };
  }

  if (!account.onlinePaymentsEnabled) {
    return {
      statusLabel: "Connected, turned off",
      tone: "info",
      detail:
        "Your Stripe account is connected. Paying by card is turned off until you switch it on in Billing.",
      linkLabel: "Turn on in Billing",
    };
  }

  return {
    statusLabel: "Connected",
    tone: "success",
    detail:
      "Customers can pay an invoice by card from a link. The money goes to your bank through your own Stripe account.",
    linkLabel: "Manage in Billing",
  };
}
