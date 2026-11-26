/**
 * /switch: how to move from another field-service app (or QuickBooks or a
 * spreadsheet) to Altair Operating System, one tab per app (2026-11-26).
 *
 * ============ RULES FOR THIS FILE ============
 * - Every export step comes from that company's own help center and is
 *   linked in `sources`, with the date it was checked. A step we could only
 *   find in another company's migration guide or a forum is NOT printed as a
 *   menu path; the tab says to ask that company's support instead.
 * - Every Altair step is what the product does today: the customer import
 *   (shared/lib/customer-import*.ts), the price book import
 *   (shared/lib/price-book-import.ts) and the unpaid invoice import
 *   (shared/lib/invoice-import.ts), all reading CSV or Excel files
 *   (shared/lib/spreadsheet-file.ts).
 * - The speed line is a measurement: 1,200 customers in 6.5 seconds on
 *   2026-11-26 (scratch database, from a local machine).
 * - Competitor names are plain text; no logos.
 *
 * Pure (no app imports): the page, its FAQ JSON-LD and the verifier read it.
 */

export const SWITCH_FACTS_CHECKED = "November 26, 2026";
export const SWITCH_FACTS_CHECKED_ISO = "2026-11-26";

export type SwitchAppId = "housecall-pro" | "jobber" | "servicetitan" | "service-fusion" | "quickbooks" | "other";

/** What comes over from this app. `yes` green tick, `partial` amber, `no` grey. */
export type SwitchCarryItem = {
  readonly state: "yes" | "partial" | "no";
  readonly title: string;
  readonly text: string;
};

export type SwitchStep = {
  readonly title: string;
  /** Menu path, one chip per item. Omitted when the step has no menu. */
  readonly path?: readonly string[];
  readonly text: string;
  /** A plan, role or "not documented" caveat, shown in amber. */
  readonly caveat?: string;
};

export type SwitchSource = { readonly label: string; readonly href: string };

export type SwitchApp = {
  readonly id: SwitchAppId;
  /** Tab label. */
  readonly name: string;
  /** "from Jobber", used in headings. */
  readonly fromName: string;
  /** Import preset ids in the app (customers / price book / invoices), or null for "Other". */
  readonly presets: { readonly customers: string; readonly priceBook: string; readonly invoices: string };
  readonly video: { readonly src: string; readonly poster: string; readonly caption: string };
  readonly carry: readonly SwitchCarryItem[];
  readonly exportIntro: string;
  readonly exportSteps: readonly SwitchStep[];
  /** What that company's own pages say about leaving, or null. */
  readonly beforeYouLeave: { readonly text: string; readonly source: SwitchSource } | null;
  readonly sources: readonly SwitchSource[];
};

export const SWITCH_PAGE = {
  path: "/switch",
  metaTitle: "Switch to Altair Operating System from Jobber, Housecall Pro or ServiceTitan",
  metaDescription:
    "Step-by-step: export customers, price book and unpaid invoices from Jobber, Housecall Pro, ServiceTitan, Service Fusion or QuickBooks, and import them into Altair.",
  eyebrow: "Switch to Altair Operating System",
  headline: "Switch tonight. Keep your old app until you’re sure.",
  intro:
    "Pick the app you use now. Each tab shows the exact menus to export from it, a short video of that file coming into Altair, and what does and doesn’t come over. Run both side by side through the trial, and cancel the old one when the last old invoice is paid.",
  facts: [
    "CSV or Excel, the file as it comes out of your app",
    "Duplicates caught before anything is saved",
    "1,200 customers imported in under 10 seconds in our test",
  ],
} as const;

const ALTAIR_STEPS_NOTE = "Each import shows you a preview of every row before anything is saved, and skips anything already in Altair, so running the same file twice never makes doubles.";

/** Part 2 is the same for every app; the preset in each link changes. */
export function buildAltairSteps(app: SwitchApp): readonly SwitchStep[] {
  const from = app.id === "other" ? "your file" : `the ${app.name} file`;
  return [
    {
      title: "Customers",
      path: ["Customers", "Import Customers"],
      text: `Pick ${app.id === "other" ? "where the list is from" : app.name} as the source and drop in ${from}. The columns match themselves; check the preview and press Import. A list of thousands goes in one upload.`,
    },
    {
      title: "Price book",
      path: ["Price Book", "Import Price Book"],
      text: "Same steps. Name, description, price, cost, taxable and category come across. An Excel file with services and materials on separate sheets imports one sheet at a time.",
    },
    {
      title: "Unpaid invoices",
      path: ["Sales", "Invoices", "Import Unpaid"],
      text: "Every invoice with money still owed becomes a draft invoice for that balance, on the right customer. Nothing is sent until you open it and send it with its payment link.",
    },
    {
      title: "Your team, then one real job",
      text: "Invite your office and technicians from Settings. Run one job end to end, from estimate to payment, before you cancel the old app.",
    },
  ];
}

