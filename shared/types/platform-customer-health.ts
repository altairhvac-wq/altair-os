export type CompanyActivationStage =
  | "signed_up"
  | "first_customer"
  | "first_job"
  | "first_estimate"
  | "first_invoice"
  | "first_payment"
  | "activated";

export type CompanyHealthStatus = "healthy" | "watch" | "needs_help";

export type CompanyHealthRiskReason = {
  code: string;
  label: string;
  severity: "high" | "medium" | "low";
};

export type CompanyHealthCounts = {
  members: number;
  customers: number;
  jobs: number;
  estimates: number;
  invoices: number;
  payments: number;
  openBugs: number;
  blockingBugs: number;
};

export type CompanyHealthFlags = {
  hasFirstCustomer: boolean;
  hasFirstJob: boolean;
  hasFirstEstimate: boolean;
  hasFirstInvoice: boolean;
  hasFirstPayment: boolean;
  hasStripeConnected: boolean;
  isDemoOnlyUsage: boolean;
  isDormant: boolean;
  isStuck: boolean;
  hasBlockingFeedback: boolean;
};

export type CompanyHealthSummary = {
  companyId: string;
  companyName: string;
  createdAt: string;
  lastActivityAt: string | null;
  lastSignInAt: string | null;
  healthStatus: CompanyHealthStatus;
  healthScore: number;
  activationStage: CompanyActivationStage;
  activationPercent: number;
  riskReasons: CompanyHealthRiskReason[];
  nextBestAction: string;
  actionHref: string;
  counts: CompanyHealthCounts;
  flags: CompanyHealthFlags;
};

export type PlatformCustomerHealthSnapshot = {
  healthyCount: number;
  watchCount: number;
  needsHelpCount: number;
  demoOnlyCount: number;
  companies: CompanyHealthSummary[];
  topNeedsAttention: CompanyHealthSummary[];
};
