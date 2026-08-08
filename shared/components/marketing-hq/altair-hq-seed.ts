// One-click seed values for the founder account's Marketing AI HQ.
// Derived from docs/product/MARKETING_AI_FOUNDATION.md and BRAND_GUIDELINES.
// These only pre-fill the settings forms — nothing is saved until the
// founder reviews and clicks save, per the approval philosophy.

import type {
  MarketingBrandKit,
  MarketingHqConfig,
} from "@/shared/types/marketing-ai-hq";

export const ALTAIR_HQ_CONFIG_SEED: MarketingHqConfig = {
  mission:
    "Altair OS — the operating system for field-service businesses. Built from real experience working in the trades to remove office work so owners can focus on customers, employees, and their families.",
  audience:
    "Owners of small field-service businesses (1-15 techs): HVAC, plumbing, electrical, and other trades. Hardworking, busy, and rightly skeptical of software built by people who never worked a job site.",
  positioning:
    "Not a Silicon Valley startup pretending to understand contractors. One connected system — CRM, scheduling, dispatch, estimates, invoices, payments, reporting, technician management, customer communication, marketing, and AI automation — instead of five disconnected tools. Built by a working HVAC founder.",
  goals:
    "Find founding beta companies. Grow the waitlist. Build in public with honest founder updates. Earn trust before scale.",
  channels: ["facebook", "instagram", "youtube", "x", "seo"],
  weeklyPostTarget: 5,
  industryProfile: {
    industry: "Field-service software, built for the trades",
    focus: "Serves both residential and commercial service businesses",
    businessSize: "Solo founder, bootstrapped",
    location: "United States (sold online)",
    services: [
      "CRM",
      "Scheduling",
      "Dispatch",
      "Estimates",
      "Invoices",
      "Payments",
      "Reporting",
      "Technician management",
      "Customer communication",
      "Marketing",
      "AI automation",
    ],
    idealCustomer:
      "Owner-operators drowning in office work: quoting at the kitchen table at 9pm, juggling a calendar, a spreadsheet, an invoicing app, and a shoebox of receipts. They want their evenings back, not another tool to learn.",
    seasonalityNotes:
      "Trades owners are slammed during summer and winter rushes; software decisions mostly happen in the spring and fall shoulder seasons. Content should respect busy-season attention spans — shorter, more practical.",
    commonObjections: [
      "Already run everything on spreadsheets and paper",
      "Switching costs and data-migration worries",
      "Burned before by expensive software that overpromised",
      "No time to learn a new system",
    ],
    typicalJobValues: "Monthly SaaS subscription (Starter / Growth / Pro tiers)",
    preferredChannels: ["facebook", "instagram", "youtube", "seo"],
    competitorNotes:
      "Jobber, ServiceTitan, Housecall Pro — established players that lean enterprise or solve a single department. Compete on founder authenticity, simplicity, and the one-connected-system philosophy. Never state competitor pricing, features, or reviews as fact.",
  },
};

export const ALTAIR_BRAND_KIT_SEED: MarketingBrandKit = {
  voice:
    "Honest, practical, professional, helpful, experienced, confident, modern. A working HVAC founder talking to other owners — never pushy, fake, overly excited, clickbait, spammy, arrogant, or corporate.",
  style:
    "Short sentences. Plain language. Real examples. No buzzwords, no corporate speak, no unnecessary adjectives. Every sentence has a purpose. Respect the reader's time.",
  bannedClaims: [
    "Specific customer counts, revenue numbers, or growth stats",
    "Competitor pricing or feature specifics",
    "Guarantees, savings percentages, or ROI promises",
  ],
  sampleHooks: [
    "I just shipped another piece of Altair OS…",
    "Small contractors should not need five different tools to run one business.",
    "I run an HVAC company. I built the software I couldn't find.",
    "This week's build removed one more piece of office work.",
  ],
  visualNotes:
    "Brand black (#0A0A0A) with gold gradient accents. Never purple. Real product screenshots over stock art.",
};