export const ALTAIR_STEPS_FOOTNOTE = ALTAIR_STEPS_NOTE;

/* ================================================================ apps */

const COMMON_NOT_CARRIED: SwitchCarryItem = {
  state: "no",
  title: "Past jobs, photos and attachments",
  text: "Altair doesn’t import job history. Keep the jobs export as your record; photos and files stay in the old app.",
};

const JOBBER: SwitchApp = {
  id: "jobber",
  name: "Jobber",
  fromName: "from Jobber",
  presets: { customers: "jobber", priceBook: "jobber", invoices: "jobber" },
  video: {
    src: "/marketing/switch/jobber.mp4",
    poster: "/marketing/switch/jobber-poster.webp",
    caption: "A Jobber client export, price list and invoice report coming into Altair. Sample data.",
  },
  carry: [
    { state: "yes", title: "Clients and their addresses", text: "Phones, emails and notes. Jobber splits a big list into files of 1,500; upload each one." },
    { state: "yes", title: "Products & services", text: "With price, cost, taxable and category." },
    { state: "yes", title: "Unpaid invoices", text: "From the Invoices report: each balance becomes a draft invoice on the right client." },
    COMMON_NOT_CARRIED,
  ],
  exportIntro: "Sign in to Jobber as an admin. Jobber emails each export to you; a short list downloads straight away.",
  exportSteps: [
    {
      title: "Clients",
      path: ["Clients", "More Actions", "Export Clients", "CSV"],
      text: "Includes property addresses, tags and custom fields. Over 1,499 clients arrive as several files.",
      caveat: "Jobber limits client export to admins, on some plans.",
    },
    {
      title: "Products & services",
      path: ["Settings", "Products & Services", "Export to CSV"],
      text: "The export box is near the bottom of the page. Lists of 50 items or more are emailed.",
    },
    {
      title: "Unpaid invoices",
      path: ["Insights", "Reports", "Invoices", "Export to CSV"],
      text: "Set the date range wide enough to reach your oldest unpaid invoice. The report carries the balance, so paid invoices are skipped on import.",
    },
    {
      title: "Jobs, for your records",
      path: ["Insights", "Reports", "One-off jobs", "Export to CSV"],
      text: "Choose all columns. Altair doesn’t import past jobs; keep this file as your history.",
    },
  ],
  beforeYouLeave: {
    text: "Jobber’s own help page says that when a subscription ends you lose access to account data, including clients, jobs and invoices. Export everything first.",
    source: { label: "Jobber: Cancel your Jobber subscription", href: "https://help.getjobber.com/en/articles/cancel-your-jobber-subscription/" },
  },
  sources: [
    { label: "Jobber: Export client information", href: "https://help.getjobber.com/en/articles/export-client-information/" },
    { label: "Jobber: Products & services list", href: "https://help.getjobber.com/en/articles/products-services-list/" },
    { label: "Jobber: Invoices report", href: "https://help.getjobber.com/en/articles/invoices-report/" },
    { label: "Jobber: One-off jobs report", href: "https://help.getjobber.com/en/articles/one-off-jobs-report/" },
  ],
};

