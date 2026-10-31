/**
 * Search landing pages: one per way an owner looks for software, each a
 * static page built from the same template (MarketingLandingPage).
 *
 * ============ ONLY WHAT SHIPS ============
 * Every module line names a route that exists in the office app and a
 * behaviour the code enforces: assignment (app/actions/dispatch.ts),
 * approval links that record a signature and turn the estimate into a job
 * (app/actions/estimate-public-approval.ts), estimate-to-invoice conversion
 * (app/actions/invoices.ts), payment links with Stripe connected. The
 * dispatch board assigns and reassigns; it does not drag, so the page does
 * not say drag. Nothing planned is listed.
 *
 * This file imports nothing from the app, so the middleware can read the
 * path list at the edge.
 */
export type LandingModule = { title: string; text: string };
export type LandingStep = { title: string; text: string };

export type LandingPageConfig = {
  path: string;
  /** Short name for links between the pages and the footer. */
  navLabel: string;
  /** Browser tab and search result title (the product suffix is added). */
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  intro: string;
  modulesHeading: string;
  modules: readonly LandingModule[];
  /** Appears under the module list; the honest scope sentence. */
  modulesNote: string;
  stepsHeading: string;
  steps: readonly LandingStep[];
  closingHeading: string;
  closingText: string;
};

const TRIAL_STEPS_TAIL: readonly LandingStep[] = [
  {
    title: "Choose a plan, or let it end",
    text: "On the last day nothing is charged. Pick a plan and add a card to keep going; otherwise the trial ends and your records stay put.",
  },
];

