import { SAAS_SUBSCRIPTION_CATALOG, SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";
import type { ComparisonPagePath } from "@/shared/lib/site/comparison-paths";
import { CUSTOMER_IMPORT_MAX_ROWS } from "@/shared/lib/customer-import-mapping";

/**
 * ==================== COMPETITOR COMPARISON PAGES ====================
 * The words on /servicetitan-alternative and /jobber-housecall-pro-alternatives.
 *
 * Two rules keep these pages honest, and both matter more than any keyword:
 *
 * 1. Altair facts come from the product. Prices, user allowances and the
 *    trial length are read from the plan catalog below, so a price change in
 *    the catalog changes these pages too. Feature claims are limited to what
 *    ships today (see shared/lib/site/landing-pages.ts). Altair sends
 *    records to QuickBooks Online (not QuickBooks Desktop) and has no phone
 *    system, drag-and-drop scheduling, automatic routing or live GPS, and
 *    the pages say so where it matters.
 *
 * 2. Competitor facts come from that company's own website or filings,
 *    checked on COMPETITOR_FACTS_CHECKED. No third-party price estimates, no
 *    opinions presented as facts. A company that doesn't publish prices is
 *    described as not publishing prices. Re-check every competitor page
 *    before changing a number here; Workiz in particular has changed its
 *    pricing page several times in 2026.
 *
 * Re-checked 2026-11-21 (site upgrade batch 5), each fact against the page
 * it is sourced to. Changed then: ServiceTitan's packages are now Core,
 * Demand AI, Field AI and MAX behind a "Get Pricing" button, and its pricing
 * page no longer says "per technician" or "at any size" (the technician
 * fact now cites the 10-K, which says "partially"); Jobber's Receptionist
 * add-on is $99/mo and its Core card offers extra users; Kickserv's prices
 * are quoted billed monthly with the annual figures beside them; Workiz lists
 * its Genius Phone add-on as sold separately. Removed then, because no page
 * says it: "Housecall Pro's trade packages are priced separately".
 */

export const COMPETITOR_FACTS_CHECKED = "November 21, 2026";
/** The same day, machine-readable, for the <time> element on the pages. */
export const COMPETITOR_FACTS_CHECKED_ISO = "2026-11-21";

export type ComparisonPageContent = {
  readonly path: ComparisonPagePath;
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly eyebrow: string;
  readonly headline: string;
  readonly intro: readonly string[];
  readonly priceNote: string;
  readonly table: {
    readonly heading: string;
    /** The first column is always Altair; it is highlighted. */
    readonly columns: readonly string[];
    readonly rows: readonly { readonly label: string; readonly cells: readonly string[] }[];
    readonly footnote: string;
  };
  readonly reasons: {
    readonly eyebrow: string;
    readonly heading: string;
    readonly items: readonly { readonly title: string; readonly text: string }[];
  };
  readonly alternatives?: {
    readonly heading: string;
    readonly items: readonly {
      readonly name: string;
      readonly summary: string;
      readonly goodFor: string;
      readonly worthKnowing: string;
      readonly highlight?: boolean;
    }[];
  };
  readonly fit: {
    readonly heading: string;
    readonly themTitle: string;
    readonly them: readonly string[];
    readonly usTitle: string;
    readonly us: readonly string[];
  };
  /** The moving-day checklist: customers, price book, open invoices, team. */
  readonly switching: SwitchingChecklist;
  readonly faq: {
    readonly heading: string;
    readonly items: readonly { readonly question: string; readonly answer: string }[];
  };
  readonly closing: { readonly heading: string; readonly text: string };
  readonly related: readonly { readonly href: string; readonly label: string }[];
  readonly sources: {
    readonly note: string;
    readonly items: readonly { readonly label: string; readonly url: string }[];
    readonly trademarks: string;
  };
};

// ---------- Altair facts, from the catalog ----------
const TRIAL_DAYS = SAAS_TRIAL_CONFIG.durationDays;
type CatalogPlan = (typeof SAAS_SUBSCRIPTION_CATALOG)[keyof typeof SAAS_SUBSCRIPTION_CATALOG];

/** A paid plan's numbers, or a build-time error if the catalog ever stops publishing one. */
function paid(plan: CatalogPlan) {
  const { monthlyPriceUsd, annualPriceUsd, includedAccounts } = plan;
  if (monthlyPriceUsd === null || annualPriceUsd === null || includedAccounts === null) {
    throw new Error(`Comparison pages quote ${plan.label}, which has no published price.`);
  }
  return { monthlyPriceUsd, annualPriceUsd, includedAccounts };
}

const STARTER = paid(SAAS_SUBSCRIPTION_CATALOG.starter);
const GROWTH = paid(SAAS_SUBSCRIPTION_CATALOG.growth);
const PRO = paid(SAAS_SUBSCRIPTION_CATALOG.pro);
const PRO_EXTRA_USER_USD = (() => {
  const price = SAAS_SUBSCRIPTION_CATALOG.pro.additionalAccountPriceUsd;
  if (price === null) throw new Error("Comparison pages quote Pro's extra-user price, which the catalog no longer sets.");
  return price;
})();
const usd = (value: number) => `$${value.toLocaleString("en-US")}`;
const monthly = (plan: { monthlyPriceUsd: number }) => `${usd(plan.monthlyPriceUsd)}/mo`;

// ---------- A five-person shop, month to month ----------
// One pair of competitor numbers, used by the Jobber & Housecall Pro page
// below AND by the price comparison on /pricing, so the two cannot disagree.
// List prices for 5 users, billed monthly, from each company's own pricing
// page on COMPETITOR_FACTS_CHECKED. Re-check both before changing either.
const JOBBER_CONNECT_5_USERS_USD = 199;
const HOUSECALL_PRO_ESSENTIALS_5_USERS_USD = 189;

export type FiveUserPriceRow = {
  readonly name: string;
  readonly plan: string;
  readonly monthlyUsd: number;
  /** The company's own pricing page; absent for Altair (it is this site). */
  readonly sourceUrl?: string;
  readonly ours?: boolean;
};

/** What a five-person shop pays per month, for the table on /pricing. */
export const FIVE_USER_PRICE_COMPARISON: {
  readonly checkedOn: string;
  readonly users: number;
  readonly comparisonPath: ComparisonPagePath;
  readonly rows: readonly FiveUserPriceRow[];
} = {
  checkedOn: COMPETITOR_FACTS_CHECKED,
  users: 5,
  comparisonPath: "/jobber-housecall-pro-alternatives",
  rows: [
    { name: "Altair Operating System", plan: "Growth", monthlyUsd: GROWTH.monthlyPriceUsd, ours: true },
    {
      name: "Jobber",
      plan: "Connect",
      monthlyUsd: JOBBER_CONNECT_5_USERS_USD,
      sourceUrl: "https://www.getjobber.com/pricing/",
    },
    {
      name: "Housecall Pro",
      plan: "Essentials",
      monthlyUsd: HOUSECALL_PRO_ESSENTIALS_5_USERS_USD,
      sourceUrl: "https://www.housecallpro.com/pricing/",
    },
  ],
};

const ALTAIR_PRICE_LINE = `Starter ${monthly(STARTER)} (${STARTER.includedAccounts} user), Growth ${monthly(GROWTH)} (${GROWTH.includedAccounts} users), Pro ${monthly(PRO)} (${PRO.includedAccounts} users, then ${usd(PRO_EXTRA_USER_USD)}/mo per extra user).`;
const ALTAIR_PRICE_NOTE = `Plans from ${monthly(STARTER)} · ${TRIAL_DAYS} days free, no credit card · Cancel anytime`;
const ALTAIR_TRIAL = `${TRIAL_DAYS}-day free trial with the whole system. No credit card.`;
const ALTAIR_CONTRACT = "Monthly or annual billing, no long-term contract. Cancel from Settings.";
const ALTAIR_IMPORT_LIMITS =
  "Customers, the price book and unpaid invoices import from CSV or Excel files. Past jobs and equipment don't come across, so keep your old job export as your history and add equipment as you visit each site. Step-by-step export menus: altair-op.com/switch.";

const SHARED_TRADEMARK_NOTE = "Altair Operating System is not affiliated with or endorsed by any company named on this page.";

/** How the comparison was made, shown beside the "facts checked" date. */
export const COMPARISON_METHOD_NOTE =
  "Each competitor fact on this page comes from that company's own pricing page, feature page or annual report, and each source is linked at the bottom of the page. List prices are in US dollars, billed monthly, without promotions. A fact we could not find on the company's own pages is left out.";

// ---------- Moving over ----------
// Every step is what the product does today: the customer import and its
// presets (shared/lib/customer-import-mapping.ts, CSV or Excel, big files
// sent in batches), the price book import (shared/lib/price-book-import.ts),
// the unpaid invoice import, which creates draft invoices for balances still
// owed (shared/lib/invoice-import.ts), and team invitations from Settings.
// The full per-app export menus live on /switch (shared/lib/site/switch-page.ts).

export type SwitchingChecklist = {
  readonly heading: string;
  readonly intro: string;
  readonly steps: readonly { readonly title: string; readonly items: readonly string[] }[];
};

function buildSwitchingChecklist(from: string): SwitchingChecklist {
  return {
    heading: `Switching from ${from}: the checklist`,
    intro: `What to bring over, in the order that keeps the work moving. Run it during the ${TRIAL_DAYS}-day trial, while your old account is still open.`,
    steps: [
      {
        title: "Customers",
        items: [
          `Export your customer list from ${from}. CSV or Excel both work, as the file comes out.`,
          `In Altair, open Customers and choose Import. A preset for ${from} matches the columns; check the preview before you import.`,
          `A big list goes in one upload, ${CUSTOMER_IMPORT_MAX_ROWS} at a time behind the scenes. Names, phone numbers, emails, addresses and notes come across; equipment and job history do not.`,
        ],
      },
      {
        title: "Price book",
        items: [
          `Export your services and materials from ${from}.`,
          "In Altair, open Price Book and choose Import. Name, description, price, cost, taxable and category come across; items you already have are skipped.",
          "Need to check your flat-rate prices on the way? The free Labor Cost Workspace builds them from your own costs.",
        ],
      },
      {
        title: "Open invoices",
        items: [
          `Export your invoice list from ${from}, with the balance still owed.`,
          "In Altair, open Sales, then Invoices, and choose Import Unpaid. Each invoice with money owed becomes a draft for that balance on the right customer; you send it with its payment link (once Stripe is connected).",
          `Payments that arrive by check or cash are recorded on the invoice with Record payment. Keep ${from} open until the last old invoice is paid.`,
        ],
      },
      {
        title: "Your team and first job",
        items: [
          "Invite your office and technicians from Settings. Technicians open the phone view in their browser and can add it to the home screen.",
          "Run one real job end to end: estimate, approval, dispatch, invoice and payment.",
          `Cancel ${from} only after that job, and the old invoices, are done.`,
        ],
      },
    ],
  };
}

/** Two questions every switcher asks, the same on both pages. */
function switchingFaq(from: string): readonly { readonly question: string; readonly answer: string }[] {
  return [
    {
      question: `Can I bring my price book and open invoices over from ${from}?`,
      answer: `Yes. Both import from the CSV or Excel files ${from} exports. Price-book items you already have are skipped, and every invoice with money still owed becomes a draft invoice for that balance, which you send with its payment link. The menus to export each file are on our switching page.`,
    },
    {
      question: `Can I run Altair and ${from} side by side while I switch?`,
      answer: `Yes. The trial runs ${TRIAL_DAYS} days with no credit card, so you can import your customers, run real jobs in Altair and keep ${from} open until your old invoices are paid.`,
    },
  ];
}

// ====================================================================
// /servicetitan-alternative
// ====================================================================
const SERVICETITAN: ComparisonPageContent = {
  path: "/servicetitan-alternative",
  metaTitle: "ServiceTitan Alternative for HVAC · Altair Operating System",
  metaDescription:
    "A ServiceTitan alternative with public prices and no long contract. Pricing, contracts and setup compared from sourced facts, plus a switching checklist.",
  eyebrow: "Altair Operating System vs. ServiceTitan",
  headline: "A ServiceTitan alternative for small and growing HVAC shops",
  intro: [
    "ServiceTitan is a serious system. It doesn't publish prices, its annual report says contracts typically run 12 to 36 months, and onboarding is invoiced separately. That works for plenty of large operations. A smaller HVAC or field service shop may not need all of it, or want to pay for it.",
    `Altair is one connected system for the work a smaller shop does every day: leads, customers and the equipment on site, estimates customers approve from their phone, dispatch, a technician phone view, invoices and payment links. The prices are on our website, you can try it for ${TRIAL_DAYS} days without a card, and there's no contract after that.`,
  ],
  priceNote: ALTAIR_PRICE_NOTE,
  table: {
    heading: "Altair and ServiceTitan, side by side",
    columns: ["Altair", "ServiceTitan"],
    rows: [
      {
        label: "Pricing",
        cells: [
          `Published. ${ALTAIR_PRICE_LINE}`,
          "Not published. Its pricing page lists four packages (Core, Demand AI, Field AI and MAX) and a \"Get Pricing\" button. Its annual report says pricing is partly based on the number of technicians.",
        ],
      },
      {
        label: "Trying it",
        cells: [ALTAIR_TRIAL, "Book a demo or ask for pricing. Its pricing page doesn't offer a free trial or self-serve sign-up."],
      },
      {
        label: "Contract",
        cells: [
          ALTAIR_CONTRACT,
          "Contract terms typically run 12 to 36 months and renew automatically unless cancelled, per its fiscal 2026 annual report. Some customers are month to month.",
        ],
      },
      {
        label: "Onboarding",
        cells: [
          "Set up the account yourself in minutes. A one-on-one setup call on Zoom, booked when it suits you, is included on every plan.",
          "Onboarding and training fees are generally invoiced separately when the contract starts, per its annual report. The amount isn't published.",
        ],
      },
      {
        label: "Built for",
        cells: [
          "Small and growing HVAC and field service companies. Built by an HVAC company owner.",
          "Residential and commercial contractors, from a single shop to many locations, per its pricing page. Its annual report says most of its customers are small and medium-sized businesses.",
        ],
      },
      {
        label: "Adding a technician",
        cells: [
          `A known amount: every plan's user count and price is public. Past ${PRO.includedAccounts} users, each one is ${usd(PRO_EXTRA_USER_USD)}/mo.`,
          "Priced in your quote. Its annual report says pricing is partly based on the number of technicians a customer employs.",
        ],
      },
    ],
    footnote: `ServiceTitan details come from servicetitan.com and its fiscal 2026 annual report (Form 10-K), checked ${COMPETITOR_FACTS_CHECKED}. Prices and terms change, so ask ServiceTitan for a current written quote.`,
  },
  reasons: {
    eyebrow: "Where they differ",
    heading: "Four differences that matter to a smaller HVAC shop",
    items: [
      {
        title: "Prices you can see before you talk to anyone",
        text: `Every Altair plan and price is on our pricing page. Pro is ${monthly(PRO)} for up to ${PRO.includedAccounts} users, office included, and each user after that is ${usd(PRO_EXTRA_USER_USD)} a month. You know what hiring the next technician costs before you hire them.`,
      },
      {
        title: "Start today, not after an implementation project",
        text: "Create the account yourself, load sample data from Settings or import your customer list, and run a real job the same day. If you want a walkthrough, book a one-on-one setup call on Zoom at no extra cost.",
      },
      {
        title: "One record from first call to paid invoice",
        text: "The lead, the customer and the units on site, the estimate and its approval, the job, the invoice and the payment all live on one record. The approved estimate becomes the scheduled job, and the completed job becomes the invoice, so nobody types it twice.",
      },
      {
        title: "Nothing to get out of",
        text: `Pay monthly and cancel from Settings whenever you like, or pay yearly and get two months free (${usd(PRO.annualPriceUsd)} a year for Pro instead of ${usd(PRO.monthlyPriceUsd * 12)}). Altair has to earn the next month.`,
      },
    ],
  },
  fit: {
    heading: "When ServiceTitan is the better choice",
    themTitle: "ServiceTitan is likely the better fit if:",
    them: [
      "You run a large operation, with many trucks, several locations or a call center, and want one vendor for all of it.",
      "You have someone on staff whose job includes configuring and running the software.",
      "You need features Altair doesn't offer today, such as a built-in phone system, drag-and-drop scheduling, automatic routing, live technician GPS or QuickBooks Desktop sync. Confirm that whichever system you choose has them.",
      "A contract of a year or more and separate onboarding fees fit your budget.",
    ],
    usTitle: "Altair is likely the better fit if:",
    us: [
      "You run a small or growing HVAC or field service company and want the whole job, from call to payment, in one place.",
      "You want to see the price, try the system free and start without a sales call.",
      "You want the office and the technicians working from the same jobs, with customers paying from a link once Stripe is connected.",
      "You'd rather pay month to month than sign for a year or more.",
    ],
  },
  switching: buildSwitchingChecklist("ServiceTitan"),
  faq: {
    heading: "Questions about switching from ServiceTitan",
    items: [
      {
        question: "Can I bring my customers over from ServiceTitan?",
        answer: `Yes. Export your customers from ServiceTitan and upload the Excel file in Altair as it is. A ServiceTitan preset matches the columns for you. ${ALTAIR_IMPORT_LIMITS}`,
      },
      {
        question: "What does ServiceTitan cost?",
        answer:
          "ServiceTitan doesn't publish prices. Its pricing page asks you to get pricing from its team, and its annual report says pricing is partly based on the number of technicians and that onboarding fees are invoiced separately. If you're comparing, ask for a written quote that includes onboarding, the contract length, the cost of ending early and the price for each added technician.",
      },
      {
        question: "How much would Altair cost a shop with 9 people?",
        answer: `${usd(PRO.monthlyPriceUsd)} a month on Pro, which includes ${PRO.includedAccounts} users. A user is anyone who logs in: owner, office or technician. Each user past ${PRO.includedAccounts} is ${usd(PRO_EXTRA_USER_USD)} a month, and paying yearly brings Pro to ${usd(PRO.annualPriceUsd)} a year.`,
      },
      {
        question: "Does Altair work on my technicians' iPhones and Android phones?",
        answer:
          "Yes. The technician view runs in the phone's web browser, so it works on iPhone and Android, and it can be added to the home screen like an app. Technicians see the day's jobs, the customer and the equipment, and record what they did.",
      },
      {
        question: "Is there a long-term contract?",
        answer: `No. Try Altair free for ${TRIAL_DAYS} days with no credit card. After that, pay monthly and cancel any time, or pay yearly and get two months free.`,
      },
      ...switchingFaq("ServiceTitan"),
    ],
  },
  closing: {
    heading: "Run one real HVAC job through Altair this week",
    text: `Estimate, approval, dispatch, invoice, payment. ${TRIAL_DAYS} days free, no card, and you'll know whether it fits your shop.`,
  },
  related: [
    { href: "/jobber-housecall-pro-alternatives", label: "Jobber & Housecall Pro alternatives" },
    { href: "/pricing", label: "Altair pricing" },
    { href: VIDEO_PAGE_PATH, label: "How Altair works" },
  ],
  sources: {
    note: `Competitor facts were checked on ${COMPETITOR_FACTS_CHECKED}, on ServiceTitan's own pricing page and in its annual report filed with the SEC. Altair facts come from our pricing page and the product itself.`,
    items: [
      { label: "ServiceTitan pricing page", url: "https://www.servicetitan.com/pricing" },
      {
        label: "ServiceTitan, Inc. Form 10-K for the fiscal year ended January 31, 2026 (SEC)",
        url: "https://www.sec.gov/Archives/edgar/data/1638826/000163882626000028/ttan-20260131.htm",
      },
    ],
    trademarks: `ServiceTitan is a trademark of ServiceTitan, Inc. ${SHARED_TRADEMARK_NOTE}`,
  },
};

// ====================================================================
// /jobber-housecall-pro-alternatives
// ====================================================================
const JOBBER_HOUSECALL: ComparisonPageContent = {
  path: "/jobber-housecall-pro-alternatives",
  metaTitle: "Jobber & Housecall Pro Alternatives for HVAC (2026)",
  metaDescription:
    "Jobber and Housecall Pro for an HVAC shop: 2026 prices, user limits and contracts side by side, plus Workiz, FieldPulse, Kickserv and Altair.",
  eyebrow: "HVAC software compared",
  headline: "Jobber and Housecall Pro alternatives for HVAC contractors",
  intro: [
    "Jobber and Housecall Pro are two well-known names in field service software, and both serve HVAC companies. What catches growing shops out is how the price moves. Both charge by plan tier and by number of users, and some tools, like QuickBooks sync, only start on a higher tier.",
    "Here is what each one costs on its own website today, what the money gets you, how three other options compare, and where Altair fits.",
  ],
  priceNote: ALTAIR_PRICE_NOTE,
  table: {
    heading: "Prices and limits, side by side",
    columns: ["Altair", "Jobber", "Housecall Pro"],
    rows: [
      {
        label: "1 user",
        cells: [
          `${monthly(STARTER)} (Starter)`,
          "$49/mo (Core). $39 with a 1-year commitment, $29 billed annually.",
          "$79/mo (Basic). $59 billed annually.",
        ],
      },
      {
        label: "5 users",
        cells: [
          `${monthly(GROWTH)} (Growth)`,
          `${usd(JOBBER_CONNECT_5_USERS_USD)}/mo (Connect) or $299/mo (Grow). Core includes 1 user.`,
          `${usd(HOUSECALL_PRO_ESSENTIALS_5_USERS_USD)}/mo (Essentials). $149 billed annually.`,
        ],
      },
      {
        label: "10 users",
        cells: [
          `${monthly(PRO)} (Pro)`,
          "$299/mo (Connect) or $399/mo (Grow).",
          "$399/mo: MAX at $329 includes 8 users, plus $35 for each extra user.",
        ],
      },
      {
        label: "Extra users",
        cells: [
          `${usd(PRO_EXTRA_USER_USD)}/mo each past ${PRO.includedAccounts} (Pro)`,
          "$29/mo each. Teams of 16 or more get a custom quote.",
          "$35/mo each on MAX. No extra-user price is listed for Basic or Essentials.",
        ],
      },
      {
        label: "Features by plan",
        cells: [
          "Every plan has the same features. Plans differ only in how many users they include.",
          "QuickBooks Online sync and automated quote follow-ups start on Connect. Job costing and two-way texting start on Grow.",
          "Job costing is on Basic. QuickBooks sync and GPS tracking start on Essentials. Route optimization, Zapier and the open API are MAX only.",
        ],
      },
      {
        label: "QuickBooks sync",
        cells: [
          "QuickBooks Online on every plan: customers, items, invoices and payments. Not QuickBooks Desktop.",
          "From Connect ($139/mo for 1 user).",
          "From Essentials ($189/mo).",
        ],
      },
      {
        label: "Free trial",
        cells: [ALTAIR_TRIAL, "14 days on the Grow plan, no credit card.", "14 days with full MAX access, no credit card."],
      },
      {
        label: "Contract",
        cells: [
          ALTAIR_CONTRACT,
          "Monthly with no commitment, monthly with a 1-year commitment, or prepaid annually (non-refundable). All plans auto-renew.",
          "No long-term contracts, per its pricing FAQ.",
        ],
      },
    ],
    footnote: `Each company's own published prices in USD, checked ${COMPETITOR_FACTS_CHECKED}. Jobber prices are for monthly billing with no commitment unless noted. Both companies also run introductory promotions not shown here. Check their pricing pages before you decide.`,
  },
  reasons: {
    eyebrow: "Before you pick",
    heading: "Four things to check before you choose an HVAC system",
    items: [
      {
        title: "What it costs when you add two more people",
        text: `Both Jobber and Housecall Pro price by tier and by user count. On Jobber's Connect plan, going from 1 user to 5 takes the monthly price from $139 to ${usd(JOBBER_CONNECT_5_USERS_USD)}. On Housecall Pro, 1 user on Basic is $79 and 5 users on Essentials is ${usd(HOUSECALL_PRO_ESSENTIALS_5_USERS_USD)}. On Altair, 1 user is ${usd(STARTER.monthlyPriceUsd)} and 5 users is ${usd(GROWTH.monthlyPriceUsd)}.`,
      },
      {
        title: "Which tools sit on which tier",
        text: "On Jobber, QuickBooks sync starts on Connect, and job costing and two-way texting start on Grow. On Housecall Pro, QuickBooks sync starts on Essentials, and Zapier and the open API are on MAX. Before you compare prices, make sure the plan you're pricing has the tools you need. Altair has one feature set on every plan.",
      },
      {
        title: "Whether anything gets typed twice",
        text: "The customer, the units on site, the estimate, the job and the invoice should be one record, so the office never retypes what the field already entered. In Altair, the approved estimate becomes the scheduled job, and the completed job becomes the invoice.",
      },
      {
        title: "Whether your least tech-savvy technician can use it",
        text: "If the phone view is cluttered, technicians stop updating jobs and the office goes back to calling them. During any free trial, hand a technician a real job and watch how they get on before you decide.",
      },
    ],
  },
  alternatives: {
    heading: "The options in detail",
    items: [
      {
        name: "Altair Operating System",
        highlight: true,
        summary:
          "One connected system for HVAC and field service companies: leads, customers and their equipment, estimates customers approve from their phone, dispatch, a technician phone view, invoices with Stripe payment links, time clock, timesheet approval, expenses and reports. Built by an HVAC company owner.",
        goodFor: `Small and growing shops that want public prices (${monthly(STARTER)} for 1 user, ${monthly(GROWTH)} for 5, ${monthly(PRO)} for 10), one record per job and no contract.`,
        worthKnowing:
          "It's a newer system. It connects to QuickBooks Online but not QuickBooks Desktop, has no built-in phone system, drag-and-drop scheduling, automatic routing or live GPS today, and customer imports bring over contacts and addresses but not equipment or job history.",
      },
      {
        name: "Jobber",
        summary:
          "A long-established field service system with four plans (Core, Connect, Grow and Plus) priced by team size. HVAC is one of the industries it lists.",
        goodFor: "Shops that want tiered plans and optional add-ons: Marketing Suite ($99/mo), Receptionist ($99/mo) and Pipeline ($49/mo).",
        worthKnowing:
          "Core includes 1 user. QuickBooks sync starts on Connect ($139/mo for 1 user), and job costing and two-way texting on Grow. Extra users are $29/mo each, and teams of 16 or more get a custom quote.",
      },
      {
        name: "Housecall Pro",
        summary:
          "Three plans (Basic, Essentials and MAX) for home service companies. It has also announced HVAC, plumbing and electrical packages.",
        goodFor:
          "Residential shops that want job costing and online booking on the entry plan, and are ready to move up for QuickBooks sync, GPS tracking or route optimization.",
        worthKnowing:
          "Basic includes 1 user and Essentials 5. MAX includes 8, and extra users are priced only on MAX ($35/mo each).",
      },
      {
        name: "Workiz",
        summary: "Three plans (Standard, Pro and Ultimate), each listing an integrated phone system, two-way texting and QuickBooks Online sync.",
        goodFor: "Phone-heavy shops. Workiz labels its plans for growing teams, mid-size teams and multi-location companies.",
        worthKnowing:
          "Prices aren't published: every plan says \"Request pricing\". The free trial is 7 days. Its Genius Phone add-on is listed as sold separately, with no price shown.",
      },
      {
        name: "FieldPulse",
        summary: "A seat-based field service system with add-ons such as Operator AI, the Engage phone system and fleet tracking.",
        goodFor: "Contractors who want a quoted, configured setup and a demo first.",
        worthKnowing: "No public prices and no free trial. Seats are bought up front for the contract term.",
      },
      {
        name: "Kickserv",
        summary: "Job management for small service companies, with three plans billed monthly: Start ($75/mo, 5 users), Run ($149/mo, 10 users) and Scale ($249/mo, 20 users). Billed annually, they are $60, $119 and $199 a month.",
        goodFor: "Small shops that want QuickBooks Online included on every plan and a 30-day free trial.",
        worthKnowing: "QuickBooks Desktop is listed from Run, at $50/mo, and isn't on Start. Annual subscriptions aren't pro-rated or refundable.",
      },
    ],
  },
  fit: {
    heading: "Which one should you pick?",
    themTitle: "Jobber or Housecall Pro may be the better fit if:",
    them: [
      "You need QuickBooks Desktop sync, a phone system, route optimization or GPS tracking today. Altair doesn't have those yet.",
      "You want add-ons and integrations, such as Jobber's Marketing Suite or Housecall Pro's Zapier and open API on MAX.",
      "You're already set up on one and it works. Switching has a cost too.",
    ],
    usTitle: "Altair is likely the better fit if:",
    us: [
      "You want one record per job, from first call to paid invoice, without moving up a tier to get there.",
      `You'd rather pay ${usd(GROWTH.monthlyPriceUsd)} for 5 users or ${usd(PRO.monthlyPriceUsd)} for 10 than build a bill out of tiers and add-ons.`,
      "You run HVAC or another field service trade and want software built by an HVAC company owner.",
    ],
  },
  switching: buildSwitchingChecklist("Jobber or Housecall Pro"),
  faq: {
    heading: "Questions about switching from Jobber or Housecall Pro",
    items: [
      {
        question: "Can I import my customers from Jobber or Housecall Pro?",
        answer: `Yes. Export your customer list and upload it in Altair, CSV or Excel. Presets for Jobber and Housecall Pro exports match the columns for you. ${ALTAIR_IMPORT_LIMITS}`,
      },
      {
        question: "Is Altair cheaper than Jobber or Housecall Pro?",
        answer: `On their published monthly prices, yes, at each team size. 1 user is ${usd(STARTER.monthlyPriceUsd)} on Altair, $49 on Jobber Core and $79 on Housecall Pro Basic. 5 users is ${usd(GROWTH.monthlyPriceUsd)} on Altair, ${usd(JOBBER_CONNECT_5_USERS_USD)} on Jobber Connect and ${usd(HOUSECALL_PRO_ESSENTIALS_5_USERS_USD)} on Housecall Pro Essentials. The plans don't include the same features, so compare the tools you'll actually use.`,
      },
      {
        question: "Does Altair connect to QuickBooks?",
        answer:
          "Yes, to QuickBooks Online, on every plan. Customers, price book items, invoices and payments recorded in Altair are sent to your QuickBooks company. QuickBooks Desktop isn't supported yet; if you need it, Jobber, Housecall Pro, Workiz and Kickserv all list a QuickBooks connection, so check which version each one supports.",
      },
      {
        question: "Does Altair work for HVAC specifically?",
        answer:
          "Yes. It was built by an HVAC company owner for HVAC companies first. Each customer record holds the units on site and their service history, and plumbing, electrical and other field service trades run on the same workflow.",
      },
      {
        question: "Do I need a contract?",
        answer: `No. ${TRIAL_DAYS} days free with no card, then monthly or annual billing that you can cancel from Settings at any time.`,
      },
      ...switchingFaq("Jobber or Housecall Pro"),
    ],
  },
  closing: {
    heading: "Test it against your real day",
    text: `Run a real job through Altair for ${TRIAL_DAYS} days, free: estimate, approval, dispatch, invoice and payment. Then compare the bill.`,
  },
  related: [
    { href: "/servicetitan-alternative", label: "Altair vs. ServiceTitan" },
    { href: "/pricing", label: "Altair pricing" },
    { href: VIDEO_PAGE_PATH, label: "How Altair works" },
  ],
  sources: {
    note: `Competitor facts were checked on ${COMPETITOR_FACTS_CHECKED}, on each company's own website. Altair facts come from our pricing page and the product itself.`,
    items: [
      { label: "Jobber pricing", url: "https://www.getjobber.com/pricing/" },
      { label: "Jobber HVAC industry page", url: "https://www.getjobber.com/industries/hvac/" },
      { label: "Housecall Pro pricing", url: "https://www.housecallpro.com/pricing/" },
      {
        label: "Housecall Pro HVAC, plumbing and electrical packages",
        url: "https://www.housecallpro.com/resources/trade-specific-software-hvac-plumbing-electrical/",
      },
      { label: "Workiz pricing plans", url: "https://www.workiz.com/pricing-plans/" },
      { label: "FieldPulse pricing", url: "https://www.fieldpulse.com/pricing" },
      { label: "Kickserv pricing", url: "https://www.kickserv.com/pricing" },
    ],
    trademarks: `Jobber, Housecall Pro, Workiz, FieldPulse and Kickserv are trademarks of their respective owners. ${SHARED_TRADEMARK_NOTE}`,
  },
};

const PAGES: Record<ComparisonPagePath, ComparisonPageContent> = {
  "/servicetitan-alternative": SERVICETITAN,
  "/jobber-housecall-pro-alternatives": JOBBER_HOUSECALL,
};

export function getComparisonPage(path: ComparisonPagePath): ComparisonPageContent {
  return PAGES[path];
}

/** FAQPage JSON-LD built from the same questions the page shows, so the markup never says more than the page. */
export function buildComparisonFaqStructuredData(page: ComparisonPageContent): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

// ====================================================================
// The invoicing page's comparison (/hvac-invoicing-software)
// ====================================================================
const INVOICING_COMPARISON_LABELS = ["1 user", "5 users", "Features by plan", "QuickBooks sync", "Free trial", "Contract"];

/**
 * The rows of the Jobber & Housecall Pro table that matter to someone
 * choosing invoicing software, taken from that table rather than retyped, so
 * the two pages carry the same dated facts and change together.
 */
export const INVOICING_COMPARISON: {
  readonly checkedOn: string;
  readonly columns: readonly string[];
  readonly rows: readonly { readonly label: string; readonly cells: readonly string[] }[];
  readonly footnote: string;
  readonly fullComparisonPath: ComparisonPagePath;
  readonly sources: readonly { readonly label: string; readonly url: string }[];
} = {
  checkedOn: COMPETITOR_FACTS_CHECKED,
  columns: JOBBER_HOUSECALL.table.columns,
  rows: JOBBER_HOUSECALL.table.rows.filter((row) => INVOICING_COMPARISON_LABELS.includes(row.label)),
  footnote: JOBBER_HOUSECALL.table.footnote,
  fullComparisonPath: JOBBER_HOUSECALL.path,
  sources: JOBBER_HOUSECALL.sources.items.filter((item) => /pricing/i.test(item.label) && /Jobber|Housecall/.test(item.label)),
};