const HOUSECALL_PRO: SwitchApp = {
  id: "housecall-pro",
  name: "Housecall Pro",
  fromName: "from Housecall Pro",
  presets: { customers: "housecall_pro", priceBook: "housecall_pro", invoices: "housecall_pro" },
  video: {
    src: "/marketing/switch/housecall-pro.mp4",
    poster: "/marketing/switch/housecall-pro-poster.webp",
    caption: "A Housecall Pro customer export and price book coming into Altair. Sample data.",
  },
  carry: [
    { state: "yes", title: "Customers and their addresses", text: "Phones, emails and notes, whether the file arrives as CSV or Excel." },
    { state: "yes", title: "Price book", text: "Services and materials, with price, cost, taxable and category." },
    {
      state: "partial",
      title: "Unpaid invoices",
      text: "Housecall Pro has no invoice-only export. If your jobs export has an invoice number and an amount due, the invoice import reads it.",
    },
    COMMON_NOT_CARRIED,
  ],
  exportIntro: "Sign in to Housecall Pro as an admin. Each export is emailed to you.",
  exportSteps: [
    {
      title: "Customers",
      path: ["Customers", "Actions", "Export", "Send file"],
      text: "Confirm your email address first. If the file hasn’t arrived within an hour, Housecall Pro’s help page says to contact their support.",
      caveat: "Admin only.",
    },
    {
      title: "Price book",
      path: ["Settings", "Price Book", "Services", "Export"],
      text: "Then do the same on the Materials tab. Each file is emailed.",
    },
    {
      title: "Jobs, with what’s still owed",
      path: ["Jobs", "Actions", "Export", "Send File"],
      text: "Altair reads an invoice number and an amount due from this file when it has them. Keep it as your job history either way.",
      caveat: "Housecall Pro doesn’t publish the columns of this file, so check it has an amount due before you rely on it.",
    },
    {
      title: "Payments, for your records",
      path: ["Reporting", "Reports", "Payments", "Generate report"],
      text: "Two files are emailed, a summary and the details. It can take up to an hour.",
    },
  ],
  beforeYouLeave: null,
  sources: [
    { label: "Housecall Pro: How to import/export jobs and customers", href: "https://help.housecallpro.com/en/articles/6797101-how-to-import-export-jobs-and-customers" },
    { label: "Housecall Pro: Price book import or export", href: "https://help.housecallpro.com/en/articles/7173129-price-book-import-or-export-services-and-materials" },
    { label: "Housecall Pro: Payments export", href: "https://help.housecallpro.com/en/articles/8028448-payments-export" },
  ],
};

const SERVICETITAN: SwitchApp = {
  id: "servicetitan",
  name: "ServiceTitan",
  fromName: "from ServiceTitan",
  presets: { customers: "servicetitan", priceBook: "servicetitan", invoices: "servicetitan" },
  video: {
    src: "/marketing/switch/servicetitan.mp4",
    poster: "/marketing/switch/servicetitan-poster.webp",
    caption: "ServiceTitan Excel exports coming into Altair as they are, no conversion. Sample data.",
  },
  carry: [
    { state: "yes", title: "Customers and their addresses", text: "The Excel file as ServiceTitan saves it. No converting to CSV." },
    { state: "yes", title: "Pricebook", text: "Price, cost, description and category, one sheet at a time." },
    { state: "yes", title: "Unpaid invoices", text: "From an Invoices report: each balance becomes a draft invoice on the right customer." },
    COMMON_NOT_CARRIED,
  ],
  exportIntro: "ServiceTitan saves its exports as Excel files. Altair imports them as they are.",
  exportSteps: [
    {
      title: "Customers",
      path: ["Search", "Customers", "Expand", "Export to Excel"],
      text: "Use the search bar’s dropdown to pick Customers, apply no filters so every customer is listed, then export.",
    },
    {
      title: "Pricebook",
      path: ["Pricebook", "Import/Export", "Export", "Pricebook (Settings, Materials and Part Link)"],
      text: "Leave the business unit empty to get everything, then Export.",
    },
    {
      title: "Unpaid invoices",
      path: ["Reports", "Create Report", "Invoices", "Run Report", "Export as XLSX"],
      text: "Include the invoice number, customer, due date and balance columns.",
      caveat:
        "ServiceTitan’s help says custom reports come with the Works package (or older non-packaged accounts) and need reporting permission. On another package, ask your Customer Success Manager for the file.",
    },
    {
      title: "Jobs, for your records",
      path: ["Reports", "Create Report", "Jobs", "Run Report", "Export as XLSX"],
      text: "Altair doesn’t import past jobs; keep this file as your history. Same report access as above.",
    },
  ],
  beforeYouLeave: {
    text: "ServiceTitan’s cancellation page sends you to your Customer Success Manager and says nothing about your data. Export first, while your login still works.",
    source: { label: "ServiceTitan: Cancel your subscription", href: "https://help.servicetitan.com/docs/cancel-your-servicetitan-subscription-4" },
  },
  sources: [
    { label: "ServiceTitan: Export a list of customers to Excel", href: "https://help.servicetitan.com/docs/what-is-the-process-for-exporting-a-list-of-customers-to-exc" },
    { label: "ServiceTitan: Import or export the pricebook", href: "https://help.servicetitan.com/how-to/import-export-pricebook" },
    { label: "ServiceTitan: Create custom reports", href: "https://help.servicetitan.com/docs/create-custom-reports" },
    { label: "ServiceTitan: Custom report templates", href: "https://help.servicetitan.com/docs/custom-reports" },
  ],
};

