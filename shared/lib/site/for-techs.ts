import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";

/**
 * The words and pictures on /for-techs.
 *
 * ============ THE SCREENS ============
 * public/marketing/screenshots/technician/ holds three captures of the real
 * technician view, signed in as the sample company's technician (Wasatch
 * Valley Mechanical, a scratch company loaded with sample data; the same
 * company and people the commercial shows). Re-captured 2026-11-25 at
 * 393 x 699 CSS pixels (a current iPhone width) at 3x, saved at 1179 x 2097,
 * because the old 540 x 960 copies looked blurry (owner). Street addresses are
 * removed in the page before each capture.
 * No real customer appears in them. Replace them only with captures of the
 * same sample company.
 *
 * ============ THE WORDS ============
 * Every step and answer describes what the technician view does today:
 * the buttons are named as the product names them
 * (TechnicianJobCommandCenter, StartRouteButton, CompleteJobSheet) and the
 * tabs as TechnicianBottomNav shows them (Home, Schedule, Time, Receipts,
 * Alerts).
 */

export type TechScreen = {
  readonly src: string;
  readonly alt: string;
  readonly title: string;
  readonly caption: string;
};

export const TECH_SCREENS: readonly TechScreen[] = [
  {
    src: "/marketing/screenshots/technician/tech-home.webp",
    alt: "The technician's Home screen on a phone: the next job with the customer, the time and the address, an Open job button, three jobs left today and the time clock showing clocked in since 7:31 AM.",
    title: "Home",
    caption: "Your next job, how many are left today, and whether you are clocked in.",
  },
  {
    src: "/marketing/screenshots/technician/tech-schedule.webp",
    alt: "The technician's Schedule screen on a phone: a week strip with today selected, today's job with the customer, the town and a Start Route button, and the next job below it.",
    title: "Schedule",
    caption: "Today's work and the week ahead. Start Route marks you en route and opens maps.",
  },
  {
    src: "/marketing/screenshots/technician/tech-complete-work.webp",
    alt: "The Complete work sheet on a phone: completion notes describing a furnace tune-up, an optional follow-up recommendation and a Complete work button.",
    title: "Complete work",
    caption: "Say what you did in a few lines. Photos, equipment and a follow-up are optional.",
  },
];

/** "Your day on the phone": the order a technician meets the screens. */
export const TECH_DAY: readonly { readonly time: string; readonly title: string; readonly text: string }[] = [
  {
    time: "Start of day",
    title: "Clock in and see your first job",
    text: "Home shows the next job, how many are left today and your time clock. The Schedule tab has the rest of the day and the week.",
  },
  {
    time: "Leaving",
    title: "Start Route",
    text: "One button marks you en route, so the office knows you are on your way, and opens the address in your maps app.",
  },
  {
    time: "On site",
    title: "Arrive On Site, then Start Work",
    text: "The job shows the next step as one big button. Call the customer, add photos or notes, and log materials and receipts from the quick tools on the job.",
  },
  {
    time: "Done",
    title: "Complete Work",
    text: "Write what you did. Photos, the equipment you worked on and a follow-up recommendation are optional. The office sees the finished job and can invoice it.",
  },
  {
    time: "End of day",
    title: "Receipts and clock out",
    text: "Receipts you added are on the Receipts tab, and the Time tab holds your shift. Your hours sit next to the jobs they belong to.",
  },
];

const TRIAL_DAYS = SAAS_TRIAL_CONFIG.durationDays;

export const TECH_FAQ: readonly { readonly id: string; readonly question: string; readonly answer: string }[] = [
  {
    id: "download",
    question: "Do I have to download an app?",
    answer:
      "No. It runs in your phone's web browser on iPhone and Android. You can add it to your home screen so it opens like an app, and there is nothing to get from an app store.",
  },
  {
    id: "location",
    question: "Does it track where I am?",
    answer:
      "No. The office sees the job addresses on its map, not your location. Start Route opens the address in your own maps app and marks the job as en route.",
  },
  {
    id: "jobs",
    question: "Will I see every job in the company?",
    answer:
      "No. You see your own jobs for the day, with the customer, the address and the equipment on site. The office assigns them from the dispatch board.",
  },
  {
    id: "moved",
    question: "What happens when the office moves my job?",
    answer: "You see the change the next time you open or refresh your jobs.",
  },
  {
    id: "hours",
    question: "How are my hours and receipts kept?",
    answer:
      "You clock in and out on the Time tab and add receipts on the Receipts tab. Shift hours, job hours and receipts are recorded next to the jobs they belong to.",
  },
  {
    id: "cost",
    question: "Do I pay for it?",
    answer: `No. Your company's plan covers it. Each person who signs in, owner, office or technician, counts as one user on that plan. A company can try it free for ${TRIAL_DAYS} days with no credit card.`,
  },
  {
    id: "calculators",
    question: "Are the calculators on this page really free?",
    answer: "Yes. The pay calculator and the callback calculator work in your browser without an account.",
  },
];
