import type { HelpNote } from "@/shared/lib/help/types";

const ADMIN_NAV = "shared/components/admin/nav-items.ts";
const TEAM_TABS = "shared/lib/team/team-hub.ts";
const PROFILE = "shared/components/team/north-star-m12/TeamMemberProfileNorthStarView.tsx";
const TIME_CLOCK = "shared/components/time-clock/TimeClockFoundationView.tsx";
const REPORTS = "shared/components/reports/overview/ReportsOverviewView.tsx";

/** People, their hours and what a technician costs. */
export const TEAM_NOTES: readonly HelpNote[] = [
  {
    slug: "set-a-technicians-cost-rate",
    title: "Set a technician's cost rate",
    summary: "Record what an hour of a technician's time costs the company, so job profit counts labor correctly.",
    area: "team",
    surface: "office",
    requires: ["manageCompany"],
    startHref: "/team",
    startLabel: "Open Team",
    steps: [
      "Open **Team**, then the **Technicians** tab, and click the person's name.",
      "Under **Profitability settings**, enter their **Labor cost rate** for an hour.",
      "Press **Save rate**.",
    ],
    goodToKnow: [
      "This is a cost used to work out job profit. It is not a pay rate and it pays nobody.",
      "Only an owner or admin can change it.",
    ],
    alsoAsked: ["hourly cost", "technician wage", "labor cost", "job profit is wrong"],
    related: ["invite-a-team-member", "change-your-business-numbers"],
    anchors: [
      { file: ADMIN_NAV, text: "Team" },
      { file: TEAM_TABS, text: "Technicians" },
      { file: PROFILE, text: "Profitability settings" },
      { file: PROFILE, text: "Labor cost rate" },
      { file: PROFILE, text: "Save rate" },
    ],
  },
  {
    slug: "see-hours-and-fix-an-open-shift",
    title: "See hours and fix an open shift",
    summary: "Look at everyone's clocked hours, and close a shift when someone forgot to clock out.",
    area: "team",
    surface: "office",
    requires: ["manageCompany", "manageBilling"],
    startHref: "/team",
    startLabel: "Open Team",
    steps: [
      "Open **Team**, then the **Time Clock** tab. **Shift history** lists each shift with its clock in, clock out and length.",
      "On a shift that is still open, press **Review open shift**. After 12 hours it reads **Correct missed clock-out**.",
      "Enter the **Actual clock-out time** and a **Reason for correction**.",
      "Press **Save correction**.",
    ],
    goodToKnow: [
      "Only a shift that is still open can be corrected here.",
      "**Payroll** in the menu lists this month's time entries. It is a list to read from. It does not pay anyone.",
    ],
    alsoAsked: ["timesheet", "forgot to clock out", "edit hours", "payroll hours", "time cards"],
    related: ["clock-in-and-out", "fix-a-missed-clock-out"],
    anchors: [
      { file: ADMIN_NAV, text: "Team" },
      { file: TEAM_TABS, text: "Time Clock" },
      { file: TIME_CLOCK, text: "Shift history" },
      { file: TIME_CLOCK, text: "Review open shift" },
      { file: TIME_CLOCK, text: "Correct missed clock-out" },
      { file: TIME_CLOCK, text: "Actual clock-out time" },
      { file: TIME_CLOCK, text: "Reason for correction" },
      { file: TIME_CLOCK, text: "Save correction" },
      { file: ADMIN_NAV, text: "Payroll" },
    ],
  },
];

/** Money in, money owed and how the month is going. */
export const REPORTS_NOTES: readonly HelpNote[] = [
  {
    slug: "read-your-reports",
    title: "Read your reports",
    summary: "See what you collected, what is still owed, your average ticket and your top services for any period.",
    area: "reports",
    surface: "office",
    requires: ["manageCompany", "manageBilling", "dispatchJobs"],
    startHref: "/reports",
    startLabel: "Open Reports",
    steps: [
      "Open **Reports**.",
      "Pick the period: **7 days**, **30 days**, **90 days** or **This year**.",
      "The top row shows **Collected**, **Average ticket**, **Estimates approved** and **Owed to you, as of today**.",
      "Scroll for **Money collected**, **Money owed**, **Top services** and **Top customers**.",
    ],
    goodToKnow: [
      "**Owed to you, as of today** is always today's figure, whatever period you picked.",
      "**About these numbers** at the bottom of the page says how each figure is worked out.",
    ],
    alsoAsked: ["revenue", "how much did we make", "sales this month", "how is the business doing"],
    related: ["print-a-tax-summary", "see-who-owes-you-money"],
    anchors: [
      { file: ADMIN_NAV, text: "Reports" },
      { file: REPORTS, text: "7 days" },
      { file: REPORTS, text: "30 days" },
      { file: REPORTS, text: "90 days" },
      { file: REPORTS, text: "This year" },
      { file: REPORTS, text: "Collected" },
      { file: REPORTS, text: "Average ticket" },
      { file: REPORTS, text: "Estimates approved" },
      { file: REPORTS, text: "Owed to you, as of today" },
      { file: REPORTS, text: "Money collected" },
      { file: REPORTS, text: "Money owed" },
      { file: REPORTS, text: "Top services" },
      { file: REPORTS, text: "Top customers" },
      { file: REPORTS, text: "About these numbers" },
    ],
  },
  {
    slug: "print-a-tax-summary",
    title: "Print a tax summary",
    summary: "Print the sales tax you collected and your totals for a period, to hand to your accountant.",
    area: "reports",
    surface: "office",
    requires: ["manageCompany", "manageBilling", "dispatchJobs"],
    startHref: "/reports/tax-summary",
    startLabel: "Open the tax summary",
    steps: [
      "Open **Reports** and pick the period you need.",
      "Press **Tax summary**.",
      "Press **Print Summary**, then print it or save it as a PDF from the print window.",
    ],
    alsoAsked: ["sales tax report", "accountant", "taxes", "end of year"],
    related: ["read-your-reports", "ask-for-a-connection"],
    anchors: [
      { file: ADMIN_NAV, text: "Reports" },
      { file: REPORTS, text: "Tax summary" },
      { file: "shared/components/reports/TaxSummaryHeaderActions.tsx", text: "Print Summary" },
    ],
  },
];