const SERVICE_FUSION: SwitchApp = {
  id: "service-fusion",
  name: "Service Fusion",
  fromName: "from Service Fusion",
  presets: { customers: "service_fusion", priceBook: "service_fusion", invoices: "service_fusion" },
  video: {
    src: "/marketing/switch/service-fusion.mp4",
    poster: "/marketing/switch/service-fusion-poster.webp",
    caption: "A Service Fusion customer list and product catalog coming into Altair. Sample data.",
  },
  carry: [
    { state: "yes", title: "Customers and their addresses", text: "From the Customer List report, saved as Excel." },
    {
      state: "partial",
      title: "Product catalog",
      text: "Products come across. Service Fusion doesn’t document an export for its Service Catalog, so add those services in Altair.",
    },
    { state: "yes", title: "Unpaid invoices", text: "From the Invoice report: each balance becomes a draft invoice on the right customer." },
    COMMON_NOT_CARRIED,
  ],
  exportIntro: "Service Fusion’s exports are reports you save as Excel. Altair imports the Excel file as it is.",
  exportSteps: [
    {
      title: "Customers",
      path: ["Reports", "Reports Dashboard", "Customer List", "Custom"],
      text: "Leave the creation dates blank to get every customer, move name, phone, email and address columns across, choose Excel, then Generate Report.",
    },
    {
      title: "Product catalog",
      path: ["My Office", "Product Catalog", "Export"],
      text: "Exports every product, active and inactive.",
    },
    {
      title: "Unpaid invoices",
      path: ["Reports", "Reports Dashboard", "Accounting", "Invoice report (Custom)"],
      text: "Set the date range to cover your oldest unpaid invoice, include the balance column, choose Excel.",
    },
  ],
  beforeYouLeave: null,
  sources: [
    { label: "Service Fusion: Export customer list", href: "https://servicefusion.zendesk.com/hc/en-us/articles/360024040191" },
    { label: "Service Fusion: Product catalog export", href: "https://servicefusion.zendesk.com/hc/en-us/articles/4409646851213" },
    { label: "Service Fusion: Invoice report", href: "https://servicefusion.zendesk.com/hc/en-us/articles/360039285491" },
  ],
};

const QUICKBOOKS: SwitchApp = {
  id: "quickbooks",
  name: "QuickBooks",
  fromName: "from QuickBooks Online",
  presets: { customers: "quickbooks", priceBook: "quickbooks", invoices: "quickbooks" },
  video: {
    src: "/marketing/switch/quickbooks.mp4",
    poster: "/marketing/switch/quickbooks-poster.webp",
    caption: "A QuickBooks customer list and open invoices report coming into Altair. Sample data.",
  },
  carry: [
    { state: "yes", title: "Customers and their addresses", text: "Name, company, phone, email and billing address." },
    { state: "yes", title: "Products & services", text: "Sales price, purchase cost, description and taxable." },
    {
      state: "yes",
      title: "Open invoices",
      text: "From the Open Invoices report. Altair reads its customer-by-customer layout as it is.",
    },
    COMMON_NOT_CARRIED,
  ],
  exportIntro:
    "These are QuickBooks Online menus. Altair doesn’t sync with QuickBooks; this moves your lists over once.",
  exportSteps: [
    {
      title: "Customers",
      path: ["Customer Hub", "Customers & leads", "Export to Excel"],
      text: "The export icon sits next to Print, above the customer list.",
    },
    {
      title: "Products & services",
      path: ["Sales & Get Paid", "Products & services", "More", "Run reports", "Export to Excel"],
      text: "Exports the whole list.",
    },
    {
      title: "Open invoices",
      path: ["Reports", "Who owes you", "Open Invoices", "Export to Excel"],
      text: "Run it as of today so every unpaid invoice is listed.",
      caveat: "This step comes from QuickBooks’ community answers rather than a help article; the newer report view may name things slightly differently.",
    },
  ],
  beforeYouLeave: null,
  sources: [
    { label: "QuickBooks: Export your QuickBooks Online data", href: "https://quickbooks.intuit.com/learn-support/en-us/help-article/list-management/export-reports-lists-data-quickbooks-online/L1xleDrLp_US_en_US" },
    { label: "QuickBooks Community: Report with all unpaid invoices", href: "https://quickbooks.intuit.com/learn-support/en-us/reports-and-accounting/report-with-all-unpaid-invoices-that-shows-a-total/00/1014298" },
  ],
};