export const LANDING_PAGES: readonly LandingPageConfig[] = [
  {
    path: "/hvac-software",
    navLabel: "HVAC software",
    title: "HVAC Business Software",
    description:
      "HVAC software for the whole company: leads, customers and equipment, jobs and dispatch, a technician view for the field, estimates customers approve from their phone, invoices with payment links, time clock, expenses, payroll and reports. 14-day free trial, no credit card.",
    eyebrow: "HVAC software",
    headline: "Software for running an HVAC company, from the first call to the paid invoice.",
    intro:
      "Altair keeps the customer, the job, the technician and the money on one record. The office and the field see the same day, and nothing is retyped into a second tool.",
    modulesHeading: "The whole job, in the order it happens.",
    modules: [
      {
        title: "Leads",
        text: "Every call and web inquiry becomes a lead with a next step, so nothing waits in a voicemail.",
      },
      {
        title: "Customers and their equipment",
        text: "One record per customer: contacts, addresses, the units on site, service history, estimates and invoices.",
      },
      {
        title: "Jobs and dispatch",
        text: "Scope the job, put it on the board, assign the technician, and move it when the day changes.",
      },
      {
        title: "A technician view for the field",
        text: "Technicians open the day's jobs on their phone, see the customer and the equipment, and record what they did.",
      },
      {
        title: "Estimates customers approve from their phone",
        text: "Build the estimate, send a link, and get the approval back without chasing. Approved work becomes the scheduled job.",
      },
      {
        title: "Invoices and payment links",
        text: "Completed work becomes the invoice with the job attached. With Stripe connected, customers pay from the link.",
      },
      {
        title: "Time clock, expenses and payroll",
        text: "Hours, receipts and pay periods live next to the jobs they belong to, so the books match the work.",
      },
      {
        title: "Reports",
        text: "Revenue, job activity and team performance from the same records your team works in, not a spreadsheet export.",
      },
    ],
    modulesNote:
      "Built by an HVAC company owner, for HVAC companies first. Plumbing, electrical and other field service trades run on the same workflow.",
    stepsHeading: "days with the whole system. Then decide.",
    steps: [
      { title: "Create your account", text: "Name, company, email, password. No card." },
      { title: "Confirm your email", text: "One link in your inbox opens your workspace." },
      {
        title: "Look around with sample data, or bring a real job",
        text: "Load sample customers and jobs from Settings and clear them in one step, or take one real job from estimate to paid invoice. That is the test that matters.",
      },
      ...TRIAL_STEPS_TAIL,
    ],
    closingHeading: "Run one real job through it this week.",
    closingText:
      "Estimate, approval, dispatch, invoice, payment. If it holds up on a real job, it will hold up on the rest.",
  },
  {
    path: "/hvac-dispatch-software",
    navLabel: "Dispatch software",
    title: "HVAC Dispatch Software",
    description:
      "Dispatch software for HVAC and service companies: one board for the day's jobs, assignment by technician, a map of where the work is, and a phone view for the field that shows the same job the office sees. 14-day free trial, no credit card.",
    eyebrow: "Dispatch software",
    headline: "One board for the day. The field sees the same job the office does.",
    intro:
      "Dispatch in Altair is not a separate tool bolted onto the calendar. The job on the board is the job the technician opens on their phone, the one the estimate came from, and the one the invoice will be made from.",
    modulesHeading: "What a dispatcher gets.",
    modules: [
      {
        title: "The day's board",
        text: "Every scheduled job for the day, who has it, and what is still unassigned, on one screen.",
      },
      {
        title: "Assign and reassign",
        text: "Put a job on a technician, take it off, give it to someone else when the day changes. The technician's phone updates with it.",
      },
      {
        title: "A map of the work",
        text: "Jobs on a map of your service area, so the next call goes to the truck that is already nearby.",
      },
      {
        title: "The schedule",
        text: "A calendar of what is booked for the week ahead, alongside the board for today.",
      },
      {
        title: "The technician's phone",
        text: "Each technician sees only their own jobs for the day, with the customer, the address and the equipment on site.",
      },
      {
        title: "Nothing retyped",
        text: "The customer record, the approved estimate and the invoice are the same record the board shows. Dispatch does not copy anything anywhere.",
      },
    ],
    modulesNote:
      "The board assigns and reassigns by technician. It does not yet route a whole day automatically; a dispatcher still decides who goes where.",
    stepsHeading: "days to run your real board on it.",
    steps: [
      { title: "Create your account", text: "Name, company, email, password. No card." },
      {
        title: "Add your technicians",
        text: "Invite them from Settings. Each one gets the phone view with their own jobs.",
      },
      {
        title: "Put tomorrow on the board",
        text: "Enter tomorrow's jobs, assign them, and run the day from the board. That is the whole test.",
      },
      ...TRIAL_STEPS_TAIL,
    ],
    closingHeading: "Run tomorrow's board on it.",
    closingText:
      "One day of real jobs tells you more than any demo. The trial is free and needs no card.",
  },
  {
    path: "/hvac-estimating-software",
    navLabel: "Estimating software",
    title: "HVAC Estimating Software",
    description:
      "Estimating software for HVAC and service companies: build estimates from your own price book, send a link the customer approves and signs on their phone, and have the approved estimate become the job and then the invoice. 14-day free trial, no credit card.",
    eyebrow: "Estimating software",
    headline: "Send the estimate. The customer approves it on their phone. It becomes the job.",
    intro:
      "The slow part of estimating is not writing the number. It is the days of chasing after you send it. Altair sends a link, records the approval and the signature, and turns the approved estimate into the scheduled job and the invoice.",
    modulesHeading: "From price book to paid.",
    modules: [
      {
        title: "Your price book",
        text: "Your parts, labor and services with your prices, so estimates are built from a list instead of from memory.",
      },
      {
        title: "Estimates built in the office or in the field",
        text: "Write the estimate at the desk, or let the technician build it on site from the job they are standing at.",
      },
      {
        title: "A link the customer approves and signs",
        text: "The customer opens the estimate on their phone, approves it and signs. No account, no app, no printing.",
      },
      {
        title: "Approval on site",
        text: "When the customer is standing next to the technician, they approve and sign on the technician's phone instead.",
      },
      {
        title: "Approved estimate becomes the job",
        text: "The approval creates the job with the estimate attached, ready for the board. Nothing is re-entered.",
      },
      {
        title: "Job becomes the invoice",
        text: "When the work is done, the estimate becomes the invoice, and with Stripe connected the customer pays from a link.",
      },
    ],
    modulesNote:
      "Approval links expire after a set time and are tied to one estimate. There is no good-better-best option builder yet; one estimate carries one set of line items.",
    stepsHeading: "days to send your next real estimate from it.",
    steps: [
      { title: "Create your account", text: "Name, company, email, password. No card." },
      {
        title: "Add the parts and services you quote most",
        text: "Ten price-book items are enough to build your first real estimate.",
      },
      {
        title: "Send one real estimate",
        text: "Send the link to a real customer and watch the approval come back. Then let it become the job.",
      },
      ...TRIAL_STEPS_TAIL,
    ],
    closingHeading: "Send your next estimate from it.",
    closingText:
      "If the approval comes back faster, you have your answer. The trial is free and needs no card.",
  },
  {
    path: "/hvac-invoicing-software",
    navLabel: "Invoicing software",
    title: "HVAC Invoicing Software",
    description:
      "Invoicing software for HVAC and service companies: the finished job becomes the invoice, the customer pays from a link with Stripe connected, payments taken on site are recorded against the invoice, and overdue invoices surface on their own. 14-day free trial, no credit card.",
    eyebrow: "Invoicing and payments",
    headline: "The finished job becomes the invoice. The customer pays from a link.",
    intro:
      "Invoices lag because the office has to rebuild the job from notes before it can bill. In Altair the invoice is made from the job, with the customer, the estimate and the work already on it, so billing is a step, not a project.",
    modulesHeading: "From job done to money in.",
    modules: [
      {
        title: "Invoice from the job",
        text: "When the work is done, the job becomes the invoice with the customer, the address and the job already attached.",
      },
      {
        title: "Invoice from the approved estimate",
        text: "An approved estimate converts straight into its invoice, so the number the customer agreed to is the number they are billed.",
      },
      {
        title: "Send by email, one or many",
        text: "Send an invoice when it is ready, or send the day's batch at once. Resend when a customer asks.",
      },
      {
        title: "A pay-by-link page for the customer",
        text: "With Stripe connected, the customer opens a link and pays by card. No account, no app, no reading numbers over the phone.",
      },
      {
        title: "Payments taken on site",
        text: "Cash, check or card taken at the door is recorded against the invoice, in full or in part, so the balance is always right.",
      },
      {
        title: "Overdue, without a spreadsheet",
        text: "Sent and partly paid invoices turn overdue when their due date passes, and the dashboard shows what is outstanding and what is past due.",
      },
    ],
    modulesNote:
      "Card payments run through your own Stripe account; Altair never stores card numbers. There are no automatic payment-reminder emails yet; the overdue list is the prompt, and the resend is one click.",
    stepsHeading: "days to bill your real jobs from it.",
    steps: [
      { title: "Create your account", text: "Name, company, email, password. No card." },
      {
        title: "Connect Stripe when you want pay-by-link",
        text: "Settings has the Stripe connection. Without it you still invoice and record payments; with it customers pay from the link.",
      },
      {
        title: "Bill one finished job",
        text: "Make the invoice from a real job, send it, and record the payment when it lands. If that took less time than today, you have your answer.",
      },
      ...TRIAL_STEPS_TAIL,
    ],
    closingHeading: "Bill your next finished job from it.",
    closingText:
      "Invoice from the job, link to the customer, payment recorded. The trial is free and needs no card.",
  },
];

export const LANDING_PAGE_PATHS: readonly string[] = LANDING_PAGES.map((page) => page.path);

export function findLandingPage(path: string): LandingPageConfig | undefined {
  return LANDING_PAGES.find((page) => page.path === path);
}