const OTHER: SwitchApp = {
  id: "other",
  name: "Another app or a spreadsheet",
  fromName: "from another app or a spreadsheet",
  presets: { customers: "other", priceBook: "other", invoices: "other" },
  video: {
    src: "/marketing/switch/spreadsheet.mp4",
    poster: "/marketing/switch/spreadsheet-poster.webp",
    caption: "A plain spreadsheet coming into Altair, columns matched by name. Sample data.",
  },
  carry: [
    { state: "yes", title: "Customers", text: "Any CSV or Excel list with a name and a phone or email per row." },
    { state: "yes", title: "Price book", text: "Any list with an item name and a price." },
    { state: "yes", title: "Unpaid invoices", text: "Any list with an invoice number, the customer and the amount owed." },
    COMMON_NOT_CARRIED,
  ],
  exportIntro:
    "Altair matches columns by their names, so most exports work as they are. On the matching step you can point any field at any column.",
  exportSteps: [
    {
      title: "FieldEdge, Workiz or another field-service app",
      text: "Their export steps aren’t on a public help page we could check, so we don’t print menus we can’t stand behind. Ask the app’s support for three files: the customer list, the price book, and open invoices with balances. CSV or Excel both work.",
    },
    {
      title: "A spreadsheet or Google Sheets",
      text: "Keep one header row with names like Name, Phone, Email, Address. In Google Sheets, File › Download › Microsoft Excel or CSV.",
    },
    {
      title: "Paper or no list at all",
      text: "Start from the template on the import screen, or add customers one at a time as they call.",
    },
  ],
  beforeYouLeave: null,
  sources: [],
};

export const SWITCH_APPS: readonly SwitchApp[] = [JOBBER, HOUSECALL_PRO, SERVICETITAN, SERVICE_FUSION, QUICKBOOKS, OTHER];

export function getSwitchApp(id: string | null | undefined): SwitchApp | undefined {
  return SWITCH_APPS.find((app) => app.id === id);
}

/* ================================================================ FAQ */

export const SWITCH_FAQ: readonly { readonly id: string; readonly question: string; readonly answer: string }[] = [
  {
    id: "time",
    question: "How long does switching take?",
    answer:
      "Most of it is waiting for your old app to email the export files. The import itself is quick: in our test, 1,200 customers came into Altair in under 10 seconds. The price book and unpaid invoices take a few minutes more, mostly for you to check the previews.",
  },
  {
    id: "emails",
    question: "Will my customers get emails while I import?",
    answer:
      "No. Importing customers and the price book sends nothing. Unpaid invoices come in as drafts, and nothing goes to a customer until you open an invoice and send it.",
  },
  {
    id: "twice",
    question: "What if I import the same file twice?",
    answer:
      "Nothing doubles. Customers that match an existing phone or email are skipped, price book items with a name you already have are skipped, and an old invoice already brought over is skipped.",
  },
  {
    id: "both",
    question: "Can I run Altair and my old app side by side?",
    answer:
      "Yes. The trial is 14 days with no credit card. Import your lists, run real jobs in Altair, collect the old balances, and cancel the old app when you’re sure.",
  },
  {
    id: "not-carried",
    question: "What doesn’t come over?",
    answer:
      "Past jobs, photos, attachments, equipment records, service agreements and recurring plans. Keep your old app’s job export as your history, and add equipment as you visit each site.",
  },
  {
    id: "excel",
    question: "My app exports Excel files. Do I need to convert them?",
    answer:
      "No. Altair reads .xlsx and .csv files as they come out of ServiceTitan, Service Fusion, QuickBooks, Jobber, Housecall Pro or a spreadsheet. Older .xls files need saving as .xlsx first.",
  },
  {
    id: "who",
    question: "Who in my company can run the imports?",
    answer:
      "Customer imports need a role that manages customers. The price book and invoice imports need a billing or admin role. Technicians can’t run them.",
  },
];
